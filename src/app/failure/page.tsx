import type { Metadata } from "next";
import Link from "next/link";
import { XCircle } from "lucide-react";
export const metadata:Metadata={title:"Payment Not Completed",robots:{index:false,follow:false}};
export default function FailurePage(){return <main className="simple-page"><XCircle size={52} color="#a74f3a"/><p className="eyebrow">Payment not completed</p><h1>Your order wasn’t charged.</h1><p>Nothing has been added to your library. You can return to checkout and try again, or choose another secure payment option.</p><div className="hero-actions"><Link className="btn-primary" href="/checkout">Return to checkout</Link><Link className="btn-secondary" href="/contact">Get help</Link></div></main>}
