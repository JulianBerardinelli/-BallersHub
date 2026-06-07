// Editorial masthead for /blog — a non-fixed band that sits below the
// global site header (which stays fixed). Magazine layout: side links left
// and right, the brand wordmark + tagline centered. Scrolls away while the
// category nav below pins under the header.

import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";

const LEFT = [
  { label: "Jugadores", href: "/players" },
  { label: "Agencias", href: "/agencies" },
];
const RIGHT = [
  { label: "Nosotros", href: "/about", accent: false },
  { label: "Crear perfil", href: "/auth/sign-up", accent: true },
];

const linkBase =
  "font-bh-display text-[14.5px] font-semibold uppercase tracking-[0.05em] whitespace-nowrap transition-colors duration-200";

export function BlogMasthead() {
  return (
    <div
      className="border-b border-white/[0.08]"
      style={{
        background:
          "radial-gradient(120% 160% at 50% -40%, rgba(204,255,0,0.06) 0%, transparent 55%)",
      }}
    >
      <div className="mx-auto grid max-w-[1320px] grid-cols-1 items-center gap-4 px-7 py-6 md:grid-cols-[1fr_auto_1fr] md:gap-6 md:py-7">
        <div className="flex items-center justify-center gap-7 md:justify-start">
          {LEFT.map((l) => (
            <Link key={l.label} href={l.href} className={`${linkBase} text-bh-fg-2 hover:text-bh-fg-1`}>
              {l.label}
            </Link>
          ))}
        </div>

        <Link href="/blog" className="flex flex-col items-center gap-1.5" aria-label="Blog de 'BallersHub">
          <Wordmark size="hero" />
          <span className="font-bh-mono text-[10px] uppercase tracking-[0.2em] text-bh-fg-3">
            El que se mueve, juega
          </span>
        </Link>

        <div className="flex items-center justify-center gap-7 md:justify-end">
          {RIGHT.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className={`${linkBase} ${l.accent ? "text-bh-lime hover:text-bh-lime-soft" : "text-bh-fg-2 hover:text-bh-fg-1"}`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
