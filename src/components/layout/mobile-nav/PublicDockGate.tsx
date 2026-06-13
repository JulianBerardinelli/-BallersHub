// Server gate for the public dock. Resolves the logged-in user + plan via the
// request-cached `getSiteNavSession` (shared with AuthGate — one fetch per
// request) and renders the client PublicDock. Mounted in the (site) layout.
//
// Imported by its direct path (not the barrel) so this server-only module
// never leaks into a client bundle.

import { getTranslations } from "next-intl/server";

import { signOutAction } from "@/app/actions/auth";
import { getSiteNavSession } from "@/components/layout/site-nav-session";
import { PublicDock } from "./PublicDock";
import type { DockUser } from "./types";

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function PublicDockGate() {
  const session = await getSiteNavSession();

  if (!session) {
    return (
      <PublicDock user={null} isPro={false} publicHref={null} onSignOut={signOutAction} />
    );
  }

  const t = await getTranslations("common");
  const name = session.displayName ?? t("userMenu.defaultName");

  const dockUser: DockUser = {
    name,
    initials: initialsFrom(name),
    handle: session.handle,
    plan: session.isPro ? "Pro" : "Free",
    isPro: session.isPro,
    avatarUrl: session.avatarUrl,
  };

  return (
    <PublicDock
      user={dockUser}
      isPro={session.isPro}
      publicHref={session.publicHref}
      onSignOut={signOutAction}
    />
  );
}
