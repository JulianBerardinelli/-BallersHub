"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Wordmark } from "@/components/brand/Wordmark";

type NavItem = { href: string; label: string };

const NAV: NavItem[] = [
  { href: "/players", label: "Jugadores" },
  { href: "/scouting", label: "Scouting" },
  { href: "/pricing", label: "Planes" },
  { href: "/about", label: "Nosotros" },
];

export default function HeaderChrome({ authSlot }: { authSlot: React.ReactNode }) {
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
                {i.label}
              </Link>
            ))}
          </nav>
          <div className="flex-1 md:hidden" />

          {/* Right — search + auth */}
          <div className="flex shrink-0 items-center gap-2">{authSlot}</div>
        </div>
      </div>
    </header>
  );
}
