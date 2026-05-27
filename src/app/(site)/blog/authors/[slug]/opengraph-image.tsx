// Dynamic Open Graph image for blog author hubs.
//
// Fix Issue #1 del SEO health check del 2026-05-27: el author hub
// /blog/authors/[slug] no tenía og:image (faltaba avatar en el seed).
// Cuando alguien compartía el author hub en redes, no aparecía preview
// visual. Esta route emite un card 1200x630 dinámico con:
//
//   • Si el author tiene avatar_url → avatar + display_name + headline + brand
//   • Si NO tiene avatar → brand-only card con name + headline
//
// Mismo runtime / patrón que /[slug]/opengraph-image.tsx (Node.js,
// 1h cache, db query directo).

import { ImageResponse } from "next/og";
import { getAuthorBySlug } from "@/lib/blog/authors";
import { toCanonicalUrl } from "@/lib/seo/baseUrl";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

type Params = { slug: string };

export default async function OpenGraphImage({ params }: { params: Params }) {
  const { slug } = params;

  const author = await getAuthorBySlug(slug);
  if (!author) {
    return brandOnlyCard("Autor en 'BallersHub", null);
  }

  const avatarUrl = author.avatarUrl ? toCanonicalUrl(author.avatarUrl) : null;
  if (!avatarUrl) {
    // No avatar yet — fallback a brand-only card pero con el name +
    // headline, que ya es mejor que el OG sitewide genérico.
    return brandOnlyCard(author.displayName, author.headline);
  }

  // Full card — avatar + display_name + headline + brand.
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "radial-gradient(125% 125% at 50% 10%, #001915 40%, #0dd5a5 100%)",
          color: "#fff",
          padding: 80,
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          position: "relative",
        }}
      >
        <BrandTopRow eyebrow="Autor invitado" />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 56,
            marginTop: 64,
            flex: 1,
          }}
        >
          <img
            src={avatarUrl}
            alt=""
            width={280}
            height={280}
            style={{
              width: 280,
              height: 280,
              borderRadius: 999,
              objectFit: "cover",
              border: "6px solid #CCFF00",
              boxShadow: "0 0 0 12px #080808",
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: 72,
                fontWeight: 900,
                letterSpacing: -1,
                lineHeight: 1.05,
                textTransform: "uppercase",
                color: "#fff",
              }}
            >
              {author.displayName}
            </div>
            {author.headline && (
              <div
                style={{
                  alignSelf: "flex-start",
                  background: "#CCFF00",
                  color: "#080808",
                  padding: "10px 22px",
                  fontSize: 26,
                  fontWeight: 900,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  borderRadius: 6,
                }}
              >
                {author.headline}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

/**
 * Lean brand card used when there's no avatar yet (or author not
 * found). Same visual contract as the Free-tier portfolio fallback.
 */
function brandOnlyCard(name: string, headline: string | null) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "radial-gradient(125% 125% at 50% 10%, #001915 40%, #0dd5a5 100%)",
          color: "#fff",
          padding: 100,
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <BrandTopRow eyebrow="Autor invitado" />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            maxWidth: "100%",
          }}
        >
          <div
            style={{
              fontSize: 88,
              fontWeight: 900,
              letterSpacing: -1.5,
              lineHeight: 1.05,
              textTransform: "uppercase",
            }}
          >
            {name}
          </div>
          {headline && (
            <div
              style={{
                alignSelf: "flex-start",
                background: "#CCFF00",
                color: "#080808",
                padding: "10px 24px",
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: 2,
                textTransform: "uppercase",
                borderRadius: 6,
              }}
            >
              {headline}
            </div>
          )}
        </div>

        <div
          style={{
            opacity: 0.7,
            fontSize: 24,
            letterSpacing: 3,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          ballershub.co/blog
        </div>
      </div>
    ),
    { ...size },
  );
}

/**
 * Top-row brand strip used in both card variants. Keeps the layout
 * consistent between brand-only and avatar variants.
 */
function BrandTopRow({ eyebrow }: { eyebrow: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        opacity: 0.9,
        fontSize: 22,
        letterSpacing: 4,
        textTransform: "uppercase",
        fontWeight: 700,
      }}
    >
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: 999,
          background: "#CCFF00",
        }}
      />
      <span>&apos;BallersHub</span>
      <span style={{ opacity: 0.5 }}>·</span>
      <span style={{ opacity: 0.75 }}>{eyebrow}</span>
    </div>
  );
}
