import crypto from "node:crypto";
import { waitUntil } from "cloudflare:workers";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { bundles, books } from "@/lib/catalog";
import { entitlements, orderItems, orders, payments } from "@/db/schema";
import { Resend } from "resend";

export function hashToken(value:string){return crypto.createHash("sha256").update(value).digest("hex")}
export function createAccessToken(){return crypto.randomBytes(32).toString("base64url")}
export function createGuestToken(orderId:string,expiresInSeconds=86400*7){const exp=Math.floor(Date.now()/1000)+expiresInSeconds;const payload=`${orderId}.${exp}`;const secret=process.env.DOWNLOAD_TOKEN_SECRET||process.env.STRIPE_SECRET_KEY||"development-only-change-me";const signature=crypto.createHmac("sha256",secret).update(payload).digest("base64url");return `${payload}.${signature}`}
export function verifyGuestToken(token:string,orderId:string){const [id,exp,signature]=token.split(".");if(id!==orderId||!exp||Number(exp)<Date.now()/1000||!signature)return false;const secret=process.env.DOWNLOAD_TOKEN_SECRET||process.env.STRIPE_SECRET_KEY||"development-only-change-me";const expected=crypto.createHmac("sha256",secret).update(`${id}.${exp}`).digest("base64url");return signature.length===expected.length&&crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected))}
export function makeOrderNumber(){return `FL-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`}

// Orders that may still become paid. Refunded/disputed orders are never re-opened by a late webhook.
const claimableStatuses=["pending","failed","cancelled"] as const;

// D1 has no interactive transactions or row locks, so fulfillment is one atomic batch:
// the payment upsert and entitlement inserts are idempotent (unique indexes), and the
// conditional status update decides which concurrent caller "won" and sends the email.
export async function fulfillOrder(orderId:string, providerRef:string, provider:"stripe"|"paypal", eventId?:string){
  const [order]=await db.select().from(orders).where(eq(orders.id,orderId));
  if(!order)throw new Error("Order not found");
  if(!(claimableStatuses as readonly string[]).includes(order.status))return {order,alreadyPaid:true};
  const lines=await db.select().from(orderItems).where(eq(orderItems.orderId,orderId));
  const keys=new Set<string>();
  for(const line of lines){if(line.itemType==="ebook")keys.add(line.catalogKey);else{const bundle=bundles.find(b=>b.id===line.catalogKey);bundle?.bookIds.forEach(id=>keys.add(id));}}
  const now=new Date();
  const [claimed]=await db.batch([
    db.update(orders).set({status:"paid",paidAt:now,updatedAt:now}).where(and(eq(orders.id,orderId),inArray(orders.status,claimableStatuses))).returning({id:orders.id}),
    db.insert(payments).values({orderId,provider,providerReference:providerRef,status:"succeeded",amountCents:order.totalCents,rawEventId:eventId}).onConflictDoUpdate({target:[payments.provider,payments.providerReference],set:{status:"succeeded",rawEventId:eventId,updatedAt:now}}),
    ...(keys.size?[db.insert(entitlements).values([...keys].map(ebookKey=>({orderId,userId:order.userId,customerEmail:order.customerEmail,ebookKey}))).onConflictDoNothing()]:[]),
  ]);
  const paidOrder={...order,status:"paid" as const,paidAt:now};
  if(!claimed.length)return {order:paidOrder,alreadyPaid:true};
  // Workers cancel un-awaited work after the response; waitUntil keeps the email send alive.
  waitUntil(sendOrderEmail(order.customerEmail,order.orderNumber,orderId).catch(error=>console.error("order email",error)));
  return {order:paidOrder,alreadyPaid:false};
}

export async function revokeOrder(orderId:string,status:"refunded"|"disputed"){
  const now=new Date();
  await db.batch([db.update(orders).set({status,updatedAt:now}).where(eq(orders.id,orderId)),db.update(entitlements).set({revokedAt:now}).where(and(eq(entitlements.orderId,orderId),isNull(entitlements.revokedAt)))]);
}
async function sendOrderEmail(email:string,orderNumber:string,orderId:string){
  if(!process.env.RESEND_API_KEY)return;
  const resend=new Resend(process.env.RESEND_API_KEY);const site=process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000";
  const token=createGuestToken(orderId);
  await resend.emails.send({from:process.env.EMAIL_FROM||"Folio <orders@example.com>",to:email,subject:`Your Folio books are ready — ${orderNumber}`,html:`<div style="font-family:Arial;padding:32px;color:#173f36"><h1 style="font-family:Georgia">Your books are ready.</h1><p>Thank you for your order ${orderNumber}. Your payment is confirmed and your private library is waiting.</p><p><a href="${site}/success?order=${orderId}&access=${token}" style="background:#173f36;color:white;padding:12px 20px;text-decoration:none">Open my library</a></p><p>This secure link expires in 7 days. You can request a fresh link at any time.</p></div>`});
}
export function itemEntitlementKeys(key:string){const bundle=bundles.find(b=>b.id===key);return bundle?bundle.bookIds:[key]}
export function bookForKey(key:string){return books.find(b=>b.id===key)}
