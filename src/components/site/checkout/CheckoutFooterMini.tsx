// Tight checkout footer — just legal links + copyright. Keeps the page
// chrome compact so the form gets focus. Replaces the full SiteFooter
// during the checkout flow.

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
    <footer className="border-t border-white/[0.06] bg-bh-black/40 py-6">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 px-4 text-center text-[11px] text-bh-fg-4 md:flex-row md:px-6 md:text-left">
        <span>© {year} &apos;BallersHub. Procesado por Stripe y Mercado Pago.</span>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-bh-fg-3 transition-colors duration-150 hover:text-bh-fg-1"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
