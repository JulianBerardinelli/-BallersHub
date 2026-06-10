"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";

type NavItem = { href: string; key: string };

// Labels resolve from messages/<locale>/common.json (nav.*). Hrefs are
// locale-agnostic — the Link from @/i18n/navigation injects the active
// locale prefix (none for the es default).
const NAV: NavItem[] = [
  { href: "/players", key: "players" },
  { href: "/agencies", key: "agencies" },
  { href: "/pricing", key: "plans" },
  { href: "/como-validamos", key: "howWeValidate" },
  { href: "/blog", key: "blog" },
  { href: "/about", key: "about" },
];

export default function HeaderChrome({ authSlot }: { authSlot: React.ReactNode }) {
  const t = useTranslations("common");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 30);
          ticking = false;
        });
        ticking = true;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.25,0,0,1)] ${
        scrolled
          ? "border-b border-white/[0.08] bg-bh-black/85 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl backdrop-saturate-150"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <div className="flex h-20 items-center gap-4">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center" aria-label="'BallersHub">
            <Wordmark size="nav" />
          </Link>

          {/* Nav — centered */}
          <nav className="hidden flex-1 items-center justify-center gap-7 md:flex">
            {NAV.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className="text-[13px] font-medium text-bh-fg-2 transition-colors duration-150 hover:text-bh-lime"
              >
                {t(`nav.${i.key}`)}
              </Link>
            ))}
          </nav>
          <div className="flex-1 md:hidden" />

          {/* Right — search + auth + locale */}
          <div className="flex shrink-0 items-center gap-2">
            {authSlot}
            <LocaleSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
