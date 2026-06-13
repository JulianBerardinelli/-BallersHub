import { getTranslations } from "next-intl/server";

import { signOutAction } from "@/app/actions/auth";
import UserMenu from "./UserMenu";
import InOutButtons from "./InOutButtons";
import { getSiteNavSession } from "@/components/layout/site-nav-session";

// AuthGate renders inside the (site) layout shell on every request. The
// logged-in user + profile + plan are resolved by `getSiteNavSession` — a
// request-cached resolver shared with the mobile dock (PublicDockGate), so the
// DB work runs ONCE per request even though both consume it. That resolver
// owns the hardened try/catch (auth/DB blips degrade gracefully instead of
// 500-ing the layout); here we just map the result to the menu.
export default async function AuthGate() {
  const session = await getSiteNavSession();

  if (!session) {
    return (
      <div className="flex items-center gap-3">
        <InOutButtons />
      </div>
    );
  }

  const t = await getTranslations("common");

  return (
    <UserMenu
      displayName={session.displayName ?? t("userMenu.defaultName")}
      email={session.user.email ?? ""}
      handle={session.handle}
      avatarUrl={session.avatarUrl}
      role={session.isManager ? "manager" : "player"}
      agencySlug={session.agencySlug ?? undefined}
      managerApplicationStatus={session.managerApplicationStatus}
      hasPlayerProfile={session.hasPlayerProfile}
      playerSlug={session.playerSlug}
      applicationStatus={session.applicationStatus}
      onboardingHref={session.onboardingHref}
      onSignOut={signOutAction}
    />
  );
}
