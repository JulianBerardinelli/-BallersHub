"use client";

import { useEffect } from "react";
import { trackProActivation } from "@/lib/analytics/ga";

type Props = {
  sessionId: string;
  planId?: string | null;
  currency?: string | null;
  value?: number | null;
  processor?: string | null;
};

/**
 * Fires the GA4 `pro_activation` funnel event exactly once per completed
 * checkout session. sessionStorage-guarded so refreshing /checkout/success
 * doesn't double-count the conversion. Renders nothing.
 *
 * The success page mounts this ONLY when there's a real completed session, so
 * the legacy/bookmark fallback (no session) never fires a false activation.
 */
export default function CheckoutSuccessAnalytics({
  sessionId,
  planId,
  currency,
  value,
  processor,
}: Props) {
  useEffect(() => {
    const key = `ga_pro_activation:${sessionId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage unavailable (private mode) — fall through and fire
      // once per mount; a rare double-count beats missing the conversion.
    }
    trackProActivation({ planId, currency, value, processor });
  }, [sessionId, planId, currency, value, processor]);

  return null;
}
