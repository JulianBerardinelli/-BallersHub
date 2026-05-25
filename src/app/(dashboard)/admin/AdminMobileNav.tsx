"use client";

import * as React from "react";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  useDisclosure,
} from "@heroui/react";
import { ChevronDown, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { AdminNavLink } from "./AdminNavLink";

type NavItem = { href: string; label: string };
type NavSection = { title: string; items: NavItem[] };
type AdminCounts = Record<string, number | undefined>;

export function AdminMobileNav({
  sections,
  counts,
}: {
  sections: NavSection[];
  counts: AdminCounts;
}) {
  const pathname = usePathname();
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  const activeItem = React.useMemo(() => {
    for (const s of sections) {
      for (const it of s.items) {
        if (pathname === it.href || pathname.startsWith(`${it.href}/`)) {
          return it;
        }
      }
    }
    return { href: "/admin", label: "Inicio" };
  }, [sections, pathname]);

  React.useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center justify-between gap-3 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 px-4 py-3 text-left transition-colors hover:border-white/[0.16]"
      >
        <span className="flex min-w-0 items-center gap-3">
          <Menu className="size-4 shrink-0 text-bh-fg-3" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-bh-fg-4">
              Sección admin
            </span>
            <span className="truncate text-sm font-medium text-bh-fg-1">
              {activeItem.label}
            </span>
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-bh-fg-3" />
      </button>

      <Drawer
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="left"
        size="xs"
        backdrop="blur"
        classNames={{
          base: "bg-bh-surface-1 border-r border-white/[0.08]",
        }}
      >
        <DrawerContent>
          {() => (
            <>
              <DrawerHeader className="flex flex-col gap-1 px-4 pb-2 pt-5">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-bh-fg-4">
                  Panel admin
                </span>
                <span className="text-base font-semibold text-bh-fg-1">
                  Navegación
                </span>
              </DrawerHeader>
              <DrawerBody className="px-3 pb-6">
                <nav className="space-y-5">
                  {sections.map((section) => (
                    <div key={section.title} className="space-y-1.5">
                      <p className="px-2 font-bh-display text-[10px] font-bold uppercase tracking-[0.14em] text-bh-fg-4">
                        {section.title}
                      </p>
                      <div className="space-y-0.5">
                        {section.items.map((item) => (
                          <AdminNavLink
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            badgeCount={counts[item.href]}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </nav>
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
