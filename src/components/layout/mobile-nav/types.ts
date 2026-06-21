// Shared types for the mobile "Floating Dock" nav system.
//
// The dock is ONE generic component (`FloatingDock`) driven entirely by data.
// The three contexts (public guest, public logged-in, dashboard) are just
// different `DockGroup[]` + `user` — never different components. See
// `docs/nav/mobile-nav.md`.

/** Icon set used by the dock. Mapped to lucide-react in `icons.tsx`. */
export type DockIconName =
  | "home"
  | "user"
  | "search"
  | "sparkle"
  | "lock"
  | "plus"
  | "eye"
  | "share"
  | "logout"
  | "trophy"
  | "play"
  | "globe"
  | "creditcard"
  | "cog"
  | "chevron"
  | "menu"
  | "bell"
  | "panel"
  | "layout"
  | "grid"
  | "briefcase"
  | "users";

/** Non-navigation actions a sheet row can fire instead of routing. */
export type DockItemAction = "sign-out" | "share" | "login" | "signup";

/** A leaf row rendered inside a group's bottom-sheet. */
export type DockItem = {
  id: string;
  label: string;
  desc?: string;
  icon: DockIconName;
  /** Locale-agnostic path to navigate to on tap. */
  href?: string;
  /** Fire a named action instead of navigating. */
  action?: DockItemAction;
  /** Show a PRO pill next to the label. */
  pro?: boolean;
  /** Danger styling (e.g. "Cerrar sesión"). */
  danger?: boolean;
  /** Accent-tinted "primary" row (e.g. "Crear mi perfil", "Ir a mi panel"). */
  highlight?: boolean;
  /** Trailing glyph. Defaults to "chevron"; "share" for share rows; the dock
   *  overrides to a current-dot when `current` is true. */
  trailing?: "chevron" | "share" | "none";
  /** Marks the row as the section the user is currently on (dashboard). */
  current?: boolean;
};

/** How a tab behaves when tapped. */
export type DockGroupKind = "page" | "sheet" | "account" | "cta";

/** A single tab in the dock. */
export type DockGroup = {
  id: string;
  /** Tab label rendered under the icon. */
  label: string;
  icon: DockIconName;
  kind: DockGroupKind;
  /** kind "page": navigate here on tap (locale-agnostic path). */
  href?: string;
  /** Sheet header title (kinds sheet/account/cta). */
  sheetLabel?: string;
  /** Right-aligned mono metadata in the sheet header (sheet/cta). */
  sheetMeta?: string;
  /** Rows shown in the bottom-sheet (kinds sheet/account/cta). */
  children?: DockItem[];
};

/** Logged-in user surfaced by the dock (avatar tab + account sheet header). */
export type DockUser = {
  name: string;
  /** 1–2 char initials fallback for the avatar. */
  initials: string;
  /** "@slug" handle shown under the name. */
  handle: string | null;
  /** Plan badge text, e.g. "Pro" | "Free". */
  plan: string;
  /** Drives the plan badge color (accent vs neutral). */
  isPro: boolean;
  avatarUrl: string | null;
};
