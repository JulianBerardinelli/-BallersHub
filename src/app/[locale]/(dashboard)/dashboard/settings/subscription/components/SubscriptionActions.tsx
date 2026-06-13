"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { ArrowUpRight, Loader2, ShieldOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { bhButtonClass } from "@/components/ui/BhButton";

type Props = {
  processor: "stripe" | "mercado_pago";
  cancelAtPeriodEnd: boolean;
};

export default function SubscriptionActions({
  processor,
  cancelAtPeriodEnd,
}: Props) {
  const t = useTranslations("dashSettings");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function handlePortal() {
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ return_url: "/dashboard/settings/subscription" }),
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, t("subscription.stripePortalRequestFailed")));
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch (err) {
      setError(toErrorString(err));
    }
  }

  async function handleCancel() {
    setError(null);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, t("subscription.cancelRequestFailed")));
      }
      setConfirming(false);
      startTransition(() => {
        router.replace("/dashboard/settings/subscription?canceled=1");
        router.refresh();
      });
    } catch (err) {
      setError(toErrorString(err));
    }
  }

  if (processor === "stripe") {
    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5 text-[13px] text-bh-fg-2">
            <p className="font-semibold text-bh-fg-1">{t("subscription.stripePortalTitle")}</p>
            <p className="text-bh-fg-3">
              {t("subscription.stripePortalDescription")}
            </p>
          </div>
          <button
            type="button"
            onClick={handlePortal}
            disabled={pending}
            className={bhButtonClass({ variant: "lime", size: "sm" })}
          >
            {t("subscription.openPortal")}
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
        {cancelAtPeriodEnd && (
          <p className="rounded-bh-md border border-bh-warning/30 bg-bh-warning/10 px-3 py-2 text-[12.5px] text-bh-warning">
            {t("subscription.cancelScheduledNotice")}
          </p>
        )}
        {error && <p className="text-[12.5px] text-bh-danger">{error}</p>}
      </div>
    );
  }

  // Mercado Pago — no hosted portal; offer cancel directly.
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5 text-[13px] text-bh-fg-2">
          <p className="font-semibold text-bh-fg-1">{t("subscription.cancelTitle")}</p>
          <p className="text-bh-fg-3">
            {t("subscription.cancelDescription")}
          </p>
        </div>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={bhButtonClass({ variant: "danger-soft", size: "sm" })}
          >
            <ShieldOff className="h-4 w-4" />
            {t("subscription.cancel")}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={bhButtonClass({ variant: "ghost", size: "sm" })}
            >
              {t("subscription.back")}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={pending}
              className={bhButtonClass({ variant: "danger", size: "sm" })}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldOff className="h-4 w-4" />
              )}
              {t("subscription.confirmCancel")}
            </button>
          </div>
        )}
      </div>
      {error && <p className="text-[12.5px] text-bh-danger">{error}</p>}
    </div>
  );
}

/**
 * Read an error response and produce a human-readable string. Falls back
 * to the HTTP status when the body shape is unexpected — never returns
 * "[object Object]".
 */
async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return `${fallback}: ${res.status}`;
  }
  if (body && typeof body === "object") {
    const errVal = (body as Record<string, unknown>).error;
    if (typeof errVal === "string") return errVal;
    if (errVal && typeof errVal === "object" && typeof (errVal as Record<string, unknown>).message === "string") {
      return (errVal as Record<string, unknown>).message as string;
    }
  }
  return `${fallback}: ${res.status}`;
}

function toErrorString(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (typeof o.message === "string") return o.message;
    try {
      return JSON.stringify(err);
    } catch {
      return "Error desconocido.";
    }
  }
  return String(err);
}
