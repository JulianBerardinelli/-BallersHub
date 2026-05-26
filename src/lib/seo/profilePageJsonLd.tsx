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

export function ProfilePageJsonLd({ author }: { author: BlogAuthor }) {
  const base = getSiteBaseUrl();
  const pageUrl = toCanonicalUrl(`/blog/authors/${author.slug}`);
  const personId = `${pageUrl}#person`;
  const profileId = `${pageUrl}#profilepage`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;
  const orgId = `${base}#organization`;
  const sameAs = authorSameAs(author);

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
    inLanguage: "es-AR",
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
