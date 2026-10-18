import type { Metadata } from "next";
import Link from "next/link";
import { BookCard, Breadcrumbs } from "@/components/store-ui";
import { books, categories } from "@/lib/catalog";
export const metadata: Metadata = { title: "Browse All eBooks", description: "Browse Folio's complete collection of thoughtful digital books.", alternates: { canonical: "/ebooks" } };
export default async function EbooksPage({ searchParams }: { searchParams: Promise<{ sort?: string; offers?: string }> }) {
  const params = await searchParams; let display = [...books];
  if (params.offers) display = display.filter((b) => b.originalPrice);
  if (params.sort === "new") display.reverse();
  return <main><Breadcrumbs items={[{ label: "All eBooks" }]}/><section className="page-hero"><div className="shell"><p className="eyebrow">The complete shelf</p><h1>Explore all eBooks</h1><p>Big ideas, practical guides, and thoughtful reads for wherever life takes you.</p></div></section><section className="section"><div className="shell catalog-layout"><aside className="filters"><h3>Browse by topic</h3><div className="filter-links"><Link href="/ebooks">All eBooks</Link>{categories.map((c) => <Link key={c.slug} href={`/category/${c.slug}`}>{c.name} <small>({c.count})</small></Link>)}</div><h3>Featured</h3><div className="filter-links"><Link href="/ebooks?sort=new">New releases</Link><Link href="/ebooks?offers=true">Special offers</Link><Link href="/bundles">Curated bundles</Link></div></aside><div className="catalog-main"><div className="catalog-toolbar"><span>{display.length} thoughtful reads</span><select defaultValue={params.sort || "popular"} aria-label="Sort books"><option value="popular">Most popular</option><option value="new">Newest first</option></select></div><div className="book-grid">{display.map((book) => <BookCard key={book.id} book={book}/>)}</div></div></div></section></main>;
}
