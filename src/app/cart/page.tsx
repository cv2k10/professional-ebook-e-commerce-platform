import type { Metadata } from "next";
import { CartView } from "@/components/cart-checkout";
import { Breadcrumbs } from "@/components/store-ui";
export const metadata:Metadata={title:"Your Cart",robots:{index:false,follow:false}};
export default function CartPage(){return <main><Breadcrumbs items={[{label:"Cart"}]}/><section className="section"><div className="shell"><div className="section-head"><div><p className="eyebrow">Your reading list</p><h2>Shopping cart</h2></div></div><CartView/></div></section></main>}
