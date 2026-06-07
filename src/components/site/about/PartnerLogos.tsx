// src/components/site/about/PartnerLogos.tsx
// Patrón "trusted by" / partners — fila estática de logos centrada.
//
// Comportamiento de hover (gris → color original):
// - cada <li> es un `group` independiente
// - el logo arranca en gris (filter) y al hover vuelve a su color embebido.

import Image from "next/image";
import { getTranslations } from "next-intl/server";

import SectionHeader from "./SectionHeader";
import { getPartners, type Partner } from "./data";

export default async function PartnerLogos() {
  const t = await getTranslations("about");
  const partners = getPartners(t);

  return (
    <section className="space-y-10">
      <SectionHeader
        align="center"
        eyebrow={t("sections.partners.eyebrow")}
        title={
          <>
            {t("sections.partners.titlePlain")}{" "}
            <span className="whitespace-nowrap">
              <span className="text-bh-lime">&apos;Ballers</span>
              <span className="text-bh-fg-1">Hub</span>
            </span>
          </>
        }
      />

      {/* Fila estática centrada — flex-wrap responsive sin animaciones */}
      <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 md:gap-x-20 md:gap-y-10">
        {partners.map((partner) => (
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

  // 3) Fallback tipográfico — sin logo todavía.
  return (
    <span className="select-none whitespace-nowrap font-bh-display text-base font-bold uppercase tracking-[0.05em] text-bh-fg-3 transition-colors duration-200 group-hover:text-bh-fg-1 md:text-lg">
      {partner.name}
    </span>
  );
}
