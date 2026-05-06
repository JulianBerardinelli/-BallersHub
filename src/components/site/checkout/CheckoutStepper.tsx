// Checkout stepper. Three steps: Plan → Pago → Confirmación.
// Visual matches the Claude Design handoff: 26px numbered circles with a
// lime glow on the active step, a check icon on done steps, and short
// separator lines between them.

import { Check } from "lucide-react";

export type CheckoutStepKey = "plan" | "payment" | "confirmation";

export type CheckoutStepperProps = {
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
      className="flex items-center justify-center gap-3 md:gap-4"
      aria-label="Pasos del checkout"
    >
      {STEPS.map((step, idx) => {
        const state =
          idx < currentIdx ? "done" : idx === currentIdx ? "active" : "pending";
        const isLast = idx === STEPS.length - 1;

        return (
          <li
            key={step.key}
            className="flex items-center gap-2.5 md:gap-3"
            aria-current={state === "active" ? "step" : undefined}
          >
            <span
              className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full font-bh-mono text-[12px] transition-all duration-200 ${
                state === "active"
                  ? "border border-bh-lime bg-bh-lime text-bh-black shadow-[0_0_0_6px_rgba(204,255,0,0.08)]"
                  : state === "done"
                    ? "border border-bh-lime bg-transparent text-bh-lime"
                    : "border border-white/[0.12] bg-bh-surface-1 text-bh-fg-2"
              }`}
            >
              {state === "done" ? (
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              ) : (
                idx + 1
              )}
            </span>
            <span
              className={`font-bh-display text-[13px] font-bold uppercase tracking-[0.06em] transition-colors duration-200 ${
                state === "active" || state === "done"
                  ? "text-bh-fg-1"
                  : "text-bh-fg-3"
              }`}
            >
              {step.label}
            </span>
            {!isLast && (
              <span
                aria-hidden
                className={`hidden h-px w-14 transition-colors duration-200 md:block ${
                  state === "done" ? "bg-bh-lime/50" : "bg-white/[0.12]"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
