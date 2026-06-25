"use client";

// Premium Pro coach portfolio — a copy of the player ProAthleteLayout's
// cinematic hero (atmosphere + parallax name sandwich + ghost trails + marquee)
// adapted for coaches: the middle layer is the coach's hero cutout when present,
// otherwise a framed avatar; a record stats-strip replaces the player metadata.
// Brand colors are used directly (coaches have no per-profile theme yet).

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslations } from "next-intl";
import CountUp from "@/components/ui/CountUp";
import ProCoachHeader from "./ProCoachHeader";
import CoachProContent from "./CoachProContent";
import type {
  CoachCareerRow,
  CoachStatRow,
  CoachRecord,
  CoachHonourRow,
  CoachLicenseRow,
  CoachMediaRow,
  CoachLinkRow,
  CoachArticleRow,
  CoachPersonalDetailsData,
} from "../CoachPortfolio";
import type { StaffRoleType } from "@/lib/staff/roles";

export type CoachProData = {
  fullName: string;
  slug: string;
  roleTitle: string | null;
  // Roles estructurados del staff (label combinado ya resuelto en el server).
  primaryRole: StaffRoleType | null;
  secondaryRoles: StaffRoleType[] | null;
  roleDisplay: string | null;
  // false sólo para oficios NO-DT conocidos → oculta el módulo de tácticas
  // (ideas de juego). null/legacy → true. Ver src/lib/staff/roles.ts.
  showTactical: boolean;
  avatarUrl: string;
  heroUrl: string | null;
  nationality: string[] | null;
  nationalityCodes: string[] | null;
  currentClub: string | null;
  coachingSince: number | null;
  bio: string | null;
  playingStyle: string | null;
  methodologyAnalysis: string | null;
  preferredFormations: string[] | null;
  career: CoachCareerRow[];
  stats: CoachStatRow[];
  record: CoachRecord | null;
  honours: CoachHonourRow[];
  licenses: CoachLicenseRow[];
  media: CoachMediaRow[];
  links: CoachLinkRow[];
  // Press notes (coach_articles). Rendered only when length > 0.
  articles: CoachArticleRow[];
  // coach_personal_details (drives the Pro contact module). NULL when absent.
  personalDetails: CoachPersonalDetailsData | null;
  // Coach owner's auth email (resolved server-side). NULL when unavailable.
  ownerEmail: string | null;
  localeSwitch?: { available: string[]; current: string; basePath: string };
  // Pro-layout theme (chosen by the coach). NULL → brand defaults.
  themePrimaryColor: string | null;
  themeAccentColor: string | null;
  themeBackgroundColor: string | null;
};

export default function ProCoachLayout({ data }: { data: CoachProData }) {
  const t = useTranslations("portfolio");
  const ACCENT = data.themeAccentColor || "#ccff00";
  const PRIMARY = data.themePrimaryColor || ACCENT;
  const BG = data.themeBackgroundColor || "#050505";
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const trailY1 = useTransform(scrollYProgress, [0, 1], ["0%", "150%"]);
  const trailY2 = useTransform(scrollYProgress, [0, 1], ["0%", "300%"]);
  const trailY3 = useTransform(scrollYProgress, [0, 1], ["0%", "500%"]);
  const trailY4 = useTransform(scrollYProgress, [0, 1], ["0%", "700%"]);
  const trailY5 = useTransform(scrollYProgress, [0, 1], ["0%", "1000%"]);
  const trailY6 = useTransform(scrollYProgress, [0, 1], ["0%", "1500%"]);

  const firstName = data.fullName.split(" ")[0] || "";
  const lastName = data.fullName.split(" ").slice(1).join(" ") || data.fullName;
  const role = data.roleDisplay?.trim() || data.roleTitle?.trim() || "Director Técnico";
  const codes = (data.nationalityCodes ?? []).slice(0, 3);

  const nameVariants = {
    hidden: { x: -200, opacity: 0, skewX: 25, scale: 0.8, filter: "blur(15px)" },
    visible: {
      x: 0, opacity: 1, skewX: 0, scale: 1, filter: "blur(0px)",
      transition: { type: "tween", duration: 0.5, ease: "easeOut", delay: 0.1 } as const,
    },
  };
  const lastNameVariants = {
    hidden: { opacity: 0, scale: 1.2, filter: "blur(20px)" },
    visible: {
      opacity: 1, scale: 1, filter: "blur(0px)",
      transition: { duration: 0.8, ease: "circOut", delay: 0.2 } as const,
    },
  };

  // Record strip tiles (omit when there's no stats record).
  const strip = data.record
    ? [
        { value: data.record.matches, label: t("coach.recordMatches") },
        { value: data.record.winPct, suffix: "%", label: t("coach.recordWinRate") },
        { value: data.honours.length, label: t("coach.honoursTitle") },
        { value: data.career.length, label: t("coach.proClubsLabel") },
      ]
    : null;

  return (
    <div
      ref={containerRef}
      className="min-h-[300vh] text-white w-full flex flex-col items-center"
      style={{
        backgroundColor: BG,
        "--theme-primary": PRIMARY,
        "--theme-accent": ACCENT,
        "--theme-background": BG,
      } as React.CSSProperties}
    >
      <ProCoachHeader
        coach={{ fullName: data.fullName, avatarUrl: data.avatarUrl }}
        localeSwitch={data.localeSwitch}
      />

      {/* ===================== CINEMATIC HERO ===================== */}
      <section className="relative h-screen min-h-[600px] md:min-h-[850px] w-full flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-black/20 via-black to-black opacity-90" />
        <div
          className="absolute inset-0 z-0 mix-blend-overlay opacity-30 pointer-events-none"
          style={{ backgroundImage: "url('/images/pack/particles/noise_2.jpg')", backgroundSize: "cover" }}
        />
        <motion.div
          className="absolute inset-0 z-10 mix-blend-screen opacity-30 pointer-events-none"
          style={{ backgroundImage: "url('/images/pack/particles/particle_1.png')", backgroundSize: "120% 120%", backgroundPosition: "center", willChange: "background-position" }}
          animate={{ backgroundPosition: ["50% 50%", "52% 48%", "48% 52%", "50% 50%"] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 z-10 mix-blend-screen opacity-20 pointer-events-none grayscale"
          style={{ backgroundImage: "url('/images/pack/flares/light_leak_1.png')", backgroundSize: "140% 140%", backgroundPosition: "top right", willChange: "background-position, opacity" }}
          animate={{ opacity: [0.16, 0.24, 0.16], backgroundPosition: ["top right", "60% 20%", "top right"] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[150px] opacity-20 pointer-events-none z-10 mix-blend-screen"
          style={{ backgroundColor: ACCENT }}
        />
        <div
          className="absolute rounded-full blur-[140px] pointer-events-none z-10 mix-blend-screen w-[560px] h-[560px] md:w-[680px] md:h-[680px] opacity-20"
          style={{ backgroundColor: PRIMARY, top: "14%", left: "8%" }}
        />

        {/* Marquee */}
        <div className="absolute z-10 overflow-hidden w-full h-full flex flex-col justify-center pointer-events-none select-none opacity-[0.12]">
          <motion.div className="flex whitespace-nowrap" animate={{ x: ["0%", "-50%"] }} transition={{ repeat: Infinity, ease: "linear", duration: 30 }}>
            {[...Array(4)].map((_, i) => (
              <span key={i} className="text-[25vw] font-black uppercase mx-8 leading-none [-webkit-text-stroke:1px_white] md:[-webkit-text-stroke:2px_white] text-transparent">
                {lastName} • {firstName} •
              </span>
            ))}
          </motion.div>
        </div>

        {/* Small name + role + flags */}
        <motion.div className="absolute z-40 w-full flex flex-col justify-center items-center pointer-events-none select-none px-5 md:px-0" style={{ y: textY }}>
          <div className="relative w-fit max-w-full">
            <div className="absolute bottom-[90%] left-0 w-full flex flex-col md:flex-row md:justify-between md:items-end items-center gap-1.5 md:gap-0 mb-2 md:mb-4">
              <motion.div className="flex items-center gap-3 md:gap-5 order-2 md:order-none" initial="hidden" animate="visible" variants={nameVariants}>
                <div className="w-6 md:w-12 h-[2px] bg-white opacity-40 md:opacity-70" />
                <motion.div
                  className="text-[clamp(0.95rem,3.6vw,1.8rem)] tracking-[0.18em] md:tracking-[0.4em] font-light uppercase text-white whitespace-nowrap"
                  animate={{ opacity: [0.8, 1, 0.8], textShadow: [`0px 0px 10px ${ACCENT}`, `0px 0px 30px ${ACCENT}, 0px 0px 60px #ffffff`, `0px 0px 10px ${ACCENT}`] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  {firstName}
                </motion.div>
              </motion.div>
              <motion.div
                className="flex items-center gap-2 md:gap-4 pb-[2px] max-w-full"
                initial={{ opacity: 0, x: 50, filter: "blur(10px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 100, damping: 14, delay: 0.3 }}
              >
                <div className="text-white tracking-[0.1em] md:tracking-[0.2em] uppercase font-bold text-[10px] md:text-sm lg:text-base opacity-95 drop-shadow-md whitespace-nowrap">
                  {role}
                </div>
                {codes.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-white opacity-60 mx-0.5 md:mx-1" />}
                {codes.length > 0 && (
                  <div className="flex items-center gap-1.5 md:gap-2 drop-shadow-lg">
                    {codes.map((code) => (
                      <span key={code} className={`fi fi-${code.toLowerCase()} text-sm md:text-xl shadow-md bg-center`} style={{ borderRadius: "0" }} />
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
            <span role="presentation" aria-hidden="true" className="block font-heading font-black uppercase text-[12vw] leading-[0.8] tracking-tighter opacity-0 pointer-events-none select-none">
              {lastName}
            </span>
          </div>
        </motion.div>

        {/* Ghost trails */}
        {[
          { y: trailY6, opacity: 0.05, w: "1px" },
          { y: trailY5, opacity: 0.1, w: "1px" },
          { y: trailY4, opacity: 0.15, w: "1px" },
          { y: trailY3, opacity: 0.2, w: "1.25px" },
          { y: trailY2, opacity: 0.28, w: "1.25px" },
          { y: trailY1, opacity: 0.35, w: "1.5px" },
        ].map((tr, i) => (
          <motion.div key={i} className="absolute z-[15] w-full flex flex-col justify-center items-center pointer-events-none select-none mix-blend-screen px-5 md:px-0" style={{ y: tr.y, opacity: tr.opacity }}>
            <span aria-hidden="true" className="block font-heading font-black uppercase text-[12vw] leading-[0.8] tracking-tighter text-transparent w-full text-center" style={{ WebkitTextStroke: `${tr.w} var(--theme-accent)`, paintOrder: "stroke fill" }}>
              {lastName}
            </span>
          </motion.div>
        ))}

        {/* White-solid lastName (back) — canonical H1 */}
        <motion.div className="absolute z-20 w-full flex flex-col justify-center items-center pointer-events-none select-none px-5 md:px-0" style={{ y: textY }}>
          <motion.h1
            initial="hidden" animate="visible" variants={lastNameVariants}
            aria-label={data.fullName}
            className="font-heading font-black uppercase text-[12vw] leading-[0.8] tracking-tighter text-white drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center w-full mx-auto"
          >
            <span className="sr-only">{firstName} </span>
            <span aria-hidden="true">{lastName}</span>
          </motion.h1>
        </motion.div>

        {/* Middle layer — hero cutout if present, else framed avatar */}
        <motion.div
          style={{ y: heroY }}
          initial={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute z-30 bottom-[-2vh] md:bottom-0 top-[8vh] md:top-[15vh] w-full max-w-[1200px] flex justify-center items-end"
        >
          {data.heroUrl ? (
            <Image
              src={data.heroUrl}
              alt={data.fullName}
              width={760}
              height={1140}
              priority
              unoptimized
              sizes="(max-width: 1024px) 100vw, 1200px"
              className="h-[80vh] max-h-[760px] md:h-full md:max-h-none w-auto object-contain object-bottom drop-shadow-[0_0_80px_rgba(0,0,0,0.8)] filter contrast-125 origin-bottom"
            />
          ) : (
            <div className="mb-[22vh] md:mb-[12vh] relative">
              <div className="absolute inset-0 rounded-full blur-[60px] opacity-40" style={{ backgroundColor: ACCENT }} />
              <div className="relative h-[34vh] sm:h-[40vh] max-h-[420px] aspect-square overflow-hidden rounded-full ring-2 ring-white/20 shadow-[0_0_80px_rgba(0,0,0,0.8)]">
                <Image src={data.avatarUrl} alt={data.fullName} fill priority unoptimized sizes="420px" className="object-cover" />
              </div>
            </div>
          )}
        </motion.div>

        {/* Accent-outline lastName (front) */}
        <motion.div className="absolute z-[35] w-full flex flex-col justify-center items-center pointer-events-none select-none px-5 md:px-0" style={{ y: textY }}>
          <motion.span
            initial="hidden" animate="visible" variants={lastNameVariants}
            aria-hidden="true"
            className="block font-heading font-black uppercase text-[12vw] leading-[0.8] tracking-tighter text-center w-full text-transparent"
            style={{ WebkitTextStroke: `1.5px ${ACCENT}`, paintOrder: "stroke fill", filter: `drop-shadow(0px 0px 20px ${ACCENT}40)` }}
          >
            {lastName}
          </motion.span>
        </motion.div>

        {/* Record strip */}
        {strip && (
          <motion.div
            className="absolute bottom-7 md:bottom-24 left-1/2 -translate-x-1/2 z-[45] flex items-stretch justify-center gap-1.5 md:gap-3 w-[92vw] max-w-[560px]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.7, ease: "easeOut" }}
          >
            {strip.map((s, i) => (
              <div
                key={i}
                className="flex flex-1 min-w-0 flex-col items-center justify-center rounded-xl md:rounded-2xl border border-white/10 bg-black/40 px-1.5 py-2 backdrop-blur-xl md:px-6 md:py-4"
              >
                <span className="font-bh-display text-base md:text-3xl font-black tabular-nums" style={{ color: ACCENT }}>
                  <CountUp value={s.value} />
                  {s.suffix ?? ""}
                </span>
                <span className="mt-0.5 text-[8px] md:text-[10px] uppercase tracking-[0.08em] md:tracking-[0.12em] text-white/50 text-center leading-tight">
                  {s.label}
                </span>
              </div>
            ))}
          </motion.div>
        )}

        <div className="absolute bottom-0 w-full h-[30vh] z-40 pointer-events-none" style={{ background: "linear-gradient(to top, var(--theme-background) 5%, transparent 100%)" }} />
        <div className={`absolute bottom-12 left-1/2 -translate-x-1/2 z-50 text-white/50 flex-col items-center animate-bounce ${strip ? "hidden md:flex" : "flex"}`}>
          <span className="text-[10px] tracking-[0.3em] uppercase mb-2">{t("pro.scroll")}</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-white/50 to-transparent" />
        </div>
      </section>

      {/* ===================== CONTENT ===================== */}
      <div className="relative z-50 w-full min-h-screen pt-24 md:pt-32 pb-24 transition-colors duration-1000" style={{ backgroundColor: "var(--theme-background)" }}>
        <div className="max-w-[1100px] w-full mx-auto px-5 sm:px-6 md:px-12 flex flex-col gap-20 md:gap-36">
          <CoachProContent data={data} accent={ACCENT} />
        </div>
      </div>
    </div>
  );
}
