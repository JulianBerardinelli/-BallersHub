// Tight checkout footer matching the Claude Design handoff.
// Single row: copyright + CUIT on the left, legal link list on the right.

import Link from "next/link";

const LINKS = [
  { href: "/legal/terms", label: "Términos" },
  { href: "/legal/privacy", label: "Privacidad" },
  { href: "/legal/refunds", label: "Reembolsos" },
  { href: "mailto:soporte@ballershub.app", label: "Soporte" },
];

export default function CheckoutFooterMini() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-3 px-6 py-5 text-[11px] text-bh-fg-3 md:flex-row md:px-12">
        <span>
          © {year} &apos;BallersHub · CUIT 30-71XXXXXXX-X
        </span>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="transition-colors duration-150 hover:text-bh-fg-1"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
