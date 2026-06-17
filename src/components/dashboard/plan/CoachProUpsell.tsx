// Free-coach Pro upsell, rendered in the coach dashboard shell when the coach
// is not Pro. Shows the three currency prices (USD/ARS/EUR — same amounts as
// Pro Player, D2) and links each to the pro-coach checkout. Server component:
// getPlanPrice is server-only.

import Link from "next/link";
import { getPlanPrice, type CheckoutCurrency } from "@/lib/billing/plans";

const CURRENCIES: CheckoutCurrency[] = ["USD", "ARS", "EUR"];

function monthlyLabel(amount: number, currency: CheckoutCurrency): string {
  const perMonth = amount / 12;
  if (currency === "ARS") {
    return `ARS ${new Intl.NumberFormat("es-AR").format(Math.round(perMonth))}`;
  }
  if (currency === "EUR") return `EUR ${perMonth.toFixed(2)}`;
  return `USD ${perMonth.toFixed(2)}`;
}

export default function CoachProUpsell() {
  return (
    <div className="space-y-3 rounded-bh-lg border border-bh-lime/25 bg-bh-lime/[0.05] p-5">
      <div className="space-y-1">
        <p className="font-bh-display text-sm font-bold uppercase tracking-[0.08em] text-bh-lime">
          Activá Pro DT
        </p>
        <p className="text-[13px] leading-[1.5] text-bh-fg-2">
          Análisis metodológico en tu página, traducciones a 3 idiomas, multimedia ampliada y ficha
          enriquecida para Google y buscadores con IA. 7 días gratis, cobro anual.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {CURRENCIES.map((currency) => {
          const price = getPlanPrice("pro-coach", currency);
          return (
            <Link
              key={currency}
              href={`/checkout/pro-coach?currency=${currency}`}
              className="group inline-flex items-baseline gap-1.5 rounded-bh-md border border-bh-lime/30 bg-bh-surface-1 px-3.5 py-2 text-[13px] font-semibold text-bh-fg-1 transition-colors hover:border-bh-lime hover:bg-bh-lime/10"
            >
              <span className="text-bh-lime">{monthlyLabel(price.amount, currency)}</span>
              <span className="text-[11px] font-normal text-bh-fg-4">/mes</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
