import Link from "next/link";
import type { LockAction, SectionLock } from "@/lib/dashboard/client/permissions";

function actionClasses(action?: LockAction): string {
  if (!action) return "";
  if (action.tone === "warning") {
    return "inline-flex items-center justify-center rounded-bh-md bg-bh-warning px-4 py-2 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(245,158,11,0.3)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-amber-400";
  }
  return "inline-flex items-center justify-center rounded-bh-md bg-bh-lime px-4 py-2 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]";
}

export default function LockedSection(lock: SectionLock) {
  return (
    <div className="rounded-bh-lg border border-dashed border-white/[0.12] bg-bh-surface-1/60 p-6">
      <div className="space-y-3">
        <h2 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          {lock.title}
        </h2>
        <p className="text-sm leading-[1.6] text-bh-fg-3">{lock.description}</p>
        {lock.action ? (
          <Link href={lock.action.href} className={actionClasses(lock.action)}>
            {lock.action.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
