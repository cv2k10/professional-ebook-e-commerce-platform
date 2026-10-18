export type Book = {
  id: string;
  slug: string;
  title: string;
  author: string;
  category: string;
  categorySlug: string;
  description: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  badge?: string;
  theme: string;
  published: string;
  pages: number;
  formats: string[];
  featured?: boolean;
};

export type Bundle = {
  id: string;
  slug: string;
  title: string;
  description: string;
  bookIds: string[];
  price: number;
  theme: string;
};

export const books: Book[] = [
  { id: "book-deep-work", slug: "the-deep-work-method", title: "The Deep Work Method", author: "Maya Chen", category: "Productivity", categorySlug: "productivity", description: "A practical system for protecting your attention, doing meaningful work, and ending each day with energy to spare.", price: 14.99, originalPrice: 19.99, rating: 4.9, reviews: 328, badge: "Bestseller", theme: "ink", published: "January 16, 2026", pages: 248, formats: ["PDF", "EPUB", "MOBI"], featured: true },
  { id: "book-money", slug: "money-on-purpose", title: "Money on Purpose", author: "Elena Brooks", category: "Finance", categorySlug: "finance", description: "Build a calm, values-led financial life with a refreshingly simple plan for spending, saving, and investing.", price: 12.99, rating: 4.8, reviews: 194, badge: "New", theme: "sun", published: "February 3, 2026", pages: 212, formats: ["PDF", "EPUB"], featured: true },
  { id: "book-slow", slug: "the-art-of-slow-living", title: "The Art of Slow Living", author: "Sofia Linden", category: "Wellness", categorySlug: "wellness", description: "An elegant field guide to a more attentive home, a quieter mind, and days that feel like your own.", price: 11.99, rating: 4.7, reviews: 251, theme: "sage", published: "October 8, 2025", pages: 184, formats: ["PDF", "EPUB"], featured: true },
  { id: "book-lead", slug: "lead-with-clarity", title: "Lead with Clarity", author: "Marcus Reed", category: "Business", categorySlug: "business", description: "Practical frameworks for making sound decisions and helping teams do their best work in uncertain times.", price: 16.99, rating: 4.9, reviews: 147, badge: "Editor’s pick", theme: "navy", published: "November 21, 2025", pages: 276, formats: ["PDF", "EPUB", "MOBI"], featured: true },
  { id: "book-stories", slug: "stories-that-sell", title: "Stories That Sell", author: "Naomi Foster", category: "Marketing", categorySlug: "marketing", description: "Turn customer insight into memorable stories that move people from curiosity to confident action.", price: 13.99, originalPrice: 17.99, rating: 4.6, reviews: 89, badge: "20% off", theme: "rose", published: "September 12, 2025", pages: 220, formats: ["PDF", "EPUB"] },
  { id: "book-habits", slug: "tiny-habits-lasting-change", title: "Tiny Habits, Lasting Change", author: "Jon Bell", category: "Personal Growth", categorySlug: "personal-growth", description: "A compassionate, science-informed approach to making small changes that naturally become part of who you are.", price: 10.99, rating: 4.8, reviews: 406, theme: "clay", published: "June 4, 2025", pages: 196, formats: ["PDF", "EPUB", "MOBI"] },
  { id: "book-remote", slug: "the-remote-studio", title: "The Remote Studio", author: "Priya Nair", category: "Business", categorySlug: "business", description: "Design rituals, communication, and culture for a creative team that works beautifully from anywhere.", price: 15.99, rating: 4.7, reviews: 122, badge: "New", theme: "violet", published: "February 18, 2026", pages: 264, formats: ["PDF", "EPUB"] },
  { id: "book-reset", slug: "the-weekend-reset", title: "The Weekend Reset", author: "Olivia Hart", category: "Wellness", categorySlug: "wellness", description: "Fifty-two restorative rituals for a home, schedule, and mind that feel lighter by Monday morning.", price: 9.99, rating: 4.6, reviews: 73, theme: "peach", published: "December 2, 2025", pages: 168, formats: ["PDF", "EPUB"] },
];

export const bundles: Bundle[] = [
  { id: "bundle-better-work", slug: "the-better-work-collection", title: "The Better Work Collection", description: "Four essential guides to focused work, clear leadership, creative marketing, and thriving remote teams.", bookIds: ["book-deep-work", "book-lead", "book-stories", "book-remote"], price: 39.99, theme: "forest" },
  { id: "bundle-well-lived", slug: "a-life-well-lived", title: "A Life Well Lived", description: "Three thoughtful reads for building gentle habits, reclaiming your weekends, and embracing a slower pace.", bookIds: ["book-slow", "book-habits", "book-reset"], price: 24.99, theme: "sand" },
];

export const categories = [
  { name: "Business & Leadership", slug: "business", icon: "Briefcase", count: 42 },
  { name: "Personal Growth", slug: "personal-growth", icon: "Sparkles", count: 36 },
  { name: "Money & Finance", slug: "finance", icon: "TrendingUp", count: 24 },
  { name: "Health & Wellness", slug: "wellness", icon: "Heart", count: 31 },
  { name: "Productivity", slug: "productivity", icon: "Clock3", count: 28 },
  { name: "Marketing", slug: "marketing", icon: "Megaphone", count: 19 },
];

export function getBook(slug: string) { return books.find((book) => book.slug === slug); }
export function getBundle(slug: string) { return bundles.find((bundle) => bundle.slug === slug); }
export function getCatalogItem(id: string) {
  const book = books.find((item) => item.id === id);
  if (book) return { id: book.id, title: book.title, price: book.price, type: "ebook" as const };
  const bundle = bundles.find((item) => item.id === id);
  if (bundle) return { id: bundle.id, title: bundle.title, price: bundle.price, type: "bundle" as const };
  return undefined;
}
export const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
