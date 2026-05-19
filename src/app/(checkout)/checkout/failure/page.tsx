import Link from "next/link";
import { ArrowRight, XCircle } from "lucide-react";
import { eq } from "drizzle-orm";
import CheckoutStepper from "@/components/site/checkout/CheckoutStepper";
import { db } from "@/lib/db";
import { checkoutSessions } from "@/db/schema";
import {
  isCheckoutCurrency,
  isCheckoutPlanId,
} from "@/lib/billing/plans";

export const metadata = {
  title: "Pago rechazado · 'BallersHub",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ internal?: string; reason?: string }>;
};

export default async function CheckoutFailurePage({ searchParams }: PageProps) {
  const { internal, reason } = await searchParams;
  const retryHref = internal
    ? await buildRetryHref(internal)
    : "/pricing";

  return (
    <div className="space-y-10">
      <CheckoutStepper current="payment" />

      <section className="mx-auto max-w-xl space-y-7 py-4 text-center">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border border-bh-danger/30 bg-bh-danger/10 text-bh-danger">
          <XCircle className="h-7 w-7" />
        </span>

        <div className="space-y-3">
          <h1 className="font-bh-display text-3xl font-black uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
            No pudimos procesar tu pago
          </h1>
          <p className="text-[14px] leading-[1.6] text-bh-fg-2">
            {reasonCopy(reason) ?? (
              <>
                El procesador rechazó la operación. No te cobramos nada. Probá
                con otra tarjeta o método de pago — tus datos siguen guardados.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={retryHref}
            className="inline-flex items-center justify-center gap-2 rounded-bh-md bg-bh-lime px-6 py-3 text-sm font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
          >
            Reintentar el pago
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 rounded-bh-md border border-white/[0.12] px-6 py-3 text-[13px] font-semibold text-bh-fg-2 transition-colors duration-150 hover:bg-white/[0.06] hover:text-bh-fg-1"
          >
            Volver a planes
          </Link>
        </div>
      </section>
    </div>
  );
}

async function buildRetryHref(internalId: string): Promise<string> {
  // Look up the original session so the retry CTA preserves the user's
  // chosen plan + currency. Without this, a `pro-agency` failure would
  // silently retry as `pro-player` (Codex P2 — PR #42).
  try {
    const [row] = await db
      .select({
        planId: checkoutSessions.planId,
        currency: checkoutSessions.currency,
      })
      .from(checkoutSessions)
      .where(eq(checkoutSessions.id, internalId))
      .limit(1);
    if (row && isCheckoutPlanId(row.planId) && isCheckoutCurrency(row.currency)) {
      return `/checkout/${row.planId}?currency=${row.currency}&retry=${internalId}`;
    }
  } catch {
    // Fall through to the generic pricing redirect on any DB hiccup.
  }
  return "/pricing";
}

function reasonCopy(reason: string | undefined): React.ReactNode {
  switch (reason) {
    case "cc_rejected_insufficient_amount":
      return (
        <>
          La tarjeta no tiene fondos suficientes. Probá con otro método o
          contactá a tu banco.
        </>
      );
    case "cc_rejected_bad_filled_card_number":
    case "cc_rejected_bad_filled_date":
    case "cc_rejected_bad_filled_security_code":
      return (
        <>
          Los datos de la tarjeta no son correctos. Revisá el número, la fecha
          de vencimiento y el código de seguridad e intentá de nuevo.
        </>
      );
    case "cc_rejected_high_risk":
      return (
        <>
          El procesador detectó un riesgo en la operación. Probá con otra
          tarjeta o contactá a tu banco para autorizar el cargo.
        </>
      );
    default:
      return null;
  }
}
