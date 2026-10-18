import type { Metadata } from "next";
import Link from "next/link";
import { and, eq, isNull } from "drizzle-orm";
import { Download } from "lucide-react";
import { db } from "@/db";
import { entitlements } from "@/db/schema";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { bookForKey, createGuestToken } from "@/lib/payments";
export const metadata:Metadata={title:"My eBook Library",robots:{index:false,follow:false}};
export default async function LibraryPage(){const user=await getCurrentUser();if(!user)return <main><AuthForm/></main>;const items=await db.select().from(entitlements).where(and(eq(entitlements.userId,user.id),isNull(entitlements.revokedAt)));return <main><div className="shell dashboard"><aside className="dash-nav"><h2>My Folio</h2><Link href="/account">Overview</Link><Link href="/account/library">My eBook library</Link></aside><section><p className="eyebrow">Yours to keep</p><h1 style={{font:"400 42px Georgia"}}>My eBook library</h1><p>Your download links are freshly signed each time you visit this page.</p>{items.length?<div className="form-card">{items.map(item=>{const book=bookForKey(item.ebookKey);const access=createGuestToken(item.orderId,900);return <div className="summary-row" key={item.id}><span><strong>{book?.title||item.ebookKey}</strong><br/><small>{book?.author}</small></span><a className="btn-primary" href={`/api/download/${item.ebookKey}?order=${item.orderId}&access=${access}`}><Download size={15}/> Download</a></div>})}</div>:<div className="form-card"><h2>No books here yet</h2><p>When you purchase while signed in, every included eBook will appear here.</p><Link className="btn-primary" href="/ebooks">Browse the collection</Link></div>}</section></div></main>}
