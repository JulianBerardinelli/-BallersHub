// /checkout/processing?internal=...
//
// Intermediate page rendered after the user returns from the processor
// while we wait for the webhook to confirm the payment. Polls the local
// checkout_sessions row every few seconds; redirects to /success or
// /failure as soon as we have a definitive state.

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck, Sparkles } from "lucide-react";
import CheckoutStepper from "@/components/site/checkout/CheckoutStepper";

const POLL_INTERVAL_MS = 2500;
const MAX_WAIT_MS = 60_000;

type SessionStatus =
  | "pending"
  | "redirected"
  | "completed"
  | "failed"
  | "expired";

type StatusResponse = { status: SessionStatus | "unknown" };

export default function CheckoutProcessingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const internal = params.get("internal");

  const [elapsed, setElapsed] = useState(0);
  const [statusLabel, setStatusLabel] = useState("Confirmando con el procesador…");

  useEffect(() => {
    if (!internal) {
      router.replace("/pricing");
      return;
    }

    let cancelled = false;
    const startedAt = Date.now();

    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(
          `/api/billing/checkout-status?internal=${encodeURIComponent(internal)}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const data = (await res.json()) as StatusResponse;
          if (data.status === "completed") {
            router.replace(`/checkout/success?internal=${internal}`);
            return;
          }
          if (data.status === "failed" || data.status === "expired") {
            router.replace(`/checkout/failure?internal=${internal}`);
            return;
          }
        }
      } catch {
        // Network blip — keep polling.
      }

      const total = Date.now() - startedAt;
      setElapsed(total);
      if (total >= MAX_WAIT_MS) {
        // Long-running confirmation — likely a non-card method (cash /
        // transfer). Bounce to the pending page where we explain.
        router.replace(`/checkout/pending?internal=${internal}`);
        return;
      }
      if (total > 15_000) {
        setStatusLabel("Esto está tomando un poco más de lo normal…");
      }
    };

    void tick();
    const id = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [internal, router]);

  return (
    <div className="space-y-10">
      <CheckoutStepper current="confirmation" />

      <section className="mx-auto max-w-xl space-y-7 py-4 text-center">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border border-bh-lime/30 bg-bh-lime/10 text-bh-lime">
          <Loader2 className="h-7 w-7 animate-spin" />
        </span>

        <div className="space-y-3">
          <h1 className="font-bh-display text-3xl font-black uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
            Procesando tu pago
          </h1>
          <p className="text-[14px] leading-[1.6] text-bh-fg-2">{statusLabel}</p>
        </div>

        <div className="bh-glass mx-auto max-w-md space-y-3 rounded-bh-xl p-5 text-left text-[12.5px] text-bh-fg-2">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-bh-success" />
            <span>Tu pago está siendo verificado de forma segura.</span>
          </div>
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-bh-lime" />
            <span>
              No cierres esta ventana. Te llevamos a la confirmación apenas
              esté listo.
            </span>
          </div>
          <div
            aria-hidden
            className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]"
          >
            <div
              className="h-full bg-bh-lime/60 transition-[width] duration-300 ease-out"
              style={{ width: `${Math.min(100, (elapsed / MAX_WAIT_MS) * 100)}%` }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
