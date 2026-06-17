"use client";

// The scrolling body of the Pro coach portfolio. Receives the already-loaded
// coach data as props (the page fetches it once) and renders the sections with
// the same visual language as the player Pro modules — framer-motion reveals,
// a scroll-jacked methodology block, timeline, gallery — adapted to coach data.

import * as React from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslations } from "next-intl";
import type { CoachProData } from "./ProCoachLayout";

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

export default function CoachProContent({ data, accent }: { data: CoachProData; accent: string }) {
  const t = useTranslations("portfolio");

  return (
    <>
      {/* ---------- Biografía / ideas / formaciones ---------- */}
      {(data.bio || data.playingStyle || (data.preferredFormations?.length ?? 0) > 0) && (
        <Section id="biography" title={t("coach.bioTitle")} accent={accent}>
          <div className="grid gap-8 md:grid-cols-2">
            {data.bio && (
              <Reveal className="space-y-3">
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-white/80">{data.bio}</p>
              </Reveal>
            )}
            {data.playingStyle && (
              <Reveal className="space-y-3">
                <SubLabel accent={accent}>{t("coach.playingStyleTitle")}</SubLabel>
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-white/80">{data.playingStyle}</p>
              </Reveal>
            )}
          </div>
          {data.preferredFormations && data.preferredFormations.length > 0 && (
            <Reveal className="mt-8 space-y-3">
              <SubLabel accent={accent}>{t("coach.formationsTitle")}</SubLabel>
              <div className="flex flex-wrap gap-2">
                {data.preferredFormations.map((f) => (
                  <span
                    key={f}
                    className="rounded-full border px-4 py-1.5 text-sm font-bold tabular-nums"
                    style={{ borderColor: `${accent}55`, color: accent, backgroundColor: `${accent}10` }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </Reveal>
          )}
        </Section>
      )}

      {/* ---------- Trayectoria + estadísticas ---------- */}
      {(data.career.length > 0 || data.stats.length > 0) && (
        <Section id="career" title={t("coach.careerTitle")} accent={accent}>
          {data.career.length > 0 && (
            <ol className="relative space-y-0 border-l border-white/10 pl-6">
              {data.career.map((c) => (
                <Reveal as="li" key={c.id} className="relative pb-8 last:pb-0">
                  <span
                    className="absolute -left-[1.6rem] top-1.5 h-3 w-3 rounded-full border-2"
                    style={{ borderColor: accent, backgroundColor: "var(--theme-background)" }}
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-bh-display text-lg font-bold text-white">{c.club}</span>
                      {c.roleTitle && <span className="text-sm text-white/60">· {c.roleTitle}</span>}
                      {c.division && <span className="text-xs text-white/40">· {c.division}</span>}
                    </span>
                    <span className="font-bh-mono text-xs tabular-nums text-white/50">
                      {c.startYear ?? "?"}–{c.endYear ?? t("coach.present")}
                    </span>
                  </div>
                </Reveal>
              ))}
            </ol>
          )}

          {data.stats.length > 0 && (
            <Reveal className="mt-10 overflow-x-auto">
              <p className="mb-3 font-bh-display text-xs font-bold uppercase tracking-[0.12em] text-white/40">
                {t("coach.statsTitle")}
              </p>
              <table className="w-full min-w-[440px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-[0.06em] text-white/40">
                    <th className="py-2 pr-3 font-semibold">{t("coach.seasonLabel")}</th>
                    <th className="px-2 py-2 text-center font-semibold">{t("coach.abbrMatches")}</th>
                    <th className="px-2 py-2 text-center font-semibold">{t("coach.abbrWins")}</th>
                    <th className="px-2 py-2 text-center font-semibold">{t("coach.abbrDraws")}</th>
                    <th className="px-2 py-2 text-center font-semibold">{t("coach.abbrLosses")}</th>
                    <th className="px-2 py-2 text-center font-semibold">{t("coach.abbrWinRate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stats.map((s) => (
                    <tr key={s.id} className="border-b border-white/[0.06]">
                      <td className="py-2 pr-3">
                        <span className="font-semibold text-white">{s.season}</span>
                        {s.team && <span className="text-white/40"> · {s.team}</span>}
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums text-white/70">{s.matches}</td>
                      <td className="px-2 py-2 text-center tabular-nums text-white/70">{s.wins}</td>
                      <td className="px-2 py-2 text-center tabular-nums text-white/70">{s.draws}</td>
                      <td className="px-2 py-2 text-center tabular-nums text-white/70">{s.losses}</td>
                      <td className="px-2 py-2 text-center font-semibold tabular-nums" style={{ color: accent }}>
                        {pct(s.wins, s.matches)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Reveal>
          )}
        </Section>
      )}

      {/* ---------- Metodología (scroll-jacked) ---------- */}
      {data.methodologyAnalysis && (
        <MethodologyScrollJack
          title={t("coach.methodologyTitle")}
          body={data.methodologyAnalysis}
          accent={accent}
        />
      )}

      {/* ---------- Licencias + palmarés ---------- */}
      {(data.licenses.length > 0 || data.honours.length > 0) && (
        <Section id="honours" title={t("coach.honoursTitle")} accent={accent}>
          {data.licenses.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.licenses.map((l) => (
                <Reveal
                  key={l.id}
                  className="rounded-2xl border p-4"
                  style={{ borderColor: `${accent}40`, backgroundColor: `${accent}0a` }}
                >
                  <div className="flex items-center gap-2">
                    <span aria-hidden style={{ color: accent }}>✓</span>
                    <span className="font-bh-display text-sm font-bold text-white">{l.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/50">
                    {[l.issuer, l.year].filter(Boolean).join(" · ")}
                    <span className="ml-1 text-white/30">· {t("coach.verified")}</span>
                  </p>
                </Reveal>
              ))}
            </div>
          )}
          {data.honours.length > 0 && (
            <ul className="mt-6 space-y-2">
              {data.honours.map((h) => (
                <Reveal as="li" key={h.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-semibold text-white">{h.title}</span>
                  {(h.competition || h.season) && (
                    <span className="text-white/40">· {[h.competition, h.season].filter(Boolean).join(" · ")}</span>
                  )}
                </Reveal>
              ))}
            </ul>
          )}
        </Section>
      )}

      {/* ---------- Multimedia ---------- */}
      {data.media.length > 0 && (
        <Section id="media" title={t("coach.mediaTitle")} accent={accent}>
          {(() => {
            const photos = data.media.filter((m) => m.type === "photo");
            const videos = data.media.filter((m) => m.type === "video");
            return (
              <>
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {photos.map((m) => (
                      <Reveal
                        key={m.id}
                        className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10"
                      >
                        <Image src={m.url} alt={m.title ?? data.fullName} fill sizes="(max-width:640px) 50vw, 320px" className="object-cover" unoptimized />
                      </Reveal>
                    ))}
                  </div>
                )}
                {videos.length > 0 && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {videos.map((m) => (
                      <a
                        key={m.id}
                        href={m.url}
                        target="_blank"
                        rel="noreferrer nofollow"
                        className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70 transition-colors hover:border-white/30 hover:text-white"
                      >
                        <span aria-hidden style={{ color: accent }}>▶</span>
                        <span className="truncate">{m.title || t("coach.videoFallback")}</span>
                      </a>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </Section>
      )}

      {/* ---------- Contacto / enlaces ---------- */}
      <Section id="contact" title={t("coach.contactTitle")} accent={accent}>
        {data.links.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {data.links.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noreferrer nofollow"
                className="rounded-full border border-white/15 bg-white/[0.03] px-5 py-2.5 text-sm text-white/80 transition-colors hover:border-white/30 hover:text-white"
              >
                {l.label || l.kind}
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/40">{t("coach.footerVerified")}</p>
        )}
      </Section>
    </>
  );
}

// ─────────────────────────── helpers ───────────────────────────

function Section({
  id,
  title,
  accent,
  children,
}: {
  id: string;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <Reveal className="mb-8 flex items-center gap-4">
        <span className="h-px w-10" style={{ backgroundColor: accent }} />
        <h2 className="font-bh-display text-xs font-bold uppercase tracking-[0.18em] text-white/50">{title}</h2>
      </Reveal>
      {children}
    </section>
  );
}

function SubLabel({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <p className="font-bh-display text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>
      {children}
    </p>
  );
}

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: "div" | "li";
};
function Reveal({ children, className, style, as = "div" }: RevealProps) {
  const MotionTag = as === "li" ? motion.li : motion.div;
  return (
    <MotionTag
      className={className}
      style={style}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </MotionTag>
  );
}

// Scroll-jacked methodology block — mirrors the player Tactics module idea:
// a 200vh container with a pinned 100vh panel; the title scales/fades and the
// body text reveals as the section scrolls through the viewport.
function MethodologyScrollJack({ title, body, accent }: { title: string; body: string; accent: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const titleScale = useTransform(scrollYProgress, [0, 0.4], [1.15, 0.85]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.25, 0.9, 1], [0.25, 1, 1, 0.4]);
  const bodyOpacity = useTransform(scrollYProgress, [0.2, 0.45], [0, 1]);
  const bodyY = useTransform(scrollYProgress, [0.2, 0.6], [60, 0]);
  const lineWidth = useTransform(scrollYProgress, [0.1, 0.85], ["0%", "100%"]);

  return (
    <section id="methodology" ref={ref} className="relative h-[200vh] scroll-mt-28">
      <div className="sticky top-0 flex h-screen w-full flex-col items-center justify-center overflow-hidden">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[160px] opacity-15"
          style={{ backgroundColor: accent }}
        />
        <motion.h2
          style={{ scale: titleScale, opacity: titleOpacity }}
          className="max-w-full px-4 text-center font-heading text-[10vw] font-black uppercase leading-none tracking-tighter text-transparent md:text-[8vw]"
        >
          <span style={{ WebkitTextStroke: `1.5px ${accent}`, paintOrder: "stroke fill" }}>{title}</span>
        </motion.h2>
        <motion.div style={{ height: 2, width: lineWidth, backgroundColor: accent }} className="my-6 max-w-[600px]" />
        <motion.p
          style={{ opacity: bodyOpacity, y: bodyY }}
          className="max-w-2xl whitespace-pre-line px-6 text-center text-[15px] leading-relaxed text-white/80 md:text-lg"
        >
          {body}
        </motion.p>
      </div>
    </section>
  );
}
