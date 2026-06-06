// Conversion CTA shown near the end of an article — accent-tinted by the
// post's cluster. Both buttons point at real destinations.

import Link from "next/link";
import type { BlogCluster } from "@/db/schema";
import { accentForCluster, toneForCluster } from "@/lib/blog/clusterAccent";

export function BlogCta({ cluster }: { cluster: BlogCluster }) {
  const accent = accentForCluster(cluster);
  const tone = toneForCluster(cluster);
  const primaryBg = tone === "blue" ? "#00C2FF" : "#CCFF00";

  return (
    <div
      className="relative mb-12 overflow-hidden rounded-bh-xl border p-10 max-md:p-7"
      style={{
        borderColor: accent.border,
        background: `radial-gradient(120% 140% at 100% 0%, ${accent.soft} 0%, transparent 55%), rgba(16,16,16,0.7)`,
      }}
    >
      <h3 className="mb-3 max-w-[520px] font-bh-display text-[clamp(26px,3vw,38px)] font-extrabold uppercase leading-[0.98] text-bh-fg-1">
        Dejá de esperar a que te descubran
      </h3>
      <p className="mb-6 max-w-[540px] font-bh-body text-[15.5px] leading-[1.6] text-bh-fg-2">
        Construí tu portfolio profesional en minutos: métricas, highlights y referencias
        verificadas, listo para compartir con un solo enlace.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/auth/sign-up"
          className="inline-flex items-center justify-center rounded-bh-md px-7 py-3.5 font-bh-display text-sm font-bold uppercase tracking-[0.04em] text-bh-black transition hover:-translate-y-px"
          style={{ background: primaryBg }}
        >
          Crear mi perfil gratis
        </Link>
        <Link
          href="/players"
          className="inline-flex items-center justify-center rounded-bh-md border border-white/[0.18] px-7 py-3.5 font-bh-display text-sm font-bold uppercase tracking-[0.04em] text-bh-fg-1 transition hover:bg-white/[0.07]"
        >
          Ver ejemplos
        </Link>
      </div>
    </div>
  );
}
