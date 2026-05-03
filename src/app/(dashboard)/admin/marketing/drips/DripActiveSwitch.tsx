"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toggleDripActive } from "./actions";

/**
 * Lime-styled toggle switch for activating / pausing a drip config.
 * Optimistic — flips the UI immediately and rolls back if the action errors.
 */
export default function DripActiveSwitch({
  dripId,
  initial,
}: {
  dripId: string;
  initial: boolean;
}) {
  const [isActive, setIsActive] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !isActive;
    setIsActive(next);
    startTransition(async () => {
      try {
        await toggleDripActive({ dripId, isActive: next });
      } catch {
        setIsActive(!next);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      role="switch"
      aria-checked={isActive}
      className={[
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150",
        isActive ? "bg-bh-lime" : "bg-white/[0.12]",
        isPending ? "opacity-60 cursor-wait" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block size-4 transform rounded-full bg-bh-fg-1 shadow transition-transform duration-150",
          isActive ? "translate-x-[18px] bg-bh-black" : "translate-x-[2px]",
        ].join(" ")}
      />
      {isPending ? (
        <Loader2 className="absolute -right-5 size-3 animate-spin text-bh-fg-3" />
      ) : null}
    </button>
  );
}
