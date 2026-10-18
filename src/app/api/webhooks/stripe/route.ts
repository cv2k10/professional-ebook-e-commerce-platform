import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { fulfillOrder, revokeOrder } from "@/lib/payments";
export const dynamic="force-dynamic";
export async function POST(request:Request){
  if(!process.env.STRIPE_SECRET_KEY||!process.env.STRIPE_WEBHOOK_SECRET)return new Response("Stripe is not configured",{status:503});
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);const signature=request.headers.get("stripe-signature");if(!signature)return new Response("Missing signature",{status:400});
  let event:Stripe.Event;try{event=stripe.webhooks.constructEvent(await request.text(),signature,process.env.STRIPE_WEBHOOK_SECRET)}catch{return new Response("Invalid signature",{status:400})}
  try{
    if(event.type==="checkout.session.completed"||event.type==="checkout.session.async_payment_succeeded"){const session=event.data.object as Stripe.Checkout.Session;if(session.payment_status==="paid"&&session.metadata?.orderId)await fulfillOrder(session.metadata.orderId,session.id,"stripe",event.id);}
    if(event.type==="charge.refunded"||event.type==="charge.dispute.created"){const charge=event.data.object as Stripe.Charge;const sessionList=await stripe.checkout.sessions.list({payment_intent:typeof charge.payment_intent==="string"?charge.payment_intent:charge.payment_intent?.id,limit:1});const session=sessionList.data[0];if(session?.metadata?.orderId)await revokeOrder(session.metadata.orderId,event.type==="charge.refunded"?"refunded":"disputed");}
    return Response.json({received:true});
  }catch(error){console.error("stripe webhook",error);return new Response("Webhook processing failed",{status:500})}
}
