"use client";

import clsx from "classnames";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import type {
  ClientDashboardNavSection,
  ClientDashboardNavItem,
} from "@/app/(dashboard)/dashboard/navigation";

export default function ClientDashboardSidebar({
  sections,
  onSignOut,
}: {
  sections: ClientDashboardNavSection[];
  onSignOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <nav className="space-y-8">
      {sections.map((section) => (
        <div key={section.id} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {section.title}
          </p>
          <div className="space-y-1">
            {section.items.map((item) => (
              <SidebarItem
                key={item.id}
                item={item}
                currentPath={pathname}
                pending={pending}
                onSignOut={() => startTransition(() => onSignOut())}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarItem({
  item,
  currentPath,
  pending,
  onSignOut,
}: {
  item: ClientDashboardNavItem;
  currentPath: string;
  pending: boolean;
  onSignOut: () => void;
}) {
  if (item.kind === "action") {
    return (
      <button
        type="button"
        onClick={onSignOut}
        disabled={pending}
        className="w-full rounded-md border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-left text-sm text-neutral-300 transition-colors hover:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <div className="font-medium text-neutral-100">
          {pending ? "Cerrando sesión..." : item.title}
        </div>
        {item.description ? (
          <p className="text-xs text-neutral-500">{item.description}</p>
        ) : null}
      </button>
    );
  }

  const active = isActive(currentPath, item.href);

  return (
    <Link
      href={item.href}
      className={clsx(
        "block rounded-md border px-3 py-2 text-sm transition-colors",
        active
          ? "border-neutral-700 bg-neutral-900 text-neutral-100"
          : "border-neutral-800 bg-neutral-950/40 text-neutral-300 hover:bg-neutral-900"
      )}
      data-active={active}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-neutral-100">{item.title}</span>
        {item.badge ? (
          <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs text-neutral-300">{item.badge}</span>
        ) : null}
      </div>
      {item.description ? (
        <p className="mt-1 text-xs text-neutral-500">{item.description}</p>
      ) : null}
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
