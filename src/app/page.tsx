import Link from "next/link";
import { Briefcase, Check, Clock3, Heart, Megaphone, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { BundleCard, BookCard, Rating, SectionHead, TrustBar } from "@/components/store-ui";
import { NewsletterForm } from "@/components/newsletter-form";
import { books, bundles, categories } from "@/lib/catalog";

const icons = { Briefcase, Sparkles, TrendingUp, Heart, Clock3, Megaphone };

export default function HomePage() {
  return <main>
    <section className="hero"><div className="hero-bg"/><div className="shell hero-content"><p className="eyebrow">Read better. Think bigger.</p><h1>Ideas worth keeping,<br/><em>wherever you go.</em></h1><p>Discover beautifully crafted eBooks from thoughtful voices in business, wellbeing, creativity, and life.</p><div className="hero-actions"><Link href="/ebooks" className="btn-primary">Explore the collection →</Link><Link href="/bundles" className="btn-secondary">Shop bundles</Link></div><div className="hero-note"><span><Check/> Instant download</span><span><Check/> Read on any device</span><span><ShieldCheck/> Secure checkout</span></div></div></section>
    <TrustBar/>
    <section className="section"><div className="shell"><SectionHead eyebrow="Reader favorites" title="Books everyone’s talking about" text="Fresh thinking and practical wisdom, chosen by readers like you." href="/ebooks"/><div className="book-grid">{books.slice(0,4).map((book) => <BookCard key={book.id} book={book}/>)}</div></div></section>
    <section className="section section-tint"><div className="shell"><SectionHead eyebrow="Find your next read" title="Browse by interest" href="/ebooks" link="All categories"/><div className="categories">{categories.map((category) => { const Icon = icons[category.icon as keyof typeof icons]; return <Link className="category-tile" href={`/category/${category.slug}`} key={category.slug}><span className="category-icon"><Icon size={22}/></span><h3>{category.name}</h3><small>{category.count} eBooks</small></Link>; })}</div></div></section>
    <section className="section"><div className="shell"><SectionHead eyebrow="More to read, less to spend" title="Curated collections" text="Expertly paired reads at a price worth bookmarking." href="/bundles" link="See all bundles"/><div className="bundle-grid">{bundles.map((bundle) => <BundleCard key={bundle.id} bundle={bundle}/>)}</div></div></section>
    <section className="section section-tint"><div className="shell"><SectionHead eyebrow="Just published" title="New on the shelf" text="The latest ideas, ready to download." href="/ebooks?sort=new"/><div className="book-grid">{books.slice(4,8).map((book) => <BookCard key={book.id} book={book}/>)}</div></div></section>
    <section className="quote-section"><div className="shell quote-grid"><div className="quote-intro"><p className="eyebrow">Loved by thoughtful readers</p><h2>Good books. Kind words.</h2><p>Thousands of curious minds are building better work and richer lives with Folio.</p></div><article className="quote-card"><Rating value={5} light/><blockquote>“Folio feels like having a brilliant bookseller in your pocket. Every recommendation has been genuinely useful.”</blockquote><strong>Amelia R.</strong><small>VERIFIED READER · LONDON</small></article><article className="quote-card"><Rating value={5} light/><blockquote>“The bundles are beautifully curated, and I was reading on my Kindle less than a minute after checkout.”</blockquote><strong>Daniel K.</strong><small>VERIFIED READER · TORONTO</small></article></div></section>
    <section className="newsletter"><div className="shell newsletter-inner"><div><p className="eyebrow">A better inbox</p><h2>One good idea, every Sunday.</h2><p>Reading lists, thoughtful notes, and 15% off your first order.</p></div><NewsletterForm/></div></section>
  </main>;
}
