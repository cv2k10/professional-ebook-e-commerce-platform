import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutView } from "@/components/cart-checkout";
import { Breadcrumbs } from "@/components/store-ui";
export const metadata:Metadata={title:"Secure Checkout",robots:{index:false,follow:false}};
export default function CheckoutPage(){return <main><Breadcrumbs items={[{label:"Cart",href:"/cart"},{label:"Checkout"}]}/><section className="section"><div className="shell"><div className="section-head"><div><p className="eyebrow">Secure checkout</p><h2>Complete your order</h2></div></div><Suspense fallback={<p>Preparing checkout…</p>}><CheckoutView/></Suspense></div></section></main>}
