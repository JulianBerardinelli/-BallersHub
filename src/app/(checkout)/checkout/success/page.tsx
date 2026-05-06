// /checkout/success?cs_id=...&internal=...
//
// Both Stripe and Mercado Pago redirect here on a successful payment. The
// actual subscription mutation happens in the webhook handlers; this page
// reads our local checkout_sessions row to render the confirmation copy
// and offers a link to the receipt + dashboard.

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Mail,
  Receipt as ReceiptIcon,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { checkoutSessions } from "@/db/schema";
import CheckoutStepper from "@/components/site/checkout/CheckoutStepper";
import { PLAN_COPY } from "@/components/site/checkout/data";
import { CURRENCY_GLYPH } from "@/components/site/pricing/data";
import {
  isCheckoutPlanId,
  isCheckoutCurrency,
  getPlanPrice,
  TRIAL_DAYS,
} from "@/lib/billing/plans";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { fetchDashboardState } from "@/lib/dashboard/client/data-provider";

export const metadata = {
  title: "Pago confirmado · 'BallersHub",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ internal?: string; cs_id?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const { internal } = await searchParams;
  const session = internal ? await loadSession(internal) : null;

  const planCopy =
    session && isCheckoutPlanId(session.planId) ? PLAN_COPY[session.planId] : null;
  const currency =
    session && isCheckoutCurrency(session.currency) ? session.currency : null;
  const price =
    session && currency && isCheckoutPlanId(session.planId)
      ? getPlanPrice(session.planId, currency)
      : null;

  const trialEnds = new Date(Date.now() + TRIAL_DAYS * 24 * 3600 * 1000);
  const trialEndsLabel = trialEnds.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Decide where to send the user next:
  //  - If they already have a player profile (or manager profile) → dashboard
  //  - Otherwise → /onboarding/start (which routes them to the right
  //    onboarding flow: player apply, manager info, agency invite, etc.)
  // We swallow auth errors here on purpose: the success page should never
  // fail if Supabase is hiccuping — worst case the user lands on /dashboard
  // and sees the layout's degraded fallback.
  const nextStep = await resolveNextStep();

  return (
    <div className="space-y-10">
      <CheckoutStepper current="confirmation" />

      <section className="mx-auto max-w-xl space-y-7 py-4 text-center">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border border-bh-success/30 bg-bh-success/10 text-bh-success">
          <CheckCircle2 className="h-7 w-7" />
        </span>

        <div className="space-y-3">
          <h1 className="font-bh-display text-3xl font-black uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
            ¡Listo! Tu plan{" "}
            <span className="bh-text-shimmer">
              {planCopy?.name ?? "Pro"}
            </span>{" "}
            está activo
          </h1>
          <p className="text-[14px] leading-[1.6] text-bh-fg-2">
            Te enviamos el detalle a tu email. El trial de {TRIAL_DAYS} días
            arrancó hoy y podés cancelar sin cargo en cualquier momento dentro
            de los 3 días posteriores al primer cobro.
          </p>
        </div>

        {session && planCopy && currency && price ? (
          <div className="bh-glass mx-auto max-w-md rounded-bh-xl p-5 text-left">
            <div className="space-y-3 text-[12.5px]">
              <Row label="Plan">
                <span className="font-semibold text-bh-fg-1">
                  {planCopy.name}
                </span>
              </Row>
              <Row label="Total facturable">
                <span className="font-bh-mono font-semibold text-bh-fg-1">
                  {CURRENCY_GLYPH[currency]}
                  {price.amount} {currency} / año
                </span>
              </Row>
              <Row label="Trial activo hasta">
                <span className="text-bh-fg-2">{trialEndsLabel}</span>
              </Row>
              <Row label="Procesador">
                <span className="text-bh-fg-2">
                  {session.processor === "mercado_pago"
                    ? "Mercado Pago"
                    : "Stripe"}
                </span>
              </Row>
              <div className="flex items-start gap-2 border-t border-white/[0.08] pt-3 text-[11.5px] text-bh-fg-3">
                <Mail className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  Si en 5 minutos no ves el email de confirmación, escribinos a{" "}
                  <Link
                    href="mailto:soporte@ballershub.app"
                    className="text-bh-lime underline-offset-4 hover:underline"
                  >
                    soporte@ballershub.app
                  </Link>
                  .
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bh-glass mx-auto max-w-md rounded-bh-xl p-5 text-left text-[12px] text-bh-fg-3">
            <Sparkles className="mr-2 inline-block h-3.5 w-3.5 text-bh-lime" />
            Estamos terminando de procesar tu pago. Esto puede tardar unos
            segundos.
          </div>
        )}

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={nextStep.href}
            className="inline-flex items-center justify-center gap-2 rounded-bh-md bg-bh-lime px-6 py-3 text-sm font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
          >
            {nextStep.kind === "onboarding" ? (
              <>
                <UserPlus className="h-4 w-4" />
                {nextStep.label}
              </>
            ) : (
              <>
                {nextStep.label}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Link>
          {session && (
            <Link
              href={`/checkout/receipt?internal=${session.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-bh-md border border-white/[0.12] px-6 py-3 text-[13px] font-semibold text-bh-fg-2 transition-colors duration-150 hover:bg-white/[0.06] hover:text-bh-fg-1"
            >
              <ReceiptIcon className="h-4 w-4" />
              Ver recibo
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {nextStep.kind === "onboarding" && (
          <p className="mx-auto max-w-md text-[12.5px] text-bh-fg-3">
            Tu suscripción quedó activa. Para usarla necesitamos un par de
            datos más sobre vos — toma 2-3 minutos.
          </p>
        )}
      </section>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-4">
        {label}
      </span>
      <span>{children}</span>
    </div>
  );
}

type NextStep =
  | { kind: "dashboard"; href: "/dashboard"; label: "Ir a mi dashboard" }
  | { kind: "onboarding"; href: "/onboarding/start"; label: "Completar mi perfil" };

async function resolveNextStep(): Promise<NextStep> {
  const dashboardLink: NextStep = {
    kind: "dashboard",
    href: "/dashboard",
    label: "Ir a mi dashboard",
  };
  const onboardingLink: NextStep = {
    kind: "onboarding",
    href: "/onboarding/start",
    label: "Completar mi perfil",
  };

  try {
    const supabase = await createSupabaseServerRSC();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return dashboardLink;

    // Player profile or in-progress application → dashboard.
    const dashboardState = await fetchDashboardState(supabase, user.id);
    if (dashboardState.profile || dashboardState.application) {
      return dashboardLink;
    }

    // Manager profile (agency owner) → dashboard.
    const { db: drizzle } = await import("@/lib/db");
    const up = await drizzle.query.userProfiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.userId, user.id),
      with: { agency: true },
    });
    if (up?.role === "manager" || up?.agency) {
      return dashboardLink;
    }

    // Brand-new user (no profile, no application, no agency) → onboarding.
    return onboardingLink;
  } catch {
    // Any DB / auth hiccup: default to dashboard. The dashboard layout has
    // its own degraded fallback, so the user still sees something useful.
    return dashboardLink;
  }
}

async function loadSession(internalId: string) {
  try {
    const [row] = await db
      .select()
      .from(checkoutSessions)
      .where(eq(checkoutSessions.id, internalId))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}
