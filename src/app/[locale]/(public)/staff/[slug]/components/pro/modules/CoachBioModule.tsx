"use client";

// Pro coach — Biography module (#biography). Re-developed to the player's level:
// a magnetic 3D-tilt "BIO" card (useMotionValue + useSpring rotation + a radial
// glow that follows the cursor), a `BlockReveal` on the coach name, a
// `ScrambleText` on the role title, and a staggered grid of hard facts — adapted
// to coach data (role, preferred formations, current club, coaching-since,
// nationality flags, languages / education / residence + a branded social row).
//
// Reuses the player's agnostic atoms TAL CUAL: `BioAnimatedBackground` (themed
// via the --theme-* CSS vars the Pro layout sets), `BlockReveal`, `ScrambleText`,
// `CountryFlag`, and the branded social icons. Ideas de juego (playingStyle) and
// the formation diagrams live in the Tactics module by owner decision — this
// module owns the narrative bio + the identity card.
//
// Renders nothing when there is no bio AND no card-worthy facts.

import * as React from "react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
  type Variants,
} from "framer-motion";
import { useLocale, useTranslations } from "next-intl";

import { Section } from "./_shared";
import BioAnimatedBackground from "@/app/[locale]/(public)/[slug]/components/modules/BioAnimatedBackground";
import { BlockReveal } from "@/components/common/animations/BlockReveal";
import { ScrambleText } from "@/components/common/animations/ScrambleText";
import CountryFlag from "@/components/common/CountryFlag";
import { localizeLanguages } from "@/lib/i18n/player-languages";
import type { Locale } from "@/i18n/routing";
import type { CoachLinkRow, CoachPersonalDetailsData } from "../../CoachPortfolio";

import TransfermarktIcon from "@/components/icons/TransfermarktIcon";
import BeSoccerIcon from "@/components/icons/BeSoccerIcon";
import { Instagram } from "@/components/icons/InstagramIcon";
import { LinkedIn } from "@/components/icons/LinkedInIcon";
import { Youtube, Globe, Twitter } from "lucide-react";

// ── Props ────────────────────────────────────────────────────────────────────
// Richer slice than the F0 contract's `{ bio, accent }` — the wrapper
// (CoachProContent) must pass the extra fields. They are all optional with safe
// fallbacks, so the module still compiles/renders if the wrapper hasn't been
// updated yet (it just shows the bare bio in that case). INTEGRATOR: pass
// fullName, roleTitle, avatarUrl, nationalityCodes, currentClub, coachingSince,
// preferredFormations, personalDetails and links from CoachProData.
export type CoachBioModuleProps = {
  bio: string | null;
  accent: string;
  fullName?: string;
  roleTitle?: string | null;
  avatarUrl?: string | null;
  nationalityCodes?: string[] | null;
  currentClub?: string | null;
  coachingSince?: number | null;
  preferredFormations?: string[] | null;
  personalDetails?: CoachPersonalDetailsData | null;
  links?: CoachLinkRow[];
};

const itemVariant: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

// ── Branded social chip helpers ──────────────────────────────────────────────
type SocialDef = {
  match: (kind: string) => boolean;
  label: string;
  border: string;
  text: string;
  hover: string;
  icon: React.ReactNode;
};

const SOCIALS: SocialDef[] = [
  {
    match: (k) => k === "transfermarkt",
    label: "Transfermarkt",
    border: "border-[#1a3151]",
    text: "text-[#6b9ae6]",
    hover: "hover:bg-[#1a3151] hover:text-white",
    icon: <TransfermarktIcon />,
  },
  {
    match: (k) => k === "besoccer",
    label: "BeSoccer",
    border: "border-[#009e1e]/40",
    text: "text-[#009e1e]",
    hover: "hover:bg-[#009e1e] hover:text-white",
    icon: <BeSoccerIcon className="w-full h-full" />,
  },
  {
    match: (k) => k === "instagram",
    label: "Instagram",
    border: "border-[#E1306C]/40",
    text: "text-[#E1306C]",
    hover: "hover:bg-[#E1306C] hover:text-white",
    icon: <Instagram className="w-full h-full" />,
  },
  {
    match: (k) => k === "linkedin",
    label: "LinkedIn",
    border: "border-[#0A66C2]/40",
    text: "text-[#0A66C2]",
    hover: "hover:bg-[#0A66C2] hover:text-white",
    icon: <LinkedIn className="w-full h-full" fill="currentColor" />,
  },
  {
    match: (k) => k === "youtube",
    label: "YouTube",
    border: "border-[#FF0000]/40",
    text: "text-[#FF0000]",
    hover: "hover:bg-[#FF0000] hover:text-white",
    icon: <Youtube className="w-full h-full" />,
  },
  {
    match: (k) => k === "x" || k === "twitter",
    label: "X",
    border: "border-white/25",
    text: "text-white/85",
    hover: "hover:bg-white hover:text-black",
    icon: <Twitter className="w-full h-full" />,
  },
  {
    match: (k) => k === "website" || k === "web" || k === "site",
    label: "Web",
    border: "border-white/20",
    text: "text-white/70",
    hover: "hover:bg-white hover:text-black",
    icon: <Globe className="w-full h-full" />,
  },
];

// ── Module ────────────────────────────────────────────────────────────────────
export default function CoachBioModule({
  bio,
  accent,
  fullName,
  roleTitle,
  avatarUrl,
  nationalityCodes,
  currentClub,
  coachingSince,
  preferredFormations,
  personalDetails,
  links,
}: CoachBioModuleProps) {
  const t = useTranslations("portfolio");
  const locale = useLocale() as Locale;

  const codes = nationalityCodes ?? [];
  const formations = (preferredFormations ?? []).filter(Boolean);
  const languages = localizeLanguages(personalDetails?.languages ?? null, locale);
  const education = personalDetails?.education?.trim() || null;
  const residence =
    personalDetails?.residenceCity || personalDetails?.residenceCountry
      ? `${personalDetails?.residenceCity || "—"}${
          personalDetails?.residenceCountry ? `, ${personalDetails.residenceCountry}` : ""
        }`
      : null;

  // Branded social chips, deduped per kind, in the SOCIALS order.
  const socialChips = React.useMemo(() => {
    const seen = new Set<string>();
    const out: { def: SocialDef; url: string }[] = [];
    for (const def of SOCIALS) {
      const hit = (links ?? []).find((l) => {
        const k = l.kind?.trim().toLowerCase();
        return k ? def.match(k) && !seen.has(k) : false;
      });
      if (hit?.url) {
        seen.add(hit.kind.trim().toLowerCase());
        out.push({ def, url: hit.url });
      }
    }
    return out;
  }, [links]);

  // ── 3D tilt + radial glow (cloned from the player BioClientCard) ───────────
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);
  const mouseXAbs = useMotionValue(50);
  const mouseYAbs = useMotionValue(50);
  const bgGradient = useMotionTemplate`radial-gradient(circle at ${mouseXAbs}% ${mouseYAbs}%, color-mix(in srgb, var(--theme-primary) 15%, transparent) 0%, transparent 60%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    x.set(mx / rect.width - 0.5);
    y.set(my / rect.height - 0.5);
    mouseXAbs.set((mx / rect.width) * 100);
    mouseYAbs.set((my / rect.height) * 100);
  };
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    mouseXAbs.set(50);
    mouseYAbs.set(50);
  };

  // Does the identity card have anything worth showing?
  const hasCardFacts =
    !!currentClub ||
    !!coachingSince ||
    formations.length > 0 ||
    languages.length > 0 ||
    !!education ||
    !!residence;

  if (!bio && !hasCardFacts) return null;

  const name = fullName?.trim() || "";
  const role = roleTitle?.trim() || t("coach.bioTitle");

  return (
    <div className="relative">
      <BioAnimatedBackground />

      <div className="relative z-10">
        <Section id="biography" title={t("coach.bioTitle")} accent={accent}>
          <div className="flex w-full flex-col items-start gap-12 lg:flex-row lg:gap-16">
            {/* ── PRESENTATION (left) ─────────────────────────────────────── */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
              }}
              className="flex w-full flex-col space-y-6 lg:w-5/12"
            >
              {name && (
                <motion.div variants={itemVariant} className="flex items-center gap-4 md:gap-6">
                  {avatarUrl && (
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-white/10 md:h-32 md:w-32">
                      <Image
                        src={avatarUrl}
                        alt={name}
                        fill
                        unoptimized
                        sizes="128px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <BlockReveal blockColor="var(--theme-primary)" delay={0.1}>
                      <h3 className="pb-1 font-bh-heading text-2xl font-black uppercase leading-[0.9] text-white md:text-5xl">
                        {name
                          .split(" ")
                          .map((part: string, i: number) => (
                            <React.Fragment key={i}>
                              {part}
                              <br />
                            </React.Fragment>
                          ))}
                      </h3>
                    </BlockReveal>

                    <div className="mt-3 flex items-center gap-3 md:mt-4">
                      <span className="font-bh-display text-xs font-bold uppercase tracking-widest text-white/60 md:text-sm">
                        <ScrambleText text={role} delay={0.3} />
                      </span>
                      {codes.length > 0 && (
                        <div className="flex items-center gap-2 border-l border-white/20 pl-3">
                          {codes.slice(0, 3).map((code, i) => (
                            <CountryFlag
                              key={i}
                              code={code}
                              className="h-5 w-5 rounded-sm object-cover"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Branded social chips */}
              {socialChips.length > 0 && (
                <motion.div variants={itemVariant} className="mt-2 flex w-full flex-wrap gap-2">
                  {socialChips.map(({ def, url }) => (
                    <a
                      key={def.label}
                      href={url}
                      target="_blank"
                      rel="noreferrer nofollow"
                      className={`group flex items-center gap-1.5 rounded-full border ${def.border} ${def.text} bg-black/40 px-3 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all ${def.hover}`}
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-current">
                        {def.icon}
                      </span>
                      <span className="font-bh-display text-[10px] font-bold uppercase tracking-widest">
                        {def.label}
                      </span>
                    </a>
                  ))}
                </motion.div>
              )}

              {/* Bio eyebrow rule */}
              <motion.div variants={itemVariant} className="mb-4 mt-4 flex items-center gap-4">
                <h4
                  className="shrink-0 whitespace-nowrap font-bh-display text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: "var(--theme-accent)" }}
                >
                  <ScrambleText text={t("bioCard.mindsetBio")} delay={0.1} />
                </h4>
                <div
                  className="h-px w-full"
                  style={{ background: "color-mix(in srgb, var(--theme-primary) 50%, transparent)" }}
                />
              </motion.div>

              {/* Narrative bio */}
              <motion.div variants={itemVariant}>
                <p className="block max-w-lg whitespace-pre-line font-bh-mono text-sm leading-relaxed text-white/80 md:text-base">
                  {bio || t("bioCard.bioFallback")}
                </p>
              </motion.div>
            </motion.div>

            {/* ── IDENTITY CARD (right, 3D tilt) ──────────────────────────── */}
            {hasCardFacts && (
              <div className="perspective-1000 w-full lg:w-7/12">
                <motion.div
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d",
                    border: "1px solid color-mix(in srgb, var(--theme-primary) 40%, transparent)",
                  }}
                  className="relative min-h-[360px] w-full overflow-hidden rounded-[2.5rem] bg-neutral-900/40 shadow-2xl backdrop-blur-[20px]"
                >
                  {/* Cursor-tracking flare */}
                  <motion.div
                    className="pointer-events-none absolute inset-0 z-0 mix-blend-screen"
                    style={{ background: bgGradient }}
                  />

                  <div
                    className="relative z-20 flex h-full flex-col justify-between p-6 md:p-14"
                    style={{ transform: "translateZ(30px)" }}
                  >
                    <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:gap-x-8 md:gap-y-12">
                      {/* Club actual */}
                      <div
                        className="col-span-2 border-l-[3px] pl-4 md:col-span-1 md:pl-5"
                        style={{
                          borderColor: "color-mix(in srgb, var(--theme-primary) 40%, transparent)",
                        }}
                      >
                        <span
                          className="mb-1 block font-bh-display text-[10px] font-black uppercase tracking-[0.2em] md:mb-2 md:text-[11px]"
                          style={{ color: "var(--theme-accent)" }}
                        >
                          <ScrambleText text={t("bioCard.club")} delay={0.2} />
                        </span>
                        <span className="block break-words text-base font-bold uppercase leading-tight text-white md:text-2xl">
                          <ScrambleText
                            text={currentClub || t("bioCard.freeAgent")}
                            delay={0.45}
                          />
                        </span>
                      </div>

                      {/* Dirige desde (coaching since) */}
                      {coachingSince && (
                        <div
                          className="border-l-[3px] pl-4 md:pl-5"
                          style={{
                            borderColor:
                              "color-mix(in srgb, var(--theme-primary) 40%, transparent)",
                          }}
                        >
                          <span
                            className="mb-1 block font-bh-display text-[10px] font-black uppercase tracking-[0.2em] md:mb-2 md:text-[11px]"
                            style={{ color: "var(--theme-accent)" }}
                          >
                            <ScrambleText text={t("coach.careerTitle")} delay={0.25} />
                          </span>
                          <span className="text-2xl font-black leading-none text-white md:text-4xl">
                            <ScrambleText text={String(coachingSince)} delay={0.4} />
                          </span>
                          <span className="mt-1 block text-xs uppercase tracking-widest text-white/60 md:mt-2 md:text-sm">
                            <ScrambleText text={t("coach.since", { year: coachingSince })} delay={0.5} />
                          </span>
                        </div>
                      )}

                      {/* Nacionalidad / pasaporte */}
                      {codes.length > 0 && (
                        <div
                          className="border-l-[3px] pl-4 md:pl-5"
                          style={{
                            borderColor:
                              "color-mix(in srgb, var(--theme-primary) 40%, transparent)",
                          }}
                        >
                          <span
                            className="mb-1 block font-bh-display text-[10px] font-black uppercase tracking-[0.2em] md:mb-2 md:text-[11px]"
                            style={{ color: "var(--theme-accent)" }}
                          >
                            <ScrambleText text={t("bioCard.passport")} delay={0.3} />
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            {codes.map((code, i) => (
                              <CountryFlag
                                key={i}
                                code={code}
                                className="h-4 w-6 rounded-sm object-cover drop-shadow-md md:h-6 md:w-9"
                              />
                            ))}
                          </div>
                          {residence && (
                            <div className="mt-3 block text-[10px] font-light uppercase leading-tight tracking-widest text-white/50 md:text-xs">
                              <ScrambleText text={t("bioCard.residence")} delay={0.4} />
                              <span className="mt-1 block text-sm font-black text-white drop-shadow-md md:text-base">
                                <ScrambleText text={residence} delay={0.6} />
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Formaciones preferidas (chips) */}
                      {formations.length > 0 && (
                        <div
                          className="col-span-2 border-l-[3px] pl-4 md:pl-5"
                          style={{
                            borderColor:
                              "color-mix(in srgb, var(--theme-primary) 40%, transparent)",
                          }}
                        >
                          <span
                            className="mb-2 block font-bh-display text-[10px] font-black uppercase tracking-[0.2em] md:text-[11px]"
                            style={{ color: "var(--theme-accent)" }}
                          >
                            <ScrambleText text={t("coach.formationsTitle")} delay={0.35} />
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {formations.map((f) => (
                              <span
                                key={f}
                                className="rounded-full border px-3 py-1 font-bh-mono text-sm font-semibold tabular-nums text-white"
                                style={{
                                  borderColor:
                                    "color-mix(in srgb, var(--theme-accent) 45%, transparent)",
                                  backgroundColor:
                                    "color-mix(in srgb, var(--theme-accent) 12%, transparent)",
                                }}
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Idiomas */}
                      {languages.length > 0 && (
                        <div
                          className="border-l-[3px] pl-4 md:pl-5"
                          style={{
                            borderColor:
                              "color-mix(in srgb, var(--theme-primary) 40%, transparent)",
                          }}
                        >
                          <span
                            className="mb-1 block font-bh-display text-[10px] font-black uppercase tracking-[0.2em] md:mb-2 md:text-[11px]"
                            style={{ color: "var(--theme-accent)" }}
                          >
                            <ScrambleText text={t("bioCard.languages")} delay={0.4} />
                          </span>
                          <span className="block break-words text-sm font-bold uppercase leading-tight tracking-widest text-white md:text-xl">
                            <ScrambleText text={languages.join(", ")} delay={0.6} />
                          </span>
                        </div>
                      )}

                      {/* Formación / estudios */}
                      {education && (
                        <div
                          className="border-l-[3px] pl-4 md:pl-5"
                          style={{
                            borderColor:
                              "color-mix(in srgb, var(--theme-primary) 40%, transparent)",
                          }}
                        >
                          <span
                            className="mb-1 block font-bh-display text-[10px] font-black uppercase tracking-[0.2em] md:mb-2 md:text-[11px]"
                            style={{ color: "var(--theme-accent)" }}
                          >
                            <ScrambleText text={t("bioCard.education")} delay={0.45} />
                          </span>
                          <span className="block break-words text-sm font-bold uppercase leading-tight tracking-widest text-white md:text-xl">
                            <ScrambleText text={education} delay={0.7} />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Watermark */}
                  <div
                    className="pointer-events-none absolute right-8 top-6 select-none font-bh-heading text-8xl font-black text-white/[0.03]"
                    style={{ transform: "translateZ(-10px)" }}
                  >
                    <ScrambleText text="BIO" delay={0.2} />
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
