"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteCampaign } from "../actions";

/**
 * Confirm-then-delete button for draft/scheduled/failed campaigns.
 * Sent campaigns are not deletable from the UI (audit/legal trail).
 */
export default function CampaignDeleteButton({
  campaignId,
  campaignName,
}: {
  campaignId: string;
  campaignName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      // Auto-revert if the user moves on
      window.setTimeout(() => setConfirming(false), 4000);
      return;
    }
    startTransition(async () => {
      const result = await deleteCampaign({ campaignId });
      if (!result.ok) {
        alert(result.error);
      }
      setConfirming(false);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={`Eliminar campaña ${campaignName}`}
      className={[
        "inline-flex items-center gap-1.5 rounded-bh-md px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors",
        confirming
          ? "bg-bh-danger/15 text-bh-danger border border-[rgba(239,68,68,0.35)]"
          : "text-bh-fg-3 hover:bg-[rgba(239,68,68,0.08)] hover:text-bh-danger",
        isPending ? "opacity-60 cursor-not-allowed" : "",
      ].join(" ")}
    >
      <Trash2 className="size-3" />
      {confirming ? "Confirmar" : "Eliminar"}
    </button>
  );
}
