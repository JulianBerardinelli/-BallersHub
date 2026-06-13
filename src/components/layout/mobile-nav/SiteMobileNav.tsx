"use client";

// Left hamburger drawer for the corporate / marketing nav. Mounted in the
// site header (md:hidden trigger) and present across the site + dashboard
// chrome — the company menu "lives everywhere", independent of the bottom
// dock (handoff §4). Uses HeroUI Drawer (portal + backdrop + scroll-lock +
// focus-trap + ESC for free), mirroring the dashboard sidebar's mobile drawer.

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  ScrollShadow,
  useDisclosure,
} from "@heroui/react";
import {
  Menu,
  X,
  Users,
  Building2,
  Sparkles,
  BadgeCheck,
  Newspaper,
  Info,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { SITE_NAV } from "@/components/layout/nav-items";

// Corporate nav key → icon (decorative; labels come from common.nav.*).
const NAV_ICON: Record<string, LucideIcon> = {
  players: Users,
  agencies: Building2,
  plans: Sparkles,
  howWeValidate: BadgeCheck,
  blog: Newspaper,
  about: Info,
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteMobileNav({
  className = "",
  isAuthed = false,
}: {
  className?: string;
  /** When false (guest), the drawer shows sign-in / create-account CTAs. */
  isAuthed?: boolean;
}) {
  const tCommon = useTranslations("common");
  const tNav = useTranslations("mobileNav");
  const pathname = usePathname();
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  // Auto-close when the route changes (link tapped).
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        aria-label={tNav("drawer.open")}
        className={`inline-flex size-9 shrink-0 items-center justify-center rounded-bh-md border border-white/[0.08] bg-white/[0.04] text-bh-fg-1 transition-colors hover:bg-white/[0.08] ${className}`}
      >
        <Menu size={18} strokeWidth={1.8} aria-hidden />
      </button>

      <Drawer
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="left"
        size="xs"
        classNames={{
          base: "bg-bh-black text-bh-fg-1",
          backdrop: "bg-black/60 backdrop-blur-sm",
          closeButton: "hidden",
        }}
      >
        <DrawerContent>
          {(close) => (
            <>
              <DrawerHeader className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
                <Wordmark size="nav" />
                <button
                  type="button"
                  onClick={close}
                  aria-label={tNav("drawer.close")}
                  className="inline-flex size-9 items-center justify-center rounded-bh-md border border-white/[0.08] bg-white/[0.04] text-bh-fg-2 transition-colors hover:text-bh-fg-1"
                >
                  <X size={18} strokeWidth={1.8} aria-hidden />
                </button>
              </DrawerHeader>

              <DrawerBody className="px-3 py-4">
                <p className="px-3 pb-2 font-bh-display text-[10px] font-bold uppercase tracking-[0.18em] text-bh-fg-4">
                  {tNav("drawer.navLabel")}
                </p>
                <ScrollShadow className="max-h-[calc(100vh-9rem)]">
                  <nav className="flex flex-col gap-1" aria-label={tNav("drawer.navLabel")}>
                    {SITE_NAV.map((item) => {
                      const Icon = NAV_ICON[item.key] ?? ChevronRight;
                      const active = isActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={close}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center gap-3 rounded-bh-md border px-3 py-3 text-[14px] font-medium transition-colors ${
                            active
                              ? "border-bh-lime/25 bg-bh-lime/[0.06] text-bh-lime"
                              : "border-transparent text-bh-fg-2 hover:bg-white/[0.04] hover:text-bh-fg-1"
                          }`}
                        >
                          <Icon
                            size={17}
                            strokeWidth={active ? 2 : 1.7}
                            className="shrink-0"
                            aria-hidden
                          />
                          <span className="flex-1">{tCommon(`nav.${item.key}`)}</span>
                          <ChevronRight size={15} className="shrink-0 text-bh-fg-4" aria-hidden />
                        </Link>
                      );
                    })}
                  </nav>
                </ScrollShadow>

                {/* Guests: sign-in / create-account CTAs (the dock shows the
                    avatar/account when logged in, so only render for guests). */}
                {!isAuthed && (
                  <div className="mt-4 flex flex-col gap-2 border-t border-white/[0.08] px-3 pt-4">
                    <Link
                      href="/auth/sign-up"
                      onClick={close}
                      className="flex h-11 items-center justify-center rounded-bh-md bg-bh-lime text-[14px] font-semibold text-bh-black transition-colors hover:bg-[#d8ff26]"
                    >
                      {tCommon("authButtons.create")}
                    </Link>
                    <Link
                      href="/auth/sign-in"
                      onClick={close}
                      className="flex h-11 items-center justify-center rounded-bh-md border border-white/[0.14] text-[14px] font-semibold text-bh-fg-2 transition-colors hover:bg-white/[0.06] hover:text-bh-fg-1"
                    >
                      {tCommon("auth.signIn")}
                    </Link>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-white/[0.08] px-3 pt-4">
                  <span className="font-bh-display text-[10px] font-bold uppercase tracking-[0.18em] text-bh-fg-4">
                    {tCommon("localeSwitcher.label")}
                  </span>
                  <LocaleSwitcher />
                </div>
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
