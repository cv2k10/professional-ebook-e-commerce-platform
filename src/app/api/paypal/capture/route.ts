import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { createGuestToken, fulfillOrder } from "@/lib/payments";
export async function GET(request:Request){
  const url=new URL(request.url);const paypalId=url.searchParams.get("token");const localOrder=url.searchParams.get("localOrder");const origin=process.env.NEXT_PUBLIC_SITE_URL||url.origin;
  if(!paypalId||!localOrder||!process.env.PAYPAL_CLIENT_ID||!process.env.PAYPAL_CLIENT_SECRET)return Response.redirect(`${origin}/failure?reason=paypal`);
  try{const [payment]=await db.select().from(payments).where(eq(payments.providerReference,paypalId));if(!payment||payment.orderId!==localOrder)return Response.redirect(`${origin}/failure?reason=invalid`);
    const base=process.env.PAYPAL_API_BASE||"https://api-m.sandbox.paypal.com";const auth=Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");const authRes=await fetch(`${base}/v1/oauth2/token`,{method:"POST",headers:{Authorization:`Basic ${auth}`,"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials",cache:"no-store"});const {access_token}=await authRes.json() as {access_token:string};
    const capture=await fetch(`${base}/v2/checkout/orders/${paypalId}/capture`,{method:"POST",headers:{Authorization:`Bearer ${access_token}`,"Content-Type":"application/json","PayPal-Request-Id":`capture-${localOrder}`},cache:"no-store"});const result=await capture.json() as {status?:string};if(!capture.ok||result.status!=="COMPLETED")return Response.redirect(`${origin}/failure?reason=pending`);await fulfillOrder(localOrder,paypalId,"paypal");const access=createGuestToken(localOrder);return Response.redirect(`${origin}/success?order=${localOrder}&access=${access}`);
  }catch(error){console.error("paypal capture",error);return Response.redirect(`${origin}/failure?reason=paypal`)}
}
