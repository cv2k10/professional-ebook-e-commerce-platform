import Link from "next/link";
import { ArrowRight, BookMarked, CheckCircle2, Download, LockKeyhole, ShieldCheck, Star } from "lucide-react";
import { books, money, type Book, type Bundle } from "@/lib/catalog";
import { AddToCartButton, BookCover } from "./store-client";

export function Rating({ value, reviews, light = false }: { value: number; reviews?: number; light?: boolean }) {
  return <div className={`rating ${light ? "rating-light" : ""}`} aria-label={`${value} out of 5 stars`}><span><Star size={14} fill="currentColor"/> {value}</span>{reviews !== undefined && <small>({reviews})</small>}</div>;
}

export function BookCard({ book }: { book: Book }) {
  return <article className="book-card">
    <Link href={`/ebooks/${book.slug}`} className="cover-wrap">{book.badge && <span className="book-badge">{book.badge}</span>}<BookCover book={book}/></Link>
    <div className="book-info"><p className="eyebrow">{book.category}</p><h3><Link href={`/ebooks/${book.slug}`}>{book.title}</Link></h3><p className="author">by {book.author}</p><Rating value={book.rating} reviews={book.reviews}/><div className="price-row"><strong>{money(book.price)}</strong>{book.originalPrice && <del>{money(book.originalPrice)}</del>}<AddToCartButton id={book.id} label="Add"/></div></div>
  </article>;
}

export function SectionHead({ eyebrow, title, text, href, link = "View all" }: { eyebrow?: string; title: string; text?: string; href?: string; link?: string }) {
  return <div className="section-head"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2>{text && <p>{text}</p>}</div>{href && <Link href={href}>{link} <ArrowRight size={17}/></Link>}</div>;
}

export function BundleCard({ bundle }: { bundle: Bundle }) {
  const included = bundle.bookIds.map((id) => books.find((b) => b.id === id)).filter(Boolean) as Book[];
  const original = included.reduce((sum, item) => sum + item.price, 0);
  return <article className={`bundle-card bundle-${bundle.theme}`}><div className="bundle-covers">{included.slice(0, 4).map((book, i) => <div key={book.id} style={{ transform: `translateX(${i * 43}px) rotate(${(i - 1.5) * 4}deg)`, zIndex: i }}><BookCover book={book} compact/></div>)}</div><div className="bundle-content"><span className="bundle-label"><BookMarked size={15}/> CURATED COLLECTION</span><h3>{bundle.title}</h3><p>{bundle.description}</p><ul>{included.map((book) => <li key={book.id}><CheckCircle2 size={15}/>{book.title}</li>)}</ul><div className="bundle-price"><div><small>Bundle price</small><strong>{money(bundle.price)}</strong><del>{money(original)}</del></div><span>Save {money(original - bundle.price)}</span></div><div className="bundle-actions"><AddToCartButton id={bundle.id}/><Link href={`/bundles/${bundle.slug}`}>View details</Link></div></div></article>;
}

export function TrustBar() {
  return <section className="trust-bar"><div className="shell"><div><Download/><span><strong>Instant download</strong><small>Start reading in seconds</small></span></div><div><ShieldCheck/><span><strong>Secure checkout</strong><small>Stripe & PayPal protected</small></span></div><div><BookMarked/><span><strong>Yours to keep</strong><small>Lifetime library access</small></span></div><div><LockKeyhole/><span><strong>Private by design</strong><small>Your details stay secure</small></span></div></div></section>;
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return <nav className="breadcrumbs shell" aria-label="Breadcrumb"><Link href="/">Home</Link>{items.map((item) => <span key={item.label}>/ {item.href ? <Link href={item.href}>{item.label}</Link> : <b>{item.label}</b>}</span>)}</nav>;
}
