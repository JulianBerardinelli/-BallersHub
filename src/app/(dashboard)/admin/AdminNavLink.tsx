"use client";

import Link from "next/link";
import { Badge } from "@heroui/react";

export function AdminNavLink({ href, label, badgeCount }: { href: string; label: string; badgeCount?: number }) {
  const link = (
    <Link
      href={href}
      className="block w-full rounded-md px-3 py-2 hover:bg-neutral-900 border border-neutral-800 data-[active=true]:bg-neutral-900"
      data-active={false}
    >
      <span>{label}</span>
    </Link>
  );

  if (!badgeCount || badgeCount === 0) {
    return link;
  }

  return (
    <Badge
      content={badgeCount > 99 ? "99+" : badgeCount}
      color="primary"
      size="sm"
      placement="top-right"
      classNames={{
        base: "relative block w-full",
        badge: "px-1.5 py-0.5 text-[10px] font-semibold border-none rounded-full",
      }}
    >
      {link}
    </Badge>
  );
}
