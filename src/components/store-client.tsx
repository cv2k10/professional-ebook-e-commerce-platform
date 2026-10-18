"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { BookOpen, Check, ChevronDown, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { books, bundles, getCatalogItem, money, type Book } from "@/lib/catalog";

type CartContextType = {
  items: string[];
  add: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
  total: number;
};
const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem("folio-cart") || "[]")); } catch { setItems([]); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem("folio-cart", JSON.stringify(items)); }, [items, ready]);
  const value = useMemo(() => ({
    items,
    add: (id: string) => setItems((old) => old.includes(id) ? old : [...old, id]),
    remove: (id: string) => setItems((old) => old.filter((item) => item !== id)),
    clear: () => setItems([]),
    count: items.length,
    total: items.reduce((sum, id) => sum + (getCatalogItem(id)?.price || 0), 0),
  }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}

export function AddToCartButton({ id, label = "Add to cart", className = "" }: { id: string; label?: string; className?: string }) {
  const { add, items } = useCart();
  const added = items.includes(id);
  return <button onClick={() => add(id)} className={`btn-primary ${className}`} aria-label={`${label}: ${getCatalogItem(id)?.title || "item"}`}>{added ? <><Check size={16}/> Added</> : <>{label} <span aria-hidden>→</span></>}</button>;
}

export function BookCover({ book, compact = false }: { book: Book; compact?: boolean }) {
  return <div className={`book-cover theme-${book.theme} ${compact ? "book-cover-small" : ""}`} aria-label={`Cover of ${book.title}`} role="img">
    <div className="cover-mark">FOLIO</div><div className="cover-rule"/><strong>{book.title}</strong><span>{book.author}</span><div className="cover-shape"/>
  </div>;
}

export function SiteHeader() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`); };
  useEffect(() => setOpen(false), [pathname]);
  return <>
    <div className="announcement"><span>Fresh pages, better ideas.</span><strong> Save 20% on selected reads</strong><Link href="/ebooks">Shop the edit →</Link></div>
    <header className="site-header">
      <div className="nav-main shell">
        <Link href="/" className="logo"><span className="logo-icon"><BookOpen size={21}/></span><span>folio<small>digital bookshop</small></span></Link>
        <form className="header-search" onSubmit={submit}><Search size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, author, or topic" aria-label="Search books"/><button>Search</button></form>
        <div className="nav-actions"><Link href="/account" aria-label="Account"><UserRound/><span>Account</span></Link><Link href="/cart" aria-label={`Cart with ${count} items`}><span className="cart-icon"><ShoppingBag/><b>{count}</b></span><span>Cart</span></Link><button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X/> : <Menu/>}</button></div>
      </div>
      <nav className={`category-nav ${open ? "nav-open" : ""}`}><div className="shell"><Link href="/ebooks">All eBooks</Link><Link href="/category/business">Business</Link><Link href="/category/personal-growth">Personal Growth</Link><Link href="/category/finance">Finance</Link><Link href="/category/wellness">Wellness</Link><Link href="/bundles">Bundles</Link><Link href="/ebooks?sort=new">New Releases</Link><Link href="/ebooks?offers=true" className="sale-link">Deals</Link><Link href="/ebooks" className="browse-link">Browse categories <ChevronDown size={14}/></Link></div></nav>
    </header>
  </>;
}

export function SiteFooter() {
  return <footer className="footer"><div className="shell footer-grid"><div><Link href="/" className="logo logo-light"><span className="logo-icon"><BookOpen size={21}/></span><span>folio<small>digital bookshop</small></span></Link><p>Thoughtful digital books for curious minds. Read anywhere, keep forever.</p><div className="socials"><a href="https://instagram.com" aria-label="Instagram">ig</a><a href="https://pinterest.com" aria-label="Pinterest">p</a><a href="https://x.com" aria-label="X">x</a></div></div><div><h3>Discover</h3><Link href="/ebooks">All eBooks</Link><Link href="/bundles">Curated bundles</Link><Link href="/ebooks?sort=new">New releases</Link><Link href="/blog">The Folio Journal</Link></div><div><h3>Help</h3><Link href="/faq">FAQs</Link><Link href="/contact">Contact us</Link><Link href="/refund-policy">Refund policy</Link><Link href="/account/library">My library</Link></div><div><h3>About</h3><Link href="/about">Our story</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/admin">Publisher portal</Link></div></div><div className="shell footer-bottom"><span>© 2026 Folio Digital Bookshop</span><span>Secure payments by Stripe & PayPal · Instant digital delivery</span></div></footer>;
}

export function MobileCartBar() {
  const { count, total } = useCart();
  if (!count) return null;
  return <Link href="/cart" className="mobile-cart-bar"><span>{count} {count === 1 ? "item" : "items"}</span><strong>View cart · {money(total)}</strong></Link>;
}
