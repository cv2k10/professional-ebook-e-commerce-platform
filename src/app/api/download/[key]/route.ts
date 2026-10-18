import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { downloadLogs, entitlements, orders } from "@/db/schema";
import { verifyGuestToken } from "@/lib/payments";
import { books } from "@/lib/catalog";
export const dynamic="force-dynamic";
const globalRate=globalThis as typeof globalThis&{__downloadRate?:Map<string,{count:number;reset:number}>};const rates=globalRate.__downloadRate||new Map();globalRate.__downloadRate=rates;
export async function GET(request:Request,{params}:{params:Promise<{key:string}>}){const {key}=await params;const url=new URL(request.url);const orderId=url.searchParams.get("order")||"";const access=url.searchParams.get("access")||"";if(!verifyGuestToken(access,orderId))return new Response("Unauthorized",{status:401});
  const now=Date.now();const rate=rates.get(orderId);if(rate&&rate.reset>now&&rate.count>=10)return new Response("Download limit reached. Try again shortly.",{status:429,headers:{"Retry-After":"900"}});rates.set(orderId,{count:rate&&rate.reset>now?rate.count+1:1,reset:rate&&rate.reset>now?rate.reset:now+900_000});
  const [order]=await db.select().from(orders).where(and(eq(orders.id,orderId),eq(orders.status,"paid")));const [entitlement]=await db.select().from(entitlements).where(and(eq(entitlements.orderId,orderId),eq(entitlements.ebookKey,key),isNull(entitlements.revokedAt)));if(!order||!entitlement)return new Response("This order does not include that book.",{status:403});
  const book=books.find(b=>b.id===key);if(!book)return new Response("Book not found",{status:404});const root=path.resolve(process.env.PRIVATE_EBOOK_DIR||path.join(process.cwd(),"private-ebooks"));const filename=`${key}.pdf`;const filePath=path.resolve(root,filename);if(!filePath.startsWith(`${root}${path.sep}`))return new Response("Invalid path",{status:400});
  try{const info=await stat(filePath);if(!info.isFile())throw new Error();const file=await readFile(filePath);return new Response(new Uint8Array(file),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${book.slug}.pdf"`,"Content-Length":String(file.length),"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}})}catch{return new Response("The file is being prepared. Please contact support with your order number.",{status:404})}
}
