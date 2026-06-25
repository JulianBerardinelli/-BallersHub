// CoachProSlot — the single interleaved Pro slot on the Free coach dossier.
// Mirrors the player Free layout's owner/visitor swap (see ProSpot): the
// profile owner sees an "Activar Pro" upsell that teases the cinematic Pro
// coach layout; every other viewer sees BallersHub advertising inviting them
// to build their own DT dossier.
//
// Server component — both banners are server-rendered and handed to the tiny
// client <ProSpot> wrapper, which only chooses which one to mount (no extra
// client JS, no layout shift since both share the same shell).

import Link from "next/link";
import { ArrowRight, BadgeCheck, Check, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LockIcon } from "./atoms";
import ProSpot from "./ProSpot";

export default async function CoachProSlot({
  ownerUserId,
  side = "right",
}: {
  ownerUserId: string | null;
  side?: "left" | "right";
}) {
  const t = await getTranslations("portfolio");
  return (
    <ProSpot
      ownerUserId={ownerUserId}
      promo={<CoachPromo side={side} t={t} />}
      locked={<CoachLocked side={side} t={t} />}
    />
  );
}

type SlotT = Awaited<ReturnType<typeof getTranslations>>;

// ---------------------------------------------------------------
// Owner upsell — "Activá tu portfolio Pro" (the cinematic layout).
// ---------------------------------------------------------------

function CoachLocked({ side, t }: { side: "left" | "right"; t: SlotT }) {
  const textOrder = side === "left" ? "md:order-2" : "md:order-1";
  const previewOrder = side === "left" ? "md:order-1" : "md:order-2";

  return (
    <section className="border-t border-white/[0.10] px-5 py-7 md:px-10 md:py-12">
      <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 items-center gap-5 md:grid-cols-2 md:gap-9">
        <div className={`space-y-3.5 ${textOrder}`}>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-bh-lime/40 bg-bh-lime/10 px-2.5 py-1 font-body text-[10px] font-bold uppercase tracking-[0.14em] text-bh-lime">
            <LockIcon size={10} /> {t("coach.free.proLockedEyebrow")}
          </div>
          <h3 className="font-bh-display text-[32px] font-black uppercase leading-[0.95] text-bh-fg-1 md:text-5xl">
            {t("coach.free.proLockedTitleA")}
            <br />
            <span className="italic text-bh-lime">{t("coach.free.proLockedTitleB")}</span>
          </h3>
          <p className="max-w-[460px] font-body text-[13px] leading-[1.6] text-bh-fg-2 md:text-sm">
            {t("coach.free.proLockedSubtitle")}
          </p>
          <div className="pt-2">
            <Link
              href="/checkout/pro-coach?currency=ARS"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-bh-lime px-5 py-2.5 font-body text-sm font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
            >
              {t("coach.free.proActivate")}
            </Link>
          </div>
        </div>

        <div
          className={`relative h-[200px] overflow-hidden rounded-xl border border-white/[0.10] bg-bh-surface-1 md:h-[260px] ${previewOrder}`}
        >
          <div className="absolute inset-0" style={{ filter: "blur(2px) saturate(0.6)", opacity: 0.55 }}>
            <TacticsPreview t={t} />
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
              <LockIcon size={11} /> {t("promo.lockedOnlyPro")}
            </div>
          </div>
          <div className="absolute left-3 top-3 font-bh-mono text-[10px] uppercase tracking-[0.14em] text-bh-fg-3">
            {t("promo.lockedPreviewLabel", { label: t("coach.free.proLockedEyebrow") })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------
// Visitor advert — invite the viewer to build their own DT dossier.
// ---------------------------------------------------------------

function CoachPromo({ side, t }: { side: "left" | "right"; t: SlotT }) {
  const textOrder = side === "left" ? "md:order-2" : "md:order-1";
  const visualOrder = side === "left" ? "md:order-1" : "md:order-2";

  return (
    <section className="border-t border-white/[0.10] px-5 py-7 md:px-10 md:py-12">
      <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 items-center gap-5 md:grid-cols-2 md:gap-9">
        <div className={`space-y-3.5 ${textOrder}`}>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-bh-lime/40 bg-bh-lime/10 px-2.5 py-1 font-body text-[10px] font-bold uppercase tracking-[0.14em] text-bh-lime">
            <Sparkles size={11} /> {t("coach.free.proPromoEyebrow", { brand: "BallersHub" })}
          </div>
          <h3 className="font-bh-display text-[32px] font-black uppercase leading-[0.95] text-bh-fg-1 md:text-5xl">
            {t("coach.free.proPromoTitleA")}
            <br />
            <span className="italic text-bh-lime">{t("coach.free.proPromoTitleB")}</span>
          </h3>
          <p className="max-w-[460px] font-body text-[13px] leading-[1.6] text-bh-fg-2 md:text-sm">
            {t("coach.free.proPromoCopy")}
          </p>
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <Link
              href="/onboarding/start"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-bh-lime px-5 py-2.5 font-body text-sm font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26]"
            >
              {t("coach.free.proPromoPrimary")}
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/pricing?audience=coach&currency=ARS"
              className="inline-flex items-center justify-center rounded-full border border-white/[0.16] px-5 py-2.5 font-body text-sm font-semibold text-bh-fg-1 transition-colors hover:border-white/[0.32]"
            >
              {t("coach.free.proPromoSecondary")}
            </Link>
          </div>
        </div>

        <div
          className={`relative h-[220px] overflow-hidden rounded-xl border border-white/[0.10] bg-bh-surface-1 md:h-[260px] ${visualOrder}`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: "radial-gradient(80% 70% at 50% 0%, rgba(204,255,0,0.16) 0%, transparent 70%)",
            }}
          />
          <div className="relative h-full w-full">
            <CoachProfileMock t={t} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------
// Visual mocks — brand vignettes (visual-only, no real data).
// ---------------------------------------------------------------

function TacticsPreview({ t }: { t: SlotT }) {
  return (
    <div className="flex h-full w-full gap-4 p-5">
      <div
        className="relative flex-1 rounded-lg border border-bh-lime/20"
        style={{ background: "radial-gradient(ellipse at center, #1A4A1F 0%, #0A1A0E 80%)" }}
      >
        <div className="absolute inset-3 rounded border-2 border-white/30" />
        <div className="absolute bottom-3 left-1/2 top-3 w-px bg-white/30" />
        <div className="absolute left-1/2 top-1/2 -ml-7 -mt-7 h-14 w-14 rounded-full border-2 border-white/30" />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {[
          t("coach.free.previewStyle"),
          t("coach.free.previewMethod"),
          t("coach.free.previewRecord"),
          t("coach.free.previewGallery"),
        ].map((s) => (
          <div
            key={s}
            className="rounded border border-white/[0.08] bg-bh-surface-2 px-3 py-2.5 font-bh-display text-sm font-bold uppercase tracking-[0.04em] text-bh-fg-1"
          >
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

function CoachProfileMock({ t }: { t: SlotT }) {
  return (
    <div className="flex h-full w-full items-center justify-center p-5">
      <div className="w-full max-w-[280px] rounded-xl border border-white/[0.10] bg-bh-black/40 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div
            className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-bh-surface-2 to-bh-surface-1"
            style={{ boxShadow: "0 0 0 2px #080808, 0 0 0 3px #CCFF00" }}
          />
          <div className="min-w-0 flex-1">
            <div className="h-2.5 w-2/3 rounded-full bg-white/25" />
            <div className="mt-1.5 h-2 w-1/2 rounded-full bg-bh-lime/60" />
          </div>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-bh-lime/15 text-bh-lime">
            <BadgeCheck size={13} />
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded bg-bh-lime px-2 py-0.5 font-bh-display text-[10px] font-extrabold uppercase tracking-[0.06em] text-bh-black">
            DT
          </span>
          <span className="rounded bg-white/[0.08] px-2 py-0.5 font-bh-mono text-[10px] uppercase tracking-[0.08em] text-bh-fg-3">
            4-3-3
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {[t("coach.abbrMatches"), t("coach.abbrWins"), t("coach.abbrWinRate")].map((k) => (
            <div key={k} className="rounded border border-white/[0.06] bg-white/[0.03] py-1.5 text-center">
              <div className="font-bh-display text-sm font-black leading-none text-bh-fg-1">··</div>
              <div className="mt-1 font-body text-[8px] uppercase tracking-[0.12em] text-bh-fg-3">{k}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 font-bh-mono text-[9px] uppercase tracking-[0.14em] text-bh-fg-3">
          <Check size={10} className="text-bh-lime" />
          {t("coach.free.proPromoMockLabel")}
        </div>
      </div>
    </div>
  );
}
