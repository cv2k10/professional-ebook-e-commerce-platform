import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { fulfillOrder, revokeOrder } from "@/lib/payments";
export async function POST(request:Request){
  if(!process.env.PAYPAL_CLIENT_ID||!process.env.PAYPAL_CLIENT_SECRET||!process.env.PAYPAL_WEBHOOK_ID)return new Response("PayPal is not configured",{status:503});
  try{const event=await request.json();const base=process.env.PAYPAL_API_BASE||"https://api-m.sandbox.paypal.com";const auth=Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");const authRes=await fetch(`${base}/v1/oauth2/token`,{method:"POST",headers:{Authorization:`Basic ${auth}`,"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials",cache:"no-store"});const {access_token}=await authRes.json();
    const verify=await fetch(`${base}/v1/notifications/verify-webhook-signature`,{method:"POST",headers:{Authorization:`Bearer ${access_token}`,"Content-Type":"application/json"},body:JSON.stringify({auth_algo:request.headers.get("paypal-auth-algo"),cert_url:request.headers.get("paypal-cert-url"),transmission_id:request.headers.get("paypal-transmission-id"),transmission_sig:request.headers.get("paypal-transmission-sig"),transmission_time:request.headers.get("paypal-transmission-time"),webhook_id:process.env.PAYPAL_WEBHOOK_ID,webhook_event:event}),cache:"no-store"});const verification=await verify.json();if(verification.verification_status!=="SUCCESS")return new Response("Invalid signature",{status:400});
    const paypalOrderId=event.resource?.supplementary_data?.related_ids?.order_id||event.resource?.id;const [payment]=paypalOrderId?(await db.select().from(payments).where(eq(payments.providerReference,paypalOrderId))):[];
    if(payment&&event.event_type==="PAYMENT.CAPTURE.COMPLETED")await fulfillOrder(payment.orderId,payment.providerReference,"paypal",event.id);
    if(payment&&["PAYMENT.CAPTURE.REFUNDED","CUSTOMER.DISPUTE.CREATED"].includes(event.event_type))await revokeOrder(payment.orderId,event.event_type.includes("REFUNDED")?"refunded":"disputed");
    return Response.json({received:true});
  }catch(error){console.error("paypal webhook",error);return new Response("Webhook processing failed",{status:500})}
}
