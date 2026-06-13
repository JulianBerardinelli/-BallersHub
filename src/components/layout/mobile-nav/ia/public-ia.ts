// Information architecture for the PUBLIC dock (marketing site).
//
//   guest      → Inicio · Red · Planes · Acceder (CTA → login/signup)
//   logged-in  → Inicio · Red · Planes* · Avatar (→ "Tu cuenta" sheet)
//
// * /pricing is hidden from the dock for paid (Pro) users — it stays only in
//   the hamburger drawer. "Red" = the talent network, route /players.

import type { DockGroup, DockItem, DockUser } from "../types";

type Translate = (key: string, values?: Record<string, string | number>) => string;

export type PublicDockData = {
  user: DockUser | null;
  /** Paid user — when true, the /pricing tab is dropped from the dock. */
  isPro: boolean;
  /** Public profile path (/{slug} or /agency/{slug}); null when none yet. */
  publicHref: string | null;
};

export function buildPublicGroups(
  { user, isPro, publicHref }: PublicDockData,
  t: Translate,
): DockGroup[] {
  const groups: DockGroup[] = [
    { id: "home", label: t("tabs.home"), icon: "home", kind: "page", href: "/" },
    { id: "network", label: t("tabs.network"), icon: "search", kind: "page", href: "/players" },
  ];

  if (!isPro) {
    groups.push({
      id: "plans",
      label: t("tabs.plans"),
      icon: "sparkle",
      kind: "page",
      href: "/pricing",
    });
  }

  groups.push(user ? accountGroup(user, publicHref, t) : guestGroup(t));
  return groups;
}

function guestGroup(t: Translate): DockGroup {
  return {
    id: "account",
    label: t("tabs.access"),
    icon: "user",
    kind: "cta",
    sheetLabel: t("access.title"),
    sheetMeta: "ballershub.com",
    children: [
      { id: "login", label: t("access.login"), desc: t("access.loginDesc"), icon: "lock", action: "login" },
      {
        id: "signup",
        label: t("access.signup"),
        desc: t("access.signupDesc"),
        icon: "plus",
        action: "signup",
        highlight: true,
      },
    ],
  };
}

function accountGroup(user: DockUser, publicHref: string | null, t: Translate): DockGroup {
  const children: DockItem[] = [
    {
      id: "panel",
      label: t("account.goPanel"),
      desc: t("account.goPanelDesc"),
      icon: "home",
      href: "/dashboard",
      highlight: true,
    },
  ];

  if (publicHref) {
    children.push({
      id: "view",
      label: t("account.viewProfile"),
      desc: `ballershub.com${publicHref}`,
      icon: "eye",
      href: publicHref,
    });
    children.push({
      id: "share",
      label: t("account.share"),
      desc: t("account.shareDesc"),
      icon: "share",
      action: "share",
      trailing: "share",
    });
  }

  children.push({
    id: "logout",
    label: t("account.signOut"),
    desc: t("account.signOutDesc"),
    icon: "logout",
    action: "sign-out",
    danger: true,
  });

  return {
    id: "account",
    label: t("tabs.account"),
    icon: "user",
    kind: "account",
    sheetLabel: t("account.title"),
    children,
  };
}

/** Which tab the pill sits under, by route. Secondary pages reached via the
 *  drawer (/agencies, /blog, /about, /como-validamos) match nothing — the dock
 *  then hides the pill rather than light the wrong tab. */
export function publicActiveGroupId(pathname: string): string {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/players")) return "network";
  if (pathname.startsWith("/pricing")) return "plans";
  return "__none__";
}
