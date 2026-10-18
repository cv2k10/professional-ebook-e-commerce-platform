import type { Metadata } from "next";
import { Breadcrumbs, BundleCard } from "@/components/store-ui";
import { bundles } from "@/lib/catalog";
export const metadata: Metadata = { title: "Curated eBook Bundles", description: "Save more with Folio's thoughtfully curated eBook collections.", alternates: { canonical: "/bundles" } };
export default function BundlesPage(){return <main><Breadcrumbs items={[{label:"Bundles"}]}/><section className="page-hero"><div className="shell"><p className="eyebrow">Read more, spend less</p><h1>Curated eBook collections</h1><p>Books that belong together, paired by our editors and priced to make your reading list happier.</p></div></section><section className="section"><div className="shell bundle-grid">{bundles.map((bundle)=><BundleCard key={bundle.id} bundle={bundle}/>)}</div></section></main>}
