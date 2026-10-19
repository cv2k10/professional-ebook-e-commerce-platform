"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { BookOpen, LockKeyhole, ShoppingBag, Trash2 } from "lucide-react";
import { BookCover, useCart } from "./store-client";
import { books, bundles, getCatalogItem, money } from "@/lib/catalog";

export function CartView() {
  const { items, remove, total } = useCart();
  if (!items.length) return <div className="empty-state"><ShoppingBag/><h2>Your cart is ready for a good idea</h2><p>Explore our shelves and choose something worth keeping.</p><Link className="btn-primary" href="/ebooks">Browse eBooks</Link></div>;
  return <div className="cart-layout"><div>{items.map((id) => { const item=getCatalogItem(id); const book=books.find(b=>b.id===id); if(!item)return null; return <article className="cart-item" key={id}>{book?<BookCover book={book}/>:<div className="book-cover theme-sage"><BookOpen/></div>}<div><p className="eyebrow">{item.type === "bundle" ? "Curated collection" : "Digital eBook"}</p><h3>{item.title}</h3><small>{item.type === "ebook" ? `by ${book?.author} · ${book?.formats.join(", ")}` : `${bundles.find(b=>b.id===id)?.bookIds.length} complete eBooks`}</small><br/><button className="link-button" onClick={()=>remove(id)}><Trash2 size={12}/> Remove</button></div><strong>{money(item.price)}</strong></article>})}</div><OrderSummary items={items} total={total}/></div>;
}
function OrderSummary({items,total,checkout=true}:{items:string[];total:number;checkout?:boolean}){return <aside className="summary-box"><h2>Order summary</h2>{items.map(id=>{const item=getCatalogItem(id);return item?<div className="summary-row" key={id}><span>{item.title}</span><strong>{money(item.price)}</strong></div>:null})}<div className="summary-row"><span>Digital delivery</span><strong>Free</strong></div><div className="summary-row summary-total"><strong>Total</strong><strong>{money(total)}</strong></div>{checkout&&<Link className="btn-primary" href="/checkout">Secure checkout →</Link>}<p className="legal-note"><LockKeyhole size={10}/> Secure checkout · Instant digital delivery</p></aside>}

export function CheckoutView(){
  const cart=useCart(); const search=useSearchParams(); const buy=search.get("buy");
  const items=useMemo(()=>buy&&getCatalogItem(buy)?[buy]:cart.items,[buy,cart.items]);
  const total=items.reduce((sum,id)=>sum+(getCatalogItem(id)?.price||0),0);
  const [email,setEmail]=useState(""); const [provider,setProvider]=useState("stripe"); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  async function pay(){setLoading(true);setError("");try{const response=await fetch("/api/checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,provider,itemIds:items})});const data=await response.json() as {url?:string;error?:string};if(!response.ok)throw new Error(data.error||"Checkout could not be started.");if(data.url)window.location.href=data.url;}catch(e){setError(e instanceof Error?e.message:"Something went wrong.");setLoading(false)}}
  if(!items.length)return <div className="empty-state"><ShoppingBag/><h2>Your cart is empty</h2><Link className="btn-primary" href="/ebooks">Choose an eBook</Link></div>;
  return <div className="checkout-grid"><div><section className="form-card"><p className="eyebrow">Step 1 of 2</p><h2>Where should we send your books?</h2><div className="field"><label htmlFor="checkout-email">Email address</label><input id="checkout-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="reader@example.com"/></div><small>We’ll send your receipt and secure library link here. No shipping details needed.</small></section><section className="form-card"><p className="eyebrow">Step 2 of 2</p><h2>Choose a secure payment</h2><div className="payment-options"><label className="payment-option"><input type="radio" checked={provider==="stripe"} onChange={()=>setProvider("stripe")}/> Credit or debit card <span style={{marginLeft:"auto"}}>VISA · MC · AMEX</span></label><label className="payment-option"><input type="radio" checked={provider==="paypal"} onChange={()=>setProvider("paypal")}/> PayPal <strong style={{marginLeft:"auto",color:"#1769aa"}}>PayPal</strong></label></div>{error&&<div className="checkout-error" role="alert">{error}</div>}<button className="btn-primary" style={{width:"100%",marginTop:20}} disabled={loading||!email.includes("@")||!items.length} onClick={pay}>{loading?"Opening secure payment…":`Pay ${money(total)} securely`}</button><p className="legal-note">Your access is granted only after the payment provider securely confirms payment.</p></section></div><OrderSummary items={items} total={total} checkout={false}/></div>;
}
