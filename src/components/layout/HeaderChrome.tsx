"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
          setScrolled(window.scrollY > 8);
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
      className={[
        "sticky top-0 z-50 transition-all",
        scrolled
          ? "backdrop-blur bg-[color:var(--heroui-colors-content1)]/70"
          : "bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex h-24 max-w-6xl items-center gap-4 px-4">
        {/* Logo / marca */}
        <Link href="/(site)" className="font-semibold tracking-tight text-white">
            <h1 className="text-2xl font-bold">'BallersHub</h1>
        </Link>

        {/* Nav desplazado a la derecha del logo */}
        <nav className="ml-10 md:ml-12 hidden md:block">
          <ul className="flex items-center gap-6 text-sm text-neutral-300">
            {NAV.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="hover:text-white">
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-4">
          {authSlot}
        </div>
      </div>
    </header>
  );
}
