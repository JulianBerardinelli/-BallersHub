// Dynamic Open Graph image for /pricing.
//
// Dos motivos para que exista:
//
//   1. SEO health fix (GSC 2026-05-27): el `Product` schema de /pricing
//      requería el campo `image` para ser válido como Merchant listing /
//      Product snippet. Google rechaza SVG y placeholders genéricos; este
//      OG raster (1200×630 PNG) es la `image` canónica del Product —
//      referenciada desde `offerJsonLd.tsx`.
//
//   2. Social share: cuando alguien comparte ballershub.co/pricing en
//      WhatsApp / X / IG, la preview ahora muestra una card branded de
//      planes en lugar del OG genérico del layout.
//
// Estático (sin DB) — el contenido de /pricing es el mismo para todos.
// Mismo lenguaje visual que el brandOnlyCard de /[slug]/opengraph-image.

import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "'BallersHub — Planes y precios";

export default function PricingOpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(125% 125% at 50% 10%, #001915 40%, #0dd5a5 100%)",
          color: "#fff",
          padding: 80,
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        {/* Brand wordmark top */}
        <div
          style={{
            fontSize: 28,
            letterSpacing: 6,
            textTransform: "uppercase",
            fontWeight: 700,
            opacity: 0.85,
          }}
        >
          &apos;BallersHub
        </div>

        {/* Main headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              alignSelf: "flex-start",
              background: "#CCFF00",
              color: "#080808",
              padding: "8px 18px",
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: 2,
              textTransform: "uppercase",
              borderRadius: 6,
            }}
          >
            Planes y precios
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 900,
              lineHeight: 0.98,
              textTransform: "uppercase",
              letterSpacing: -2,
              maxWidth: 1040,
            }}
          >
            Free para empezar. Pro para destacar.
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 600,
              opacity: 0.85,
              marginTop: 8,
              maxWidth: 980,
            }}
          >
            Perfiles profesionales para futbolistas y agencias del fútbol argentino.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 20,
            opacity: 0.7,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          <span>Jugadores · Agencias</span>
          <span>ballershub.co/pricing</span>
        </div>
      </div>
    ),
    size,
  );
}
