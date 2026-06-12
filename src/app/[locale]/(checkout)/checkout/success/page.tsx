// /checkout/success?cs_id=...&internal=...
//
// Both Stripe and Mercado Pago redirect here on a successful payment. The
// actual subscription mutation happens in the webhook handlers; this page
// reads our local checkout_sessions row to render the confirmation copy
// and offers a link to the receipt + dashboard.

import Link from "next/link";
import { redirect } from "next/navigation";
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
import { getTranslations } from "next-intl/server";
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

export async function generateMetadata() {
  const t = await getTranslations("checkout");
  return {
    title: t("meta.successTitle"),
    robots: { index: false, follow: false },
  };
}

type PageProps = {
  searchParams: Promise<{ internal?: string; cs_id?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const t = await getTranslations("checkout");
  const { internal } = await searchParams;
  const session = internal ? await loadSession(internal) : null;

  // Status guard: this page is the *confirmation* surface — only render
  // it when the session is actually completed. Otherwise:
  //  - pending / redirected → bounce to /processing (which polls + reconciles)
  //  - failed / expired → bounce to /failure
  //  - no session at all → render the generic confirmation (legacy bookmark
  //    case). The user gets a neutral "gracias por suscribirte" without
  //    any false claims about plan activation.
  if (session) {
    if (session.status === "pending" || session.status === "redirected") {
      redirect(`/checkout/processing?internal=${internal}`);
    }
    if (session.status === "failed" || session.status === "expired") {
      redirect(`/checkout/failure?internal=${internal}`);
    }
  }

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
  const nextStepLabel =
    nextStep.kind === "dashboard"
      ? t("common.backToDashboard")
      : t("success.completeProfile");

  return (
    <div className="space-y-10">
      <CheckoutStepper current="confirmation" />

      <section className="mx-auto max-w-xl space-y-7 py-4 text-center">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border border-bh-success/30 bg-bh-success/10 text-bh-success">
          <CheckCircle2 className="h-7 w-7" />
        </span>

        <div className="space-y-3">
          <h1 className="font-bh-display text-3xl font-black uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
            {t.rich("success.title", {
              plan: planCopy?.name ?? t("success.defaultPlanName"),
              shimmer: (chunks) => (
                <span className="bh-text-shimmer">{chunks}</span>
              ),
            })}
          </h1>
          <p className="text-[14px] leading-[1.6] text-bh-fg-2">
            {t("success.intro", { trialDays: TRIAL_DAYS })}
          </p>
        </div>

        {session && planCopy && currency && price ? (
          <div className="bh-glass mx-auto max-w-md rounded-bh-xl p-5 text-left">
            <div className="space-y-3 text-[12.5px]">
              <Row label={t("success.summary.plan")}>
                <span className="font-semibold text-bh-fg-1">
                  {planCopy.name}
                </span>
              </Row>
              <Row label={t("success.summary.billableTotal")}>
                <span className="font-bh-mono font-semibold text-bh-fg-1">
                  {t("success.summary.amountPerYear", {
                    amount: `${CURRENCY_GLYPH[currency]}${price.amount}`,
                    currency,
                  })}
                </span>
              </Row>
              <Row label={t("success.summary.trialActiveUntil")}>
                <span className="text-bh-fg-2">{trialEndsLabel}</span>
              </Row>
              <Row label={t("success.summary.processor")}>
                <span className="text-bh-fg-2">
                  {session.processor === "mercado_pago"
                    ? t("common.processorMercadoPago")
                    : t("common.processorStripe")}
                </span>
              </Row>
              <div className="flex items-start gap-2 border-t border-white/[0.08] pt-3 text-[11.5px] text-bh-fg-3">
                <Mail className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  {t.rich("success.summary.emailNote", {
                    supportEmail: (chunks) => (
                      <Link
                        href="mailto:info@ballershub.co"
                        className="text-bh-lime underline-offset-4 hover:underline"
                      >
                        {chunks}
                      </Link>
                    ),
                  })}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bh-glass mx-auto max-w-md rounded-bh-xl p-5 text-left text-[12px] text-bh-fg-3">
            <Sparkles className="mr-2 inline-block h-3.5 w-3.5 text-bh-lime" />
            {t("success.processingFallback")}
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
                {nextStepLabel}
              </>
            ) : (
              <>
                {nextStepLabel}
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
              {t("success.viewReceipt")}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {nextStep.kind === "onboarding" && (
          <p className="mx-auto max-w-md text-[12.5px] text-bh-fg-3">
            {t("success.onboardingNote")}
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

// The CTA label is derived from `kind` at render time (localized via
// next-intl), so the route resolver only needs to return the kind + href.
type NextStep =
  | { kind: "dashboard"; href: "/dashboard" }
  | {
      kind: "onboarding";
      href:
        | "/onboarding/player/apply"
        | "/onboarding/manager/info"
        | "/onboarding/start";
    };

async function resolveNextStep(): Promise<NextStep> {
  const dashboardLink: NextStep = {
    kind: "dashboard",
    href: "/dashboard",
  };
  // Default onboarding fallback when we can't determine the role from
  // a subscription. The /onboarding/start page itself also reads the
  // active subscription on load and skips the role chooser when it
  // can — so this is mostly a safety net.
  const startOnboarding: NextStep = {
    kind: "onboarding",
    href: "/onboarding/start",
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

    // No profile / application / agency yet, but the user just paid for
    // a subscription. Use the planId to skip the role chooser and route
    // straight to the relevant onboarding flow.
    const { subscriptions } = await import("@/db/schema");
    const { and, desc, eq: dEq, inArray } = await import("drizzle-orm");
    const [activeSub] = await drizzle
      .select({ planId: subscriptions.planId })
      .from(subscriptions)
      .where(
        and(
          dEq(subscriptions.userId, user.id),
          inArray(subscriptions.statusV2, [
            "trialing",
            "active",
            "past_due",
          ]),
        ),
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (activeSub?.planId === "pro-player") {
      return {
        kind: "onboarding",
        href: "/onboarding/player/apply",
      };
    }
    if (activeSub?.planId === "pro-agency") {
      return {
        kind: "onboarding",
        href: "/onboarding/manager/info",
      };
    }

    // Brand-new user (no profile, no application, no agency) → onboarding.
    return startOnboarding;
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
