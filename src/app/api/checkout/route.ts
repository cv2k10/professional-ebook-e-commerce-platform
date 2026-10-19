import { z } from "zod";
import Stripe from "stripe";
import { db } from "@/db";
import { orderItems, orders, payments } from "@/db/schema";
import { getCatalogItem } from "@/lib/catalog";
import { createAccessToken, hashToken, makeOrderNumber } from "@/lib/payments";
import { getCurrentUser } from "@/lib/auth";

const schema=z.object({email:z.string().email().max(254),provider:z.enum(["stripe","paypal"]),itemIds:z.array(z.string()).min(1).max(20)});
export async function POST(request:Request){
  try{
    const input=schema.parse(await request.json());const unique=[...new Set(input.itemIds)];const items=unique.map(getCatalogItem);
    if(items.some(item=>!item))return Response.json({error:"One or more items are unavailable."},{status:400});
    const valid=items.filter(Boolean) as NonNullable<ReturnType<typeof getCatalogItem>>[];const totalCents=valid.reduce((sum,item)=>sum+Math.round(item.price*100),0);const token=createAccessToken();
    const user=await getCurrentUser();
    const orderId=crypto.randomUUID();
    const [[order]]=await db.batch([db.insert(orders).values({id:orderId,orderNumber:makeOrderNumber(),userId:user?.id,customerEmail:input.email.toLowerCase(),subtotalCents:totalCents,totalCents,accessTokenHash:hashToken(token)}).returning(),db.insert(orderItems).values(valid.map(item=>({orderId,itemType:item.type,catalogKey:item.id,titleSnapshot:item.title,unitPriceCents:Math.round(item.price*100)})))]);
    const origin=process.env.NEXT_PUBLIC_SITE_URL||new URL(request.url).origin;
    if(input.provider==="stripe"){
      if(!process.env.STRIPE_SECRET_KEY)return Response.json({error:"Stripe test credentials are not configured. Add STRIPE_SECRET_KEY to activate card checkout."},{status:503});
      const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
      const session=await stripe.checkout.sessions.create({mode:"payment",customer_email:input.email,line_items:valid.map(item=>({quantity:1,price_data:{currency:"usd",unit_amount:Math.round(item.price*100),product_data:{name:item.title,description:item.type==="bundle"?"Folio curated eBook collection":"Folio digital eBook"}}})),metadata:{orderId:order.id},success_url:`${origin}/success?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/checkout?cancelled=1`});
      await db.insert(payments).values({orderId:order.id,provider:"stripe",providerReference:session.id,status:"pending",amountCents:totalCents});
      return Response.json({url:session.url});
    }
    if(!process.env.PAYPAL_CLIENT_ID||!process.env.PAYPAL_CLIENT_SECRET)return Response.json({error:"PayPal sandbox credentials are not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to activate PayPal."},{status:503});
    const base=process.env.PAYPAL_API_BASE||"https://api-m.sandbox.paypal.com";
    const auth=Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
    const authResponse=await fetch(`${base}/v1/oauth2/token`,{method:"POST",headers:{Authorization:`Basic ${auth}`,"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials",cache:"no-store"});
    if(!authResponse.ok)throw new Error("PayPal authentication failed");const {access_token}=await authResponse.json() as {access_token:string};
    const paypalResponse=await fetch(`${base}/v2/checkout/orders`,{method:"POST",headers:{Authorization:`Bearer ${access_token}`,"Content-Type":"application/json","PayPal-Request-Id":order.id},body:JSON.stringify({intent:"CAPTURE",purchase_units:[{reference_id:order.id,custom_id:order.id,amount:{currency_code:"USD",value:(totalCents/100).toFixed(2)}}],payment_source:{paypal:{experience_context:{brand_name:"Folio Digital Bookshop",user_action:"PAY_NOW",return_url:`${origin}/api/paypal/capture?localOrder=${order.id}`,cancel_url:`${origin}/checkout?cancelled=1`}}}}),cache:"no-store"});
    if(!paypalResponse.ok)throw new Error("PayPal order creation failed");const paypalOrder=await paypalResponse.json() as {id:string;links?:{rel:string;href:string}[]};
    await db.insert(payments).values({orderId:order.id,provider:"paypal",providerReference:paypalOrder.id,status:"pending",amountCents:totalCents});
    const approve=paypalOrder.links?.find((link:{rel:string;href:string})=>link.rel==="payer-action"||link.rel==="approve");return Response.json({url:approve?.href});
  }catch(error){if(error instanceof z.ZodError)return Response.json({error:"Please provide a valid email and cart."},{status:400});console.error("checkout",error);return Response.json({error:"Secure checkout is temporarily unavailable."},{status:500});}
}
