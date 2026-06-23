// Author hub JSON-LD — /blog/authors/[slug]
//
// Por qué ProfilePage y no solo Person:
//   - ProfilePage le dice a Google que esta URL es la página AUTORITATIVA
//     sobre esta persona (Schema.org guideline 2023). Sin ProfilePage el
//     crawler trata la URL como genérica "página con un Person mencionado".
//   - mainEntity apunta al Person, cerrando el cross-reference @id que
//     emite Article schema desde /blog/[slug] (`author: { @id: ...#person }`).
//   - sameAs cross-validates authorship — Google compara con perfiles
//     que ya conoce (LinkedIn, X, etc.) y refuerza E-E-A-T.
//
// Cluster crítico: el @id del Person aquí ES el mismo que emite
// articleJsonLd.tsx — ese cross-ref es la única forma de que Google
// sepa que el "Person mencionado en /blog/post-x" y el "Person sobre el
// que es /blog/authors/slug-y" son la misma entidad.

import { toCanonicalUrl, getSiteBaseUrl } from "./baseUrl";
import type { BlogAuthor } from "@/db/schema";
import { authorSameAs } from "@/lib/blog/authors";
import type { Locale } from "@/i18n/routing";
import { HTML_LANG } from "@/i18n/config";

type ProfilePageJsonLdProps = {
  author: BlogAuthor;
  /**
   * Slug del portfolio público del autor en /<slug> si el user
   * también es un jugador aprobado. Cuando está presente, se agrega
   * al sameAs[] del Person para que Google consolide identidad:
   * "el autor de estos posts es la misma persona que el futbolista
   * de ese portfolio". Ver src/lib/seo/cross-ref.ts.
   */
  portfolioSlug?: string | null;
  /** URL locale — drives `inLanguage` on the ProfilePage node. */
  locale: Locale;
};

export function ProfilePageJsonLd({
  author,
  portfolioSlug,
  locale,
}: ProfilePageJsonLdProps) {
  const base = getSiteBaseUrl();
  const pageUrl = toCanonicalUrl(`/blog/authors/${author.slug}`);
  const personId = `${pageUrl}#person`;
  const profileId = `${pageUrl}#profilepage`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;
  const orgId = `${base}#organization`;
  const sameAs = [
    ...authorSameAs(author),
    // Cross-reference al portfolio del jugador (URL absoluta para
    // que sameAs sea válido). Si el autor no es jugador, esto queda
    // fuera del array.
    ...(portfolioSlug ? [`${base}/${portfolioSlug}`] : []),
  ];

  const personNode: Record<string, unknown> = {
    "@type": "Person",
    "@id": personId,
    name: author.displayName,
    url: pageUrl,
    ...(author.headline && { jobTitle: author.headline }),
    ...(author.bio && { description: author.bio }),
    ...(author.avatarUrl && { image: toCanonicalUrl(author.avatarUrl) }),
    ...(sameAs.length > 0 && { sameAs }),
    // Pertenencia organizacional refuerza E-E-A-T: el author está afiliado
    // a 'BallersHub aunque el rol específico no se publique.
    worksFor: { "@id": orgId },
  };

  const profilePageNode: Record<string, unknown> = {
    "@type": "ProfilePage",
    "@id": profileId,
    url: pageUrl,
    name: `${author.displayName} — Autor en 'BallersHub`,
    ...(author.bio && { description: author.bio }),
    inLanguage: HTML_LANG[locale],
    isPartOf: { "@id": `${base}#website` },
    mainEntity: { "@id": personId },
    breadcrumb: { "@id": breadcrumbId },
    ...(author.avatarUrl && {
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: toCanonicalUrl(author.avatarUrl),
      },
    }),
  };

  const breadcrumbNode = {
    "@type": "BreadcrumbList",
    "@id": breadcrumbId,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: base },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${base}/blog` },
      {
        "@type": "ListItem",
        position: 3,
        name: "Autores",
        item: `${base}/blog/authors`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: author.displayName,
        item: pageUrl,
      },
    ],
  };

  const graph = {
    "@context": "https://schema.org",
    "@graph": [profilePageNode, personNode, breadcrumbNode],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
