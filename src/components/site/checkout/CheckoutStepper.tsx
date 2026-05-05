// Progress indicator across the checkout flow.
// Step 1 (Plan) lives on /pricing. Step 2 (Pago) is /checkout/[planId].
// Step 3 (Confirmación) covers processing → success.

import { Check } from "lucide-react";

export type CheckoutStepKey = "plan" | "payment" | "confirmation";

export type CheckoutStepperProps = {
  /** Currently active step. Done = anything before; pending = anything after. */
  current: CheckoutStepKey;
};

const STEPS: { key: CheckoutStepKey; label: string }[] = [
  { key: "plan", label: "Plan" },
  { key: "payment", label: "Pago" },
  { key: "confirmation", label: "Confirmación" },
];

export default function CheckoutStepper({ current }: CheckoutStepperProps) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);

  return (
    <ol
      className="bh-glass mx-auto flex w-full max-w-2xl items-center gap-2 rounded-bh-pill p-2 md:gap-3 md:p-2.5"
      aria-label="Pasos del checkout"
    >
      {STEPS.map((step, idx) => {
        const state =
          idx < currentIdx ? "done" : idx === currentIdx ? "active" : "pending";
        const isLast = idx === STEPS.length - 1;
        return (
          <li
            key={step.key}
            className="flex flex-1 items-center gap-2 md:gap-3"
            aria-current={state === "active" ? "step" : undefined}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors duration-150 ${
                state === "done"
                  ? "border-bh-success/40 bg-bh-success/15 text-bh-success"
                  : state === "active"
                    ? "border-bh-lime/50 bg-bh-lime/15 text-bh-lime"
                    : "border-white/[0.10] bg-white/[0.03] text-bh-fg-3"
              }`}
            >
              {state === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : idx + 1}
            </span>
            <span
              className={`text-[12px] font-semibold uppercase tracking-[0.10em] transition-colors duration-150 ${
                state === "active"
                  ? "text-bh-fg-1"
                  : state === "done"
                    ? "text-bh-fg-2"
                    : "text-bh-fg-4"
              }`}
            >
              {step.label}
            </span>
            {!isLast && (
              <span
                aria-hidden
                className={`hidden h-px flex-1 md:block ${
                  state === "done" ? "bg-bh-success/30" : "bg-white/[0.08]"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
