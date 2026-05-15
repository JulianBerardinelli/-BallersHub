// LockedBanner — interleaved Pro upsell sections shown to free-tier users.
// Renders the locked feature title, subtitle, "Activar Pro" CTA, and a
// blurred preview thumbnail next to it. Three preview kinds are baked in
// (tactics, gallery, press) — pick via the `preview` prop.

import Link from "next/link";
import type { ReactNode } from "react";
import { LockIcon } from "./atoms";

export type LockedBannerProps = {
  side: "left" | "right";
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  preview: "tactics" | "gallery" | "press";
};

export default function LockedBanner({
  side,
  eyebrow,
  title,
  subtitle,
  preview,
}: LockedBannerProps) {
  const previewNode =
    preview === "tactics" ? (
      <TacticsPreview />
    ) : preview === "gallery" ? (
      <GalleryPreview />
    ) : (
      <PressPreview />
    );

  // Reverse the columns by toggling the order utility classes. We avoid
  // CSS `direction: rtl` because it mirrors text inside children too.
  const textOrder = side === "left" ? "md:order-2" : "md:order-1";
  const previewOrder = side === "left" ? "md:order-1" : "md:order-2";

  return (
    <section className="border-t border-white/[0.10] px-5 py-7 md:px-10 md:py-12">
      <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 items-center gap-5 md:grid-cols-2 md:gap-9">
        <div className={`space-y-3.5 ${textOrder}`}>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-bh-lime/40 bg-bh-lime/10 px-2.5 py-1 font-body text-[10px] font-bold uppercase tracking-[0.14em] text-bh-lime">
            <LockIcon size={10} /> {eyebrow}
          </div>
          <h3 className="font-bh-display text-[32px] font-black uppercase leading-[0.95] text-bh-fg-1 md:text-5xl">
            {title}
          </h3>
          <p className="max-w-[460px] font-body text-[13px] leading-[1.6] text-bh-fg-2 md:text-sm">
            {subtitle}
          </p>
          <div className="pt-2">
            <Link
              href="/pricing?audience=player&currency=ARS"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-bh-lime px-5 py-2.5 font-body text-sm font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
            >
              Activar Pro
            </Link>
          </div>
        </div>

        <div
          className={`relative h-[200px] overflow-hidden rounded-xl border border-white/[0.10] bg-bh-surface-1 md:h-[260px] ${previewOrder}`}
        >
          <div className="absolute inset-0" style={{ filter: "blur(2px) saturate(0.6)", opacity: 0.55 }}>
            {previewNode}
          </div>
          {/* Diagonal lock stripe — fades two corners to bg */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(8,8,8,0.8) 0%, transparent 35%, transparent 65%, rgba(8,8,8,0.8) 100%)",
            }}
          />
          {/* Center lock pill */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-bh-black/85 px-3.5 py-2 font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-fg-1">
              <LockIcon size={11} /> Solo Pro
            </div>
          </div>
          <div className="absolute left-3 top-3 font-bh-mono text-[10px] uppercase tracking-[0.14em] text-bh-fg-3">
            Preview · {eyebrow}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------
// Mini previews rendered behind the blur. Visual only; no real data.
// ---------------------------------------------------------------

function TacticsPreview() {
  return (
    <div className="flex h-full w-full gap-4 p-5">
      <div
        className="relative flex-1 rounded-lg border border-bh-lime/20"
        style={{
          background: "radial-gradient(ellipse at center, #1A4A1F 0%, #0A1A0E 80%)",
        }}
      >
        <div className="absolute inset-3 rounded border-2 border-white/30" />
        <div className="absolute bottom-3 left-1/2 top-3 w-px bg-white/30" />
        <div className="absolute left-1/2 top-1/2 -ml-7 -mt-7 h-14 w-14 rounded-full border-2 border-white/30" />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {["Análisis Táctico", "Cualidades Físicas", "Perfil Mental", "Virtud Técnica"].map(
          (s) => (
            <div
              key={s}
              className="rounded border border-white/[0.08] bg-bh-surface-2 px-3 py-2.5 font-bh-display text-sm font-bold uppercase tracking-[0.04em] text-bh-fg-1"
            >
              {s}
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function GalleryPreview() {
  return (
    <div className="grid h-full w-full grid-cols-4 gap-1.5 p-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="rounded"
          style={{
            background: `linear-gradient(${i * 30}deg, #2C2C2C, #181818)`,
          }}
        />
      ))}
    </div>
  );
}

function PressPreview() {
  return (
    <div className="h-full w-full p-5" style={{ background: "#F5F1E8" }}>
      <div
        className="mb-2.5 text-[11px] uppercase tracking-[0.18em]"
        style={{ fontFamily: "Georgia, serif", color: "#888" }}
      >
        The Professional Times — Daily Press
      </div>
      <div
        className="text-[26px] font-black leading-[1.05]"
        style={{ fontFamily: "Georgia, serif", color: "#111" }}
      >
        DESEQUILIBRA EN EL CLÁSICO
      </div>
      <div
        className="mt-2 text-xs italic"
        style={{ fontFamily: "Georgia, serif", color: "#555" }}
      >
        Olé · La Nación · TyC Sports
      </div>
      <div
        className="mt-3.5 h-14 rounded-sm"
        style={{ background: "linear-gradient(135deg, #ddd, #aaa)" }}
      />
    </div>
  );
}
