// src/components/site/about/PartnerLogos.tsx
// Patrón "trusted by" / partners — fila estática de logos centrada.
//
// Comportamiento de hover (gris → color original):
// - cada <li> es un `group` independiente
// - el logo arranca con `grayscale + brightness(2) + opacity-60` para que los
//   logos con colores oscuros (como el azul navy de Nexions) sigan siendo
//   legibles sobre el background dark del page
// - al hover el filter se desactiva y vuelven los colores embebidos del SVG
//
// Slots de logo (en orden de prioridad):
//   1. partner.Logo  → componente React/SVG (vector inline, sin requests, ideal)
//   2. partner.logoSrc → ruta a imagen raster bajo /public (next/image)
//   3. fallback tipográfico (wordmark)

import Image from "next/image";

import SectionHeader from "./SectionHeader";
import { PARTNERS, type Partner } from "./data";

export default function PartnerLogos() {
  return (
    <section className="space-y-10">
      <SectionHeader
        align="center"
        eyebrow="Partners y aliados"
        title={
          <>
            Confían en{" "}
            <span className="whitespace-nowrap">
              <span className="text-bh-lime">&apos;Ballers</span>
              <span className="text-bh-fg-1">Hub</span>
            </span>
          </>
        }
      />

      {/* Fila estática centrada — flex-wrap responsive sin animaciones */}
      <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 md:gap-x-20 md:gap-y-10">
        {PARTNERS.map((partner) => (
          <li key={partner.name} className="group">
            <PartnerMark partner={partner} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------------------- */
/* PartnerMark — render con prioridad Logo > logoSrc > wordmark */
/* ---------------------------------------------- */

// Filtro de hover compartido entre los 3 modos de render.
//
// Truco para que TODOS los logos se vean en EXACTAMENTE el mismo gris,
// independientemente de la paleta original (navy puro, blanco, dual-tone, etc.):
//   - brightness(0)  → aplasta cada path a negro
//   - invert(1)      → invierte ese negro a blanco
//   = silueta blanca uniforme de cualquier logo, sin importar sus fills
//   - opacity-55     → la blanca queda "tintada" al gris deseado sobre dark bg
//
// En hover invertimos a brightness(1) invert(0) (equivalente a sin filter,
// pero explícito para que la transición interpole suave) + opacity-100.
const HOVER_FX =
  "opacity-55 [filter:brightness(0)_invert(1)] transition-[filter,opacity] duration-300 ease-[cubic-bezier(0.25,0,0,1)] group-hover:opacity-100 group-hover:[filter:brightness(1)_invert(0)]";

function PartnerMark({ partner }: { partner: Partner }) {
  // 1) Logo como componente React (vector inline)
  if (partner.Logo) {
    const Logo = partner.Logo;
    return (
      <Logo
        aria-label={partner.name}
        className={`h-9 w-auto md:h-11 ${HOVER_FX} ${partner.logoClassName ?? ""}`}
      />
    );
  }

  // 2) Logo raster (Image)
  if (partner.logoSrc) {
    return (
      <div
        className={`relative h-10 w-32 md:h-12 md:w-40 ${HOVER_FX} ${partner.logoClassName ?? ""}`}
      >
        <Image
          src={partner.logoSrc}
          alt={partner.name}
          fill
          sizes="(min-width: 768px) 160px, 128px"
          className="object-contain"
        />
      </div>
    );
  }

  // 3) Fallback tipográfico — sin logo todavía. No usa filter (no aplica),
  //    sólo gradúa color para mantener el patrón visual.
  return (
    <span className="select-none whitespace-nowrap font-bh-display text-base font-bold uppercase tracking-[0.05em] text-bh-fg-3 transition-colors duration-200 group-hover:text-bh-fg-1 md:text-lg">
      {partner.name}
    </span>
  );
}
