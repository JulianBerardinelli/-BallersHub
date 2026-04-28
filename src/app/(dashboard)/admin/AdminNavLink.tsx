"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNavLink({
  href,
  label,
  badgeCount,
}: {
  href: string;
  label: string;
  badgeCount?: number;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, href);

  const base =
    "flex items-center justify-between gap-2 rounded-bh-md border px-3 py-2 text-[13px] transition-colors";
  const stateClass = active
    ? "border-[rgba(204,255,0,0.22)] bg-[rgba(204,255,0,0.06)] text-bh-lime"
    : "border-transparent text-bh-fg-2 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-bh-fg-1";

  const showBadge = !!badgeCount && badgeCount > 0;
  const display = badgeCount && badgeCount > 99 ? "99+" : badgeCount;

  return (
    <Link href={href} className={`${base} ${stateClass}`} data-active={active}>
      <span className={active ? "font-medium" : ""}>{label}</span>
      {showBadge ? (
        <span
          className={
            active
              ? "min-w-[20px] rounded-full bg-bh-lime px-1.5 text-center font-bh-mono text-[10px] font-bold leading-[18px] text-bh-black"
              : "min-w-[20px] rounded-full bg-bh-danger px-1.5 text-center font-bh-mono text-[10px] font-bold leading-[18px] text-bh-fg-1"
          }
        >
          {display}
        </span>
      ) : null}
    </Link>
  );
}
