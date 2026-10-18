import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { money } from "@/lib/catalog";
import { AuthForm, LogoutButton } from "@/components/auth-form";
export const metadata:Metadata={title:"My Account",robots:{index:false,follow:false}};
export default async function AccountPage(){const user=await getCurrentUser();if(!user)return <main><AuthForm/></main>;const history=await db.select().from(orders).where(eq(orders.userId,user.id)).orderBy(desc(orders.createdAt));return <main><div className="shell dashboard"><aside className="dash-nav"><h2>My Folio</h2><Link href="/account">Overview</Link><Link href="/account/library">My eBook library</Link><Link href="/account">Order history</Link><LogoutButton/></aside><section><p className="eyebrow">Reader dashboard</p><h1 style={{font:"400 42px Georgia"}}>Hello, {user.firstName||"reader"}.</h1><div className="metric-grid"><div className="metric"><small>Books in library</small><strong>{history.filter(o=>o.status==="paid").length}</strong></div><div className="metric"><small>Total orders</small><strong>{history.length}</strong></div></div><h2 style={{font:"500 25px Georgia",marginTop:35}}>Recent orders</h2>{history.length?<table className="admin-table"><thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Total</th></tr></thead><tbody>{history.map(order=><tr key={order.id}><td>{order.orderNumber}</td><td>{order.createdAt.toLocaleDateString()}</td><td><span className="status">{order.status}</span></td><td>{money(order.totalCents/100)}</td></tr>)}</tbody></table>:<div className="form-card"><p>Your shelves are waiting. Purchases made while signed in will appear here.</p><Link className="btn-primary" href="/ebooks">Find your first read</Link></div>}</section></div></main>}
