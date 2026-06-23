"use client";

// Simple, static mobile version of ¿Cómo validamos? — the desktop scrolljack
// (ValidationFlow) is overwhelming on phones and its sticky stage collided with
// the floating bottom nav. On mobile we render a clean, scannable vertical
// timeline of the 6 steps + an outro CTA, with bottom padding that clears the
// dock. Rendered `md:hidden`; the scrolljack is `hidden md:block`.

import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";

import { Link } from "@/i18n/navigation";

import { StepIcon } from "./StepIcon";
import { AGENTS, SOURCES, STEPS } from "./steps";

const cvar = (c: string): CSSProperties => ({ ["--c" as string]: c }) as CSSProperties;

export default function ValidationFlowMobile() {
  const t = useTranslations("comoValidamos");
  return (
    <div className="mx-auto w-full max-w-[560px] px-5 pb-12 pt-28 md:hidden">
      {/* Hero */}
      <p className="font-bh-mono text-[11px] uppercase tracking-[0.18em] text-bh-fg-3">
        {t("header.eyebrow")}
      </p>
      <h1 className="mt-3 font-bh-display text-[2.4rem] font-extrabold uppercase leading-[0.95] tracking-[-0.01em] text-bh-fg-1">
        ¿{t("header.titleLead")} <span className="text-bh-lime">{t("header.titleHl")}</span>?
      </h1>
      <p className="mt-4 text-[14px] leading-relaxed text-bh-fg-2">{t("header.introMobile")}</p>

      {/* Timeline */}
      <ol className="mt-9">
        {STEPS.map((st, i) => {
          const last = i === STEPS.length - 1;
          return (
            <li key={st.id} className="relative flex gap-4 pb-7 last:pb-0" style={cvar(st.color)}>
              {!last && (
                <span
                  aria-hidden
                  className="absolute bottom-0 left-[23px] top-[52px] w-px bg-white/[0.10]"
                />
              )}
              <span
                className="relative z-[1] flex size-12 shrink-0 items-center justify-center rounded-bh-lg border"
                style={{ borderColor: `${st.color}55`, background: `${st.color}14`, color: st.color }}
              >
                <StepIcon name={st.icon} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="font-bh-mono text-[10px] uppercase tracking-[0.14em] text-bh-fg-4">
                  {t("stepLabel", { tag: st.tag })}
                </div>
                <h3 className="mt-1 font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
                  {t(`steps.${i}.title`)}
                </h3>
                <p className="mt-0.5 text-[13px] text-bh-fg-3">{t(`steps.${i}.sub`)}</p>

                {st.branch === "sources" && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {SOURCES.map((s) => (
                      <span
                        key={s.abbr}
                        className="inline-flex items-center rounded-bh-pill border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-bh-fg-2"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                )}

                {st.branch === "agents" && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {AGENTS.map((a) => {
                      const Icon = a.Icon;
                      return (
                        <span
                          key={a.name}
                          className="inline-flex items-center gap-1.5 rounded-bh-pill border border-bh-blue/30 bg-bh-blue/[0.08] px-2.5 py-1 text-[11px] text-bh-fg-2"
                        >
                          <Icon className="size-4" aria-hidden />
                          {a.name}
                          <span className="font-semibold text-bh-blue">{a.conf}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Outro CTA */}
      <div className="mt-10 rounded-bh-xl border border-white/[0.08] bg-bh-surface-1 p-6 text-center">
        <h2 className="font-bh-display text-2xl font-bold uppercase leading-tight tracking-[-0.01em] text-bh-fg-1">
          {t("outro.titleLead")} <span className="text-bh-lime">{t("outro.titleHl")}</span>
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-bh-fg-3">{t("cta.body")}</p>
        <div className="mt-5 flex flex-col gap-2.5">
          <Link
            href="/auth/sign-up"
            className="flex h-12 items-center justify-center rounded-bh-md bg-bh-lime text-[14px] font-semibold text-bh-black transition-colors hover:bg-[#d8ff26]"
          >
            {t("cta.primary")}
          </Link>
          <Link
            href="/players"
            className="flex h-12 items-center justify-center rounded-bh-md border border-white/[0.14] text-[14px] font-semibold text-bh-fg-2 transition-colors hover:bg-white/[0.06] hover:text-bh-fg-1"
          >
            {t("cta.secondary")}
          </Link>
        </div>
      </div>
    </div>
  );
}
