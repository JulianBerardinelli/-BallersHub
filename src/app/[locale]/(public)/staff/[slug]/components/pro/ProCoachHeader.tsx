"use client";

// Adapted from the player ProPlayerHeader. Same glassmorphism nav pill +
// scroll-spy + share + locale switcher, but the section set is coach-specific
// and the labels reuse the existing `coach.*` portfolio titles (already in all
// 4 locales).

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Share2,
  ArrowLeft,
  User2,
  TrendingUp,
  Target,
  Trophy,
  Image as ImageIcon,
  Newspaper,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Wordmark } from "@/components/brand/Wordmark";
import HeaderLocaleSwitcher from "@/components/i18n/HeaderLocaleSwitcher";

type LocaleSwitch = { available: string[]; current: string; basePath: string };
type SectionItem = { id: string; labelKey: string; Icon: LucideIcon };

// id → DOM anchor on the page; labelKey reuses existing portfolio titles
// (coach.* where one exists, modules.* for the reused player components).
// Order mirrors CoachProContent's render order. `tactics` is the rich tactical
// block (methodology + ideas de juego + formations + videos); `gallery` is the
// photo grid; `press` only ever scrolls to a node when the coach has articles
// (the section is conditionally rendered) — the scroll-spy simply skips a
// missing id, so listing it here is safe.
const COACH_SECTIONS: SectionItem[] = [
  { id: "biography", labelKey: "coach.bioTitle", Icon: User2 },
  { id: "career", labelKey: "coach.careerTitle", Icon: TrendingUp },
  { id: "tactics", labelKey: "coach.methodologyTitle", Icon: Target },
  { id: "gallery", labelKey: "modules.gallery.title", Icon: ImageIcon },
  { id: "press", labelKey: "modules.press.title", Icon: Newspaper },
  { id: "honours", labelKey: "coach.honoursTitle", Icon: Trophy },
  { id: "contact", labelKey: "coach.contactTitle", Icon: Mail },
];

export default function ProCoachHeader({
  coach,
  localeSwitch,
}: {
  coach: { fullName: string; avatarUrl: string | null };
  localeSwitch?: LocaleSwitch;
}) {
  const t = useTranslations("portfolio");
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: t("share.title", { name: coach.fullName }),
          text: t("share.text", { name: coach.fullName }),
          url: window.location.href,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      /* user cancelled share — no-op */
    }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: "smooth" });
  };

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY < window.innerHeight * 0.5) {
        setActiveId(null);
        return;
      }
      const probeY = window.innerHeight * 0.35;
      let current: string | null = null;
      for (const section of COACH_SECTIONS) {
        const el = document.getElementById(section.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= probeY) current = section.id;
      }
      setActiveId(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed top-0 left-0 w-full z-[100] pt-4 md:pt-6 px-4 md:px-6 lg:px-12 pointer-events-none"
    >
      <div className="relative w-full max-w-[1400px] mx-auto flex items-center justify-center">
        <Link
          href="/"
          aria-label={t("a11y.backToHome")}
          className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-auto hidden md:flex flex-col items-start group"
        >
          <span className="text-white/50 text-[10px] uppercase tracking-[0.3em] mb-1 font-bold flex items-center gap-1.5 group-hover:text-white/80 transition-colors">
            <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" />
            {t("a11y.backTo")}
          </span>
          <Wordmark size="nav" className="text-base leading-none opacity-90 group-hover:opacity-100 transition-opacity" />
        </Link>

        <nav
          aria-label={t("a11y.profileNav")}
          className="pointer-events-auto bg-black/40 backdrop-blur-xl border border-white/10 rounded-full pl-2 pr-2 py-2 flex items-center gap-0.5 md:gap-2 shadow-[0_20px_40px_rgba(0,0,0,0.5)] max-w-[calc(100vw-1.5rem)]"
        >
          {coach.avatarUrl && (
            <button
              type="button"
              onClick={scrollToTop}
              aria-label={t("a11y.home")}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-white/20 shadow-inner shrink-0 pointer-events-auto"
            >
              <Image
                src={coach.avatarUrl}
                alt={coach.fullName}
                width={40}
                height={40}
                sizes="40px"
                className="w-full h-full object-cover"
                unoptimized
              />
            </button>
          )}

          {COACH_SECTIONS.map((item) => {
            const isActive = activeId === item.id;
            const Icon = item.Icon;
            const label = t(item.labelKey);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                aria-label={label}
                title={label}
                className={`relative pointer-events-auto rounded-full font-semibold uppercase tracking-widest transition-colors whitespace-nowrap flex items-center justify-center shrink-0 px-1.5 py-1.5 md:px-3 md:text-xs ${
                  isActive
                    ? "text-[var(--theme-background,#050505)]"
                    : "text-white/70 hover:text-[var(--theme-accent,#ccff00)]"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="coach-nav-active-pill"
                    className="absolute inset-0 rounded-full"
                    style={{
                      backgroundColor: "var(--theme-accent, #ccff00)",
                      boxShadow:
                        "0 4px 22px color-mix(in srgb, var(--theme-accent, #ccff00) 45%, transparent)",
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="w-4 h-4 md:hidden" aria-hidden="true" />
                  <span className="hidden md:inline">{label}</span>
                </span>
              </button>
            );
          })}

          <div className="w-px h-4 bg-white/20 mx-0.5 md:mx-1 shrink-0" />

          <button
            type="button"
            onClick={handleShare}
            aria-label={t("a11y.shareProfile")}
            className="text-white hover:text-[var(--theme-accent,#ccff00)] transition-colors pointer-events-auto px-1.5 md:px-2 shrink-0"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {localeSwitch ? (
            <>
              <div className="w-px h-4 bg-white/20 mx-0.5 md:mx-1 shrink-0" />
              <HeaderLocaleSwitcher
                basePath={localeSwitch.basePath}
                available={localeSwitch.available}
                current={localeSwitch.current}
              />
            </>
          ) : null}
        </nav>

        <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-auto hidden md:flex flex-col items-end">
          <span className="text-white/50 text-[10px] uppercase tracking-[0.3em] mb-1 font-bold">
            {t("a11y.poweredBy")}
          </span>
          <Wordmark size="nav" className="text-base leading-none" />
        </div>
      </div>
    </motion.header>
  );
}
