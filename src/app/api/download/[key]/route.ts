import { env } from "cloudflare:workers";
import { and, count, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { downloadLogs, entitlements, orders } from "@/db/schema";
import { hashToken, verifyGuestToken } from "@/lib/payments";
import { books } from "@/lib/catalog";
export const dynamic="force-dynamic";
// Durable across Worker isolates: counts logged downloads per order in D1 (10 per 15 minutes).
const RATE_LIMIT=10;const RATE_WINDOW_MS=900_000;
export async function GET(request:Request,{params}:{params:Promise<{key:string}>}){const {key}=await params;const url=new URL(request.url);const orderId=url.searchParams.get("order")||"";const access=url.searchParams.get("access")||"";if(!verifyGuestToken(access,orderId))return new Response("Unauthorized",{status:401});
  const [order]=await db.select().from(orders).where(and(eq(orders.id,orderId),eq(orders.status,"paid")));const [entitlement]=await db.select().from(entitlements).where(and(eq(entitlements.orderId,orderId),eq(entitlements.ebookKey,key),isNull(entitlements.revokedAt)));if(!order||!entitlement)return new Response("This order does not include that book.",{status:403});
  const [recent]=await db.select({n:count()}).from(downloadLogs).where(and(eq(downloadLogs.orderId,orderId),gt(downloadLogs.createdAt,new Date(Date.now()-RATE_WINDOW_MS))));if(recent.n>=RATE_LIMIT)return new Response("Download limit reached. Try again shortly.",{status:429,headers:{"Retry-After":"900"}});
  const book=books.find(b=>b.id===key);if(!book)return new Response("Book not found",{status:404});
  // Private R2 bucket; objects are keyed by the stable catalog key, e.g. book-deep-work.pdf
  const object=await env.EBOOKS.get(`${key}.pdf`);if(!object)return new Response("The file is being prepared. Please contact support with your order number.",{status:404});
  const ip=request.headers.get("cf-connecting-ip");await db.insert(downloadLogs).values({entitlementId:entitlement.id,orderId,ebookKey:key,ipHash:ip?hashToken(ip):null,userAgent:request.headers.get("user-agent")?.slice(0,300)||null});
  return new Response(object.body,{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${book.slug}.pdf"`,"Content-Length":String(object.size),"ETag":object.httpEtag,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
