// /checkout/receipt?internal=...
//
// In-app preview of the receipt that we email to the user after a
// successful checkout. Renders the same layout the email uses (header,
// summary, totals, footer) so users have a print/share-ready version
// without needing the email open.
//
// Auth-gated to the user that owns the session.

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Mail, Receipt as ReceiptIcon } from "lucide-react";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { db } from "@/lib/db";
import { checkoutSessions, billingAddresses } from "@/db/schema";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import {
  isCheckoutPlanId,
  isCheckoutCurrency,
  getPlanPrice,
  TRIAL_DAYS,
} from "@/lib/billing/plans";
import { PLAN_COPY } from "@/components/site/checkout/data";
import { CURRENCY_GLYPH } from "@/components/site/pricing/data";

export async function generateMetadata() {
  const t = await getTranslations("checkout");
  return {
    title: t("meta.receiptTitle"),
    robots: { index: false, follow: false },
  };
}

type PageProps = {
  searchParams: Promise<{ internal?: string }>;
};

export default async function CheckoutReceiptPage({ searchParams }: PageProps) {
  const t = await getTranslations("checkout");
  const { internal } = await searchParams;
  if (!internal) notFound();

  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/sign-in?redirectTo=${encodeURIComponent(`/checkout/receipt?internal=${internal}`)}`);
  }

  const session = await loadSession(internal);
  if (!session) notFound();

  // Best-effort owner check. The receipt URL contains a UUID so it's
  // already not guessable, but this doubles down.
  if (session.userId && session.userId !== user.id) notFound();

  if (!isCheckoutPlanId(session.planId) || !isCheckoutCurrency(session.currency)) {
    notFound();
  }
  const planCopy = PLAN_COPY[session.planId];
  const price = getPlanPrice(session.planId, session.currency);
  const glyph = CURRENCY_GLYPH[session.currency];

  const billing = session.billingAddressId
    ? await loadBilling(session.billingAddressId)
    : null;

  const issuedAt = (session.completedAt ?? session.createdAt).toLocaleString(
    "es-AR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
  const trialEnds = new Date(Date.now() + TRIAL_DAYS * 24 * 3600 * 1000);
  const trialEndsShort = trialEnds.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Link
          href={`/checkout/success?internal=${session.id}`}
          className="inline-flex items-center gap-2 rounded-bh-md border border-white/[0.10] bg-white/[0.02] px-3 py-1.5 text-[12px] font-semibold text-bh-fg-2 transition-colors duration-150 hover:border-white/[0.18] hover:text-bh-fg-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("receipt.backToConfirmation")}
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={`mailto:${user.email ?? ""}`}
            className="inline-flex items-center gap-1.5 rounded-bh-md border border-white/[0.10] bg-white/[0.02] px-3 py-1.5 text-[12px] font-semibold text-bh-fg-2 hover:text-bh-fg-1"
          >
            <Mail className="h-3.5 w-3.5" />
            {t("receipt.resendByEmail")}
          </a>
          {/* Print-to-PDF works as a poor-man's "Download". A real PDF
              endpoint can replace this in Phase 3. */}
          <button
            type="button"
            // Server Components can't have onClick — wrap in a small
            // client island when we want a real handler. For now use a
            // global script via `Print` keyboard shortcut hint.
            className="inline-flex items-center gap-1.5 rounded-bh-md bg-bh-lime px-3 py-1.5 text-[12px] font-semibold text-bh-black hover:bg-[#d8ff26]"
          >
            <Download className="h-3.5 w-3.5" />
            {t("receipt.downloadPdf")}
          </button>
        </div>
      </div>

      {/* Receipt card — printable layout */}
      <article className="bh-glass-strong mx-auto max-w-2xl overflow-hidden rounded-bh-xl">
        <header className="flex items-center justify-between gap-4 border-b border-white/[0.08] bg-black/30 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-bh-md border border-white/[0.10] bg-white/[0.04] text-bh-lime">
              <ReceiptIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-bh-fg-4">
                {t("receipt.subscriptionReceipt")}
              </p>
              <p className="font-bh-heading text-base font-bold text-bh-fg-1">
                &apos;BallersHub
              </p>
            </div>
          </div>
          <div className="text-right text-[11px] text-bh-fg-3">
            <p className="font-bh-mono uppercase tracking-[0.10em] text-bh-fg-4">
              {t("receipt.number", { number: session.id.slice(0, 8) })}
            </p>
            <p className="mt-1">{issuedAt}</p>
          </div>
        </header>

        <div className="space-y-6 px-6 py-6">
          {/* Customer */}
          <section className="grid gap-4 md:grid-cols-2">
            <Block label={t("receipt.customer")}>
              <p className="text-[13px] font-semibold text-bh-fg-1">
                {billing?.fullName ?? user.email}
              </p>
              <p className="text-[12px] text-bh-fg-3">{user.email}</p>
            </Block>
            <Block label={t("receipt.billing")}>
              {billing ? (
                <div className="text-[12px] leading-[1.5] text-bh-fg-2">
                  <p>{billing.streetLine1}</p>
                  {billing.streetLine2 && <p>{billing.streetLine2}</p>}
                  <p>
                    {[billing.city, billing.state, billing.postalCode]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <p className="font-bh-mono text-[11px] uppercase tracking-[0.10em] text-bh-fg-3">
                    {billing.countryCode}
                    {billing.taxId ? ` · ${billing.taxIdType ?? "ID"}: ${billing.taxId}` : ""}
                  </p>
                </div>
              ) : (
                <p className="text-[12px] text-bh-fg-4">
                  {t("receipt.noBillingData")}
                </p>
              )}
            </Block>
          </section>

          {/* Items */}
          <section>
            <Block label={t("receipt.concept")}>
              <div className="mt-2 overflow-hidden rounded-bh-md border border-white/[0.08]">
                <div className="grid grid-cols-[1fr_auto] gap-4 bg-black/20 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-bh-fg-4">
                  <span>{t("receipt.detail")}</span>
                  <span>{t("receipt.total")}</span>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-4">
                  <div>
                    <p className="text-[13px] font-semibold text-bh-fg-1">
                      {planCopy.name}
                    </p>
                    <p className="mt-1 text-[12px] text-bh-fg-3">
                      {t("receipt.lineDescription", { trialDays: TRIAL_DAYS })}
                    </p>
                    <p className="mt-1 text-[11.5px] text-bh-fg-4">
                      {t("receipt.trialActiveUntil", { date: trialEndsShort })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bh-display text-xl font-black text-bh-fg-1">
                      {glyph}
                      {price.amount}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.10em] text-bh-fg-4">
                      {t("receipt.currencyPerYear", { currency: session.currency })}
                    </p>
                  </div>
                </div>
              </div>
            </Block>
          </section>

          {/* Totals */}
          <section className="space-y-2 border-t border-white/[0.08] pt-4 text-[13px]">
            <Total label={t("receipt.subtotal")}>
              {glyph}
              {price.amount} {session.currency}
            </Total>
            <Total
              label={t("receipt.trialLine", { trialDays: TRIAL_DAYS })}
              variant="muted"
            >
              −{glyph}
              {price.amount} {session.currency}
            </Total>
            <Total label={t("receipt.totalDueToday")} variant="strong">
              {glyph}0 {session.currency}
            </Total>
          </section>

          {/* Payment + footer */}
          <section className="space-y-2 border-t border-white/[0.08] pt-4 text-[11.5px] text-bh-fg-3">
            <p>
              {t.rich("receipt.processedBy", {
                processor:
                  session.processor === "mercado_pago"
                    ? t("common.processorMercadoPago")
                    : t("common.processorStripe"),
                date: trialEndsShort,
                strong: (chunks) => (
                  <strong className="text-bh-fg-2">{chunks}</strong>
                ),
              })}
            </p>
            <p>
              {t.rich("receipt.supportLine", {
                supportEmail: (chunks) => (
                  <Link
                    href="mailto:info@ballershub.co"
                    className="text-bh-lime hover:underline"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-bh-fg-4">
        {label}
      </p>
      {children}
    </div>
  );
}

function Total({
  label,
  variant = "default",
  children,
}: {
  label: string;
  variant?: "default" | "muted" | "strong";
  children: React.ReactNode;
}) {
  const labelCls =
    variant === "strong"
      ? "text-[12px] font-bold uppercase tracking-[0.14em] text-bh-fg-1"
      : "text-[12px] uppercase tracking-[0.10em] text-bh-fg-3";
  const valueCls =
    variant === "strong"
      ? "font-bh-display text-base font-black text-bh-lime"
      : variant === "muted"
        ? "font-bh-mono text-[12px] text-bh-fg-3"
        : "font-bh-mono text-[12px] text-bh-fg-2";
  return (
    <div className="flex items-center justify-between">
      <span className={labelCls}>{label}</span>
      <span className={valueCls}>{children}</span>
    </div>
  );
}

async function loadSession(internal: string) {
  try {
    const [row] = await db
      .select()
      .from(checkoutSessions)
      .where(eq(checkoutSessions.id, internal))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}

async function loadBilling(addressId: string) {
  try {
    const [row] = await db
      .select()
      .from(billingAddresses)
      .where(eq(billingAddresses.id, addressId))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}
