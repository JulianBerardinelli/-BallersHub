import Link from "next/link";
import type { LockAction, SectionLock } from "@/lib/dashboard/client/permissions";

function actionClasses(action?: LockAction): string {
  if (!action) return "";
  if (action.tone === "warning") {
    return "inline-flex items-center justify-center rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-black transition-colors hover:bg-amber-400";
  }
  return "inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-500";
}

export default function LockedSection(lock: SectionLock) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-6">
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-white">{lock.title}</h2>
        <p className="text-sm text-neutral-300">{lock.description}</p>
        {lock.action ? (
          <Link href={lock.action.href} className={actionClasses(lock.action)}>
            {lock.action.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
