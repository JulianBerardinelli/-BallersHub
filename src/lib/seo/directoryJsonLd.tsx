// JSON-LD for the public directory/index pages (/players, /agencies).
//
// Emits a `@graph` of three nodes:
//   • CollectionPage  — declares the page IS a curated collection, with
//     `mainEntity` pointing at the ItemList. Helps Google understand the
//     page's job (a hub that lists entities) vs. a thin content page.
//   • ItemList        — the actual list of profile URLs in "summary page"
//     format: each ListItem carries `position` + `url` pointing at the
//     detail page. This is the format Google documents for a list page
//     that links out to individual item pages.
//   • BreadcrumbList  — Inicio → <collection>, mirrors the breadcrumb we
//     emit on every other indexable surface for a consistent graph.
//
// Why this matters for the indexing fix: the ItemList gives Google an
// explicit, machine-readable manifest of every profile we want crawled,
// reinforcing the plain <a href> links in the markup. Combined with the
// internal links it turns orphan profiles into linked-from pages, which
// is the single biggest lever against "Discovered – currently not
// indexed".

import { getSiteBaseUrl, toCanonicalUrl } from "./baseUrl";

export type DirectoryItem = {
  /** Absolute or root-relative URL of the detail page. */
  url: string;
  /** Display name of the entity (player full name / agency name). */
  name: string;
};

export function DirectoryJsonLd({
  path,
  name,
  description,
  items,
}: {
  /** Root-relative path of THIS index page, e.g. "/players". */
  path: string;
  /** Human title of the collection, e.g. "Jugadores". */
  name: string;
  description: string;
  items: DirectoryItem[];
}) {
  const base = getSiteBaseUrl();
  const pageUrl = toCanonicalUrl(path);
  const orgId = `${base}#organization`;
  const collectionId = `${pageUrl}#collection`;
  const listId = `${pageUrl}#itemlist`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;

  const itemListNode = {
    "@type": "ItemList",
    "@id": listId,
    name,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: toCanonicalUrl(it.url),
    })),
  };

  const collectionNode = {
    "@type": "CollectionPage",
    "@id": collectionId,
    url: pageUrl,
    name,
    description,
    isPartOf: { "@id": `${base}#website` },
    publisher: { "@id": orgId },
    mainEntity: { "@id": listId },
    breadcrumb: { "@id": breadcrumbId },
  };

  const breadcrumbNode = {
    "@type": "BreadcrumbList",
    "@id": breadcrumbId,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: base },
      { "@type": "ListItem", position: 2, name, item: pageUrl },
    ],
  };

  const payload = {
    "@context": "https://schema.org",
    "@graph": [collectionNode, itemListNode, breadcrumbNode],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
