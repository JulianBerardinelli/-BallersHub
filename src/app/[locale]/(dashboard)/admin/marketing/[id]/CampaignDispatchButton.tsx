"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, AlertTriangle } from "lucide-react";
import { dispatchCampaignNow } from "../actions";

/**
 * "Send now" trigger from the campaign detail page. Confirms with the
 * admin (uses native `confirm()` for now) and then calls the server
 * action that runs `runCampaign` synchronously.
 *
 * Note: synchronous dispatch is fine for early-stage volumes (<5k).
 * When we cross that, Phase 4 swaps this for a queue/cron trigger.
 */
export default function CampaignDispatchButton({
  campaignId,
  currentStatus,
}: {
  campaignId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (
      !window.confirm(
        "Esto va a enviar el email a TODA la audiencia resuelta (después de suppression + cap de frecuencia). ¿Confirmás?",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await dispatchCampaignNow({ campaignId, applyFrequencyCap: true });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const label = currentStatus === "failed" ? "Reintentar envío" : "Enviar ahora";

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 rounded-bh-md bg-bh-lime px-5 py-2.5 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {label}
      </button>
      {error ? (
        <div className="flex items-start gap-2 rounded-bh-md border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] p-2 text-[12px] text-bh-danger">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}
