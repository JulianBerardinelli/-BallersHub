// Public API for the mobile nav system. CLIENT-SAFE exports only — the server
// gate (PublicDockGate) and the server resolver (site-nav-session) are imported
// by their direct paths so server-only code never enters a client bundle.
//
// See docs/nav/mobile-nav.md for the architecture overview.

export { FloatingDock, type FloatingDockProps } from "./FloatingDock";
export { PublicDock, type PublicDockProps } from "./PublicDock";
export { DashboardDock, type DashboardDockProps } from "./DashboardDock";
export { SiteMobileNav } from "./SiteMobileNav";
export type { DockGroup, DockItem, DockUser, DockIconName, DockGroupKind, DockItemAction } from "./types";
