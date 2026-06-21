// Information architecture for the DASHBOARD dock (players + coaches).
//
//   Players: Panel · Perfil · Plantilla · Ajustes
//   Coaches: Panel · Perfil · Ajustes
//
// Built by REGROUPING the existing dashboard navigation (navigation.ts — the
// single route source of truth) into dock tabs, layering i18n labels on top by
// item id. Routes are never duplicated here: hrefs come straight from
// navigation.ts. The first section ("dashboard") becomes a direct-navigate
// Panel tab; the others become sheet groups.

import type { ClientDashboardNavSection } from "@/app/[locale]/(dashboard)/dashboard/navigation";
import type { DockGroup, DockIconName, DockItem } from "../types";

type Translate = (key: string, values?: Record<string, string | number>) => string;

// section id (navigation.ts) → dock tab meta
const GROUP_META: Record<string, { id: string; labelKey: string; titleKey: string; icon: DockIconName }> = {
  // Player sections. "edit-profile" + "settings" are reused by the coach IA
  // (coaches share the same section ids; only their item ids differ); managers
  // add their own sections below.
  "edit-profile": { id: "profile", labelKey: "tabs.profile", titleKey: "profile.title", icon: "user" },
  "edit-template": { id: "template", labelKey: "tabs.template", titleKey: "template.title", icon: "layout" },
  settings: { id: "settings", labelKey: "tabs.settings", titleKey: "settings.title", icon: "cog" },
  // Manager/agency sections (a dock only ever renders one role, so the shared
  // "template"/"settings" group ids never collide with the player ones).
  agency: { id: "agency", labelKey: "tabs.agency", titleKey: "agency.title", icon: "briefcase" },
  "agency-management": { id: "management", labelKey: "tabs.management", titleKey: "management.title", icon: "users" },
  "agency-template": { id: "template", labelKey: "tabs.template", titleKey: "agencyTemplate.title", icon: "layout" },
};

// item id (navigation.ts) → label/desc i18n keys + icon
const ITEM_META: Record<string, { labelKey: string; descKey: string; icon: DockIconName }> = {
  "personal-data": { labelKey: "profile.personalData", descKey: "profile.personalDataDesc", icon: "user" },
  "football-data": { labelKey: "profile.footballData", descKey: "profile.footballDataDesc", icon: "trophy" },
  multimedia: { labelKey: "profile.multimedia", descKey: "profile.multimediaDesc", icon: "play" },
  translations: { labelKey: "profile.languages", descKey: "profile.languagesDesc", icon: "globe" },
  "template-styles": { labelKey: "template.styles", descKey: "template.stylesDesc", icon: "sparkle" },
  "template-structure": { labelKey: "template.structure", descKey: "template.structureDesc", icon: "grid" },
  account: { labelKey: "settings.account", descKey: "settings.accountDesc", icon: "lock" },
  subscription: { labelKey: "settings.subscription", descKey: "settings.subscriptionDesc", icon: "creditcard" },
  logout: { labelKey: "settings.signOut", descKey: "settings.signOutDesc", icon: "logout" },
  // Coach (DT) items
  "coach-edit": { labelKey: "coach.profileData", descKey: "coach.profileDataDesc", icon: "user" },
  "coach-career": { labelKey: "coach.career", descKey: "coach.careerDesc", icon: "trophy" },
  "coach-licenses": { labelKey: "coach.licenses", descKey: "coach.licensesDesc", icon: "award" },
  "coach-multimedia": { labelKey: "coach.multimedia", descKey: "coach.multimediaDesc", icon: "play" },
  "coach-translations": { labelKey: "coach.languages", descKey: "coach.languagesDesc", icon: "globe" },
  // Manager/agency items
  "agency-profile": { labelKey: "agency.profile", descKey: "agency.profileDesc", icon: "user" },
  "agency-services": { labelKey: "agency.services", descKey: "agency.servicesDesc", icon: "sparkle" },
  "agency-reach": { labelKey: "agency.reach", descKey: "agency.reachDesc", icon: "globe" },
  "agency-collaborations": { labelKey: "agency.collaborations", descKey: "agency.collaborationsDesc", icon: "share" },
  "agency-multimedia": { labelKey: "agency.multimedia", descKey: "agency.multimediaDesc", icon: "play" },
  "agency-translations": { labelKey: "agency.languages", descKey: "agency.languagesDesc", icon: "globe" },
  "manager-profile": { labelKey: "management.managerProfile", descKey: "management.managerProfileDesc", icon: "user" },
  "agency-players": { labelKey: "management.players", descKey: "management.playersDesc", icon: "trophy" },
  "agency-staff": { labelKey: "management.staff", descKey: "management.staffDesc", icon: "users" },
  "agency-template-styles": { labelKey: "agencyTemplate.styles", descKey: "agencyTemplate.stylesDesc", icon: "sparkle" },
  "agency-template-structure": { labelKey: "agencyTemplate.structure", descKey: "agencyTemplate.structureDesc", icon: "grid" },
};

export function buildDashboardGroups(
  sections: ClientDashboardNavSection[],
  t: Translate,
  opts: { isPro: boolean },
): DockGroup[] {
  const groups: DockGroup[] = [];

  for (const section of sections) {
    if (section.id === "dashboard") {
      const home = section.items.find((i) => i.kind === "link");
      groups.push({
        id: "panel",
        label: t("tabs.panel"),
        icon: "panel",
        kind: "page",
        href: home && home.kind === "link" ? home.href : "/dashboard",
      });
      continue;
    }

    const gmeta = GROUP_META[section.id];
    if (!gmeta) continue; // skip sections outside the player IA (manager-only)

    const children: DockItem[] = section.items.map((it) => {
      const imeta = ITEM_META[it.id] ?? {
        labelKey: "",
        descKey: "",
        icon: "chevron" as DockIconName,
      };
      const item: DockItem = {
        id: it.id,
        label: imeta.labelKey ? t(imeta.labelKey) : it.title,
        desc: imeta.descKey ? t(imeta.descKey) : it.description,
        icon: imeta.icon,
      };
      if (it.kind === "action") {
        item.action = "sign-out";
        item.danger = true;
      } else {
        item.href = it.href;
        // Show the PRO pill on "Idiomas" (player + coach + agency) only to free users.
        if (
          (it.id === "translations" ||
            it.id === "coach-translations" ||
            it.id === "agency-translations") &&
          !opts.isPro
        )
          item.pro = true;
      }
      return item;
    });

    groups.push({
      id: gmeta.id,
      label: t(gmeta.labelKey),
      icon: gmeta.icon,
      kind: "sheet",
      sheetLabel: t(gmeta.titleKey),
      sheetMeta: t("sectionsCount", { count: children.length }),
      children,
    });
  }

  return groups;
}

/**
 * Resolve the active tab + current sub-route from the pathname. Mirrors the
 * desktop sidebar's `resolveActiveHref` (exact match wins; else the longest
 * href that is a path prefix, with bare /dashboard excluded so deep routes
 * don't light up Panel).
 */
export function resolveDashboardActive(
  groups: DockGroup[],
  pathname: string,
): { activeGroupId: string; activeHref: string | null } {
  let bestHref: string | null = null;
  let bestLen = -1;
  let bestGroupId = "panel";

  for (const g of groups) {
    const candidates: { href: string; groupId: string }[] = [];
    if (g.kind === "page" && g.href) candidates.push({ href: g.href, groupId: g.id });
    for (const c of g.children ?? []) {
      if (c.href) candidates.push({ href: c.href, groupId: g.id });
    }
    for (const { href, groupId } of candidates) {
      if (pathname === href) return { activeGroupId: groupId, activeHref: href };
      if (href !== "/dashboard" && pathname.startsWith(`${href}/`) && href.length > bestLen) {
        bestLen = href.length;
        bestHref = href;
        bestGroupId = groupId;
      }
    }
  }

  return { activeGroupId: bestGroupId, activeHref: bestHref };
}

/** Returns a copy of `groups` with `current` set on the active sub-route row. */
export function markCurrent(groups: DockGroup[], activeHref: string | null): DockGroup[] {
  if (!activeHref) return groups;
  return groups.map((g) =>
    g.children
      ? { ...g, children: g.children.map((c) => (c.href === activeHref ? { ...c, current: true } : c)) }
      : g,
  );
}
