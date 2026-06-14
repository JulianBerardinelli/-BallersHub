"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Share2, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Wordmark } from "@/components/brand/Wordmark";
import HeaderLocaleSwitcher from "@/components/i18n/HeaderLocaleSwitcher";

type LocaleSwitch = { available: string[]; current: string; basePath: string };

type SectionItem = { id: string; key: string };

const PORTFOLIO_SECTIONS: SectionItem[] = [
  { id: "about", key: "about" },
  { id: "staff", key: "staff" },
  { id: "roster", key: "roster" },
  { id: "services", key: "services" },
  { id: "reach", key: "reach" },
  { id: "gallery", key: "gallery" },
  { id: "contact", key: "contact" },
];

type Props = {
  agency: {
    name: string;
    logoUrl?: string | null;
  };
  localeSwitch?: LocaleSwitch;
};

export default function ProAgencyHeader({ agency, localeSwitch }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const t = useTranslations("portfolio");

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: t("agency.shareTitle", { name: agency.name }),
          text: t("agency.shareText", { name: agency.name }),
          url: window.location.href,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch (error) {
      console.log("Error compartiendo", error);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const headerOffset = 96;
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
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
      for (const section of PORTFOLIO_SECTIONS) {
        const el = document.getElementById(section.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= probeY) current = section.id;
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
          aria-label={t("agency.backToHome")}
          className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-auto hidden md:flex flex-col items-start group"
        >
          <span className="text-white/50 text-[10px] uppercase tracking-[0.3em] mb-1 font-bold flex items-center gap-1.5 group-hover:text-white/80 transition-colors">
            <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" />
            {t("agency.backTo")}
          </span>
          <Wordmark
            size="nav"
            className="text-base leading-none transition-opacity opacity-90 group-hover:opacity-100"
          />
        </Link>

        <nav
          aria-label={t("agency.nav.label")}
          className="pointer-events-auto bg-black/40 backdrop-blur-xl border border-white/10 rounded-full pl-2 pr-2 py-2 flex items-center gap-1 md:gap-2 shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-all max-w-[calc(100vw-2rem)] overflow-x-auto no-scrollbar"
        >
          {agency.logoUrl ? (
            <button
              type="button"
              onClick={scrollToTop}
              aria-label={t("agency.home")}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-white/20 shadow-inner shrink-0 pointer-events-auto bg-white/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={agency.logoUrl}
                alt={agency.name}
                className="w-full h-full object-contain"
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={scrollToTop}
              aria-label={t("agency.home")}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-white/20 shadow-inner shrink-0 pointer-events-auto bg-white/10 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-white/80"
            >
              {agency.name.slice(0, 2)}
            </button>
          )}

          {PORTFOLIO_SECTIONS.map((item) => {
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={`relative pointer-events-auto px-2.5 md:px-3 py-1.5 rounded-full text-[10px] md:text-xs font-semibold uppercase tracking-[0.18em] md:tracking-widest transition-colors whitespace-nowrap ${
                  isActive
                    ? "text-[var(--theme-background,#050505)]"
                    : "text-white/70 hover:text-[var(--theme-accent,#34d399)]"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="agency-nav-active-pill"
                    className="absolute inset-0 rounded-full"
                    style={{
                      backgroundColor: "var(--theme-accent, #34d399)",
                      boxShadow:
                        "0 4px 22px color-mix(in srgb, var(--theme-accent, #34d399) 45%, transparent)",
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{t(`agency.nav.${item.key}`)}</span>
              </button>
            );
          })}

          <div className="w-px h-4 bg-white/20 mx-1 shrink-0" />

          <button
            type="button"
            onClick={handleShare}
            aria-label={t("agency.shareAria")}
            className="text-white hover:text-[var(--theme-accent,#34d399)] transition-colors pointer-events-auto px-2 shrink-0"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Language switcher — inside the island, right after share. */}
          {localeSwitch ? (
            <>
              <div className="w-px h-4 bg-white/20 mx-1 shrink-0" />
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
            {t("agency.poweredBy")}
          </span>
          <Wordmark size="nav" className="text-base leading-none" />
        </div>
      </div>
    </motion.header>
  );
}
