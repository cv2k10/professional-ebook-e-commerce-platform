import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CartProvider, MobileCartBar, SiteFooter, SiteHeader } from "@/components/store-client";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Folio — Thoughtful eBooks for Curious Minds", template: "%s | Folio" },
  description: "Discover original eBooks and curated collections for work and life. Secure checkout, instant downloads, and lifetime library access.",
  keywords: ["ebooks", "digital books", "business books", "personal growth", "ebook bundles"],
  openGraph: { type: "website", siteName: "Folio Digital Bookshop", title: "Folio — Thoughtful eBooks for Curious Minds", description: "Beautiful ideas, ready when you are.", images: ["/images/hero-library.jpg"] },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

const organization = { "@context": "https://schema.org", "@type": "Organization", name: "Folio Digital Bookshop", url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", logo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/icon` };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}/><CartProvider><SiteHeader/>{children}<SiteFooter/><MobileCartBar/></CartProvider></body></html>;
}
