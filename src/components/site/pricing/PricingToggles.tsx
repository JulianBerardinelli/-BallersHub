"use client";

// Audience + Currency toggles. Sit between the hero and the plan cards.
// On mobile: stacked. On md+: audience prominent on the left, currency
// compact on the right.

import { Building2, User } from "lucide-react";
import { usePricing } from "./PricingContext";
import type { Audience, Currency } from "./data";

const AUDIENCES: { id: Audience; label: string; Icon: typeof User }[] = [
  { id: "player", label: "Jugador", Icon: User },
  { id: "agency", label: "Agencia", Icon: Building2 },
];

const CURRENCIES: { id: Currency; label: string }[] = [
  { id: "USD", label: "USD" },
  { id: "ARS", label: "ARS" },
  { id: "EUR", label: "EUR" },
];

export default function PricingToggles() {
  const { audience, currency, setAudience, setCurrency } = usePricing();

  return (
    <div className="bh-animate-in flex flex-col items-center gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
      {/* Audience — primary */}
      <div className="flex flex-col items-center gap-1.5 md:items-start">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-bh-fg-4">
          Soy
        </span>
        <div className="inline-flex items-center gap-1 rounded-bh-pill border border-white/[0.08] bg-white/[0.03] p-1 backdrop-blur-md">
          {AUDIENCES.map((a) => {
            const active = a.id === audience;
            // Each audience pill previews its own accent so the toggle
            // doubles as an "accent picker" — Player turns lime, Agency
            // turns blue.
            const activeStyle =
              a.id === "agency"
                ? "bg-bh-blue text-bh-black shadow-[0_2px_10px_rgba(0,194,255,0.30)]"
                : "bg-bh-lime text-bh-black shadow-[0_2px_10px_rgba(204,255,0,0.30)]";
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setAudience(a.id)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 rounded-bh-pill px-4 py-2 text-[13px] font-semibold transition-all duration-200 ease-[cubic-bezier(0.25,0,0,1)] ${
                  active ? activeStyle : "text-bh-fg-3 hover:text-bh-fg-1"
                }`}
              >
                <a.Icon className="h-3.5 w-3.5" />
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Currency — secondary */}
      <div className="flex flex-col items-center gap-1.5 md:items-end">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-bh-fg-4">
          Moneda
        </span>
        <div className="inline-flex items-center gap-1 rounded-bh-pill border border-white/[0.08] bg-white/[0.03] p-1 backdrop-blur-md">
          {CURRENCIES.map((c) => {
            const active = c.id === currency;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCurrency(c.id)}
                aria-pressed={active}
                className={`rounded-bh-pill px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.10em] transition-all duration-200 ease-[cubic-bezier(0.25,0,0,1)] ${
                  active
                    ? "bg-white/10 text-bh-fg-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)]"
                    : "text-bh-fg-4 hover:text-bh-fg-2"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
