import type { Metadata } from "next";
import Link from "next/link";
import Stripe from "stripe";
import { and, eq, isNull } from "drizzle-orm";
import { CheckCircle2, Download } from "lucide-react";
import { db } from "@/db";
import { entitlements, orders } from "@/db/schema";
import { bookForKey, createGuestToken, verifyGuestToken } from "@/lib/payments";
export const metadata:Metadata={title:"Order Complete",robots:{index:false,follow:false}};
export default async function SuccessPage({searchParams}:{searchParams:Promise<{session_id?:string;order?:string;access?:string}>}){const query=await searchParams;let orderId=query.order;let authorized=false;
  if(query.session_id&&process.env.STRIPE_SECRET_KEY){try{const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);const session=await stripe.checkout.sessions.retrieve(query.session_id);if(session.payment_status==="paid"&&session.metadata?.orderId){orderId=session.metadata.orderId;authorized=true}}catch{authorized=false}}
  if(orderId&&query.access)authorized=verifyGuestToken(query.access,orderId);
  const [order]=orderId&&authorized?await db.select().from(orders).where(eq(orders.id,orderId)):[];const access=orderId&&authorized?createGuestToken(orderId):"";const library=order?.status==="paid"?await db.select().from(entitlements).where(and(eq(entitlements.orderId,order.id),isNull(entitlements.revokedAt))):[];
  if(!authorized||!order)return <main className="simple-page"><h1>We couldn’t verify this order</h1><p>For your privacy, this order page requires the secure link from your confirmation email.</p><Link className="btn-primary" href="/contact">Get help</Link></main>;
  if(order.status!=="paid")return <main className="simple-page"><h1>Your payment is processing</h1><p>We’re waiting for secure confirmation from your payment provider. We’ll email your library link as soon as it arrives.</p><Link className="btn-primary" href="/">Return home</Link></main>;
  return <main className="simple-page"><CheckCircle2 size={52} color="#3c7b64"/><p className="eyebrow">Order {order.orderNumber}</p><h1>Your books are ready.</h1><p>Payment confirmed. We’ve also emailed a secure library link to <strong>{order.customerEmail}</strong>.</p><section className="form-card"><h2>Your digital library</h2>{library.map(item=>{const book=bookForKey(item.ebookKey);return <div className="summary-row" key={item.id}><span><strong>{book?.title||item.ebookKey}</strong><br/><small>PDF · EPUB where available</small></span><a className="btn-primary" href={`/api/download/${item.ebookKey}?order=${order.id}&access=${access}`}><Download size={15}/> Download</a></div>})}</section><p><Link href="/account/library">Create an account</Link> to keep your whole library in one place.</p></main>}
