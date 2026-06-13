# Mobile Navigation — "Floating Dock" + Hamburger Drawer

Mobile-only navigation system for BallersHub. Desktop is unchanged: the dock
and drawer only appear below the breakpoints listed here. Built from the Claude
Design handoff "Floating Dock" (hi-fi spec).

> **TL;DR** — One generic component (`FloatingDock`) renders three contexts from
> data. A left hamburger drawer (`SiteMobileNav`) carries the corporate nav.
> Everything is portaled to `document.body`, i18n-aware, and reduced-motion safe.

---

## 1. The three contexts

| Context | Where it mounts | Breakpoint | Tabs |
|---|---|---|---|
| **Public — guest** | `(site)` layout | `< md` (768px) | Inicio · Red · Planes · **Acceder** (sheet → login/signup) |
| **Public — logged in** | `(site)` layout | `< md` | Inicio · Red · Planes\* · **Avatar** (sheet → panel / perfil público / compartir / salir) |
| **Dashboard (players)** | `/dashboard` layout | `< lg` (1024px) | Panel · Perfil · Plantilla · Ajustes |

\* `/pricing` is hidden from the dock for **paid (Pro)** users — it stays in the
hamburger drawer only. "Red" = the talent network, route `/players`.

The **hamburger drawer** (corporate nav: Jugadores · Agencias · Pricing · Cómo
validamos · Blog · Nosotros + locale switcher) lives in the site header and is
present across both the site and the dashboard (`< md`), independent of the dock.

Managers/agencies keep the existing dashboard mobile drawer
(`ClientDashboardSidebarMobile`) for now — the dashboard dock is players-only.
Player public profiles (`/[slug]`) and `/agency/[slug]` have their own chrome
and never show this nav.

---

## 2. File map

```
src/components/layout/
  nav-items.ts                 # SITE_NAV — single source for corporate links
  site-nav-session.ts          # getSiteNavSession() — request-cached user+plan
                               #   resolver shared by AuthGate + PublicDockGate
  HeaderChrome.tsx             # renders <SiteMobileNav> (md:hidden) + desktop nav
  SiteHeader.tsx               # hides the auth cluster < md (dock carries it)
  mobile-nav/
    index.ts                   # client-safe barrel
    types.ts                   # DockGroup / DockItem / DockUser
    icons.tsx                  # handoff icon name -> lucide-react
    mobile-nav.css             # keyframes + tap + reduced-motion (.bh-dock-root)
    useDockMotion.ts           # speed + prefers-reduced-motion -> duration helper
    FloatingDock.tsx           # THE dock (tab row + pill + morph sheet + scrim)
    SignOutConfirmModal.tsx    # shared confirm (reuses common.userMenu strings)
    DockToast.tsx              # ephemeral "Link copiado" toast
    SiteMobileNav.tsx          # hamburger + HeroUI Drawer (corporate nav)
    PublicDock.tsx             # client: public IA + router/share/signout wiring
    DashboardDock.tsx          # client: dashboard IA + signout wiring
    PublicDockGate.tsx         # server: resolves user/plan -> <PublicDock>
    ia/public-ia.ts            # buildPublicGroups() + publicActiveGroupId()
    ia/dashboard-ia.ts         # buildDashboardGroups() + active resolver
```

Mount points:
- `(site)/layout.tsx` → `<PublicDockGate />` + `max-md:pb-32` on `main`.
- `(dashboard)/dashboard/layout.tsx` → `<DashboardDock>` for players (`!isManager`);
  the player mobile sidebar is skipped; `max-lg:pb-32` clears the dock.
- `HeaderChrome.tsx` → `<SiteMobileNav className="md:hidden" />`.

---

## 3. Design tokens (globals.css)

The dock reuses the existing `--bh-*` system; only these were added:

| Token | Value | Use |
|---|---|---|
| `--bh-live` / `--color-bh-live` | `#22E06B` | "usuario activo" green dot |
| `--bh-dock-surface` | `rgba(15,15,15,0.94)` | dock glass background |
| `--bh-ease-sheet` | `cubic-bezier(.32,.72,0,1)` | sheet morph + height (iOS) |
| `--bh-ease-pill` | `cubic-bezier(.34,1.45,.4,1)` | tab pill spring overshoot |
| `--bh-ease-dock-in` | `cubic-bezier(.22,1,.36,1)` | item/header entrance |
| `--bh-ease-press` | `cubic-bezier(.34,1.5,.4,1)` | tap feedback |
| `--tutorial-dock-bottom` | responsive | lifts TutorialDock above the dock `< lg` |

Accent is parameterizable — `FloatingDock` takes an `accent` hex (default
`#CCFF00`, mirrors `--bh-lime-200`) so alpha-tints (`${accent}12`, `40`, `55`)
match the handoff. Fonts come from the existing `--font-bh-display` (Barlow
Condensed, labels/headers), `--font-bh-body` (DM Sans), `--font-bh-mono`
(DM Mono, counts/@slug).

---

## 4. Animation & geometry (handoff §1–§2)

- Capsule morph (border-radius 34→28 + shadow): **420ms** `ease-sheet`.
- Sheet height: **440ms** `ease-sheet` (`sheetH = head + n·58 + (n−1)·5 + 16`).
- Pill `left`: **380ms** `ease-pill`; width `(100% − 10px)/n`, generalized to N tabs.
- Items: stagger **38ms·i**, fade + rise 16px + scale .97, `ease-dock-in`.
- Tap scale .94 (160ms); live-dot pulse 2200ms.
- `prefers-reduced-motion` (via `useDockMotion` + a CSS backstop) zeroes
  durations and drops the pulse.

Geometry: bottom `16px + safe-area`, max-width **374px** centered, item **58px**,
tab row **62px** (labels). Hit targets ≥ 44px. Portaled to `document.body` so
`position: fixed` is not broken by the marketing pages' scroll transforms.

---

## 5. Data flow

`getSiteNavSession()` (`site-nav-session.ts`) is wrapped in React `cache()` and
resolves `{ user, isManager, displayName, handle, slug, avatarUrl, isPro,
publicHref, … }` once per request. **Both** `AuthGate` (header menu) and
`PublicDockGate` (dock) consume it, so the DB work runs once. It owns the
hardened try/catch — an auth/DB blip degrades to the guest dock / minimal menu
instead of 500-ing the layout.

- **Plan gating**: `resolvePlanAccess(subscription).isPro` decides whether
  `/pricing` shows in the dock and whether the "Idiomas" PRO pill appears.
- **Public profile link**: `publicHref` = `/{slug}` (player, only when
  `visibility==='public' && status==='approved'`) or `/agency/{slug}` (manager).
- **Sign out**: the existing `signOutAction` server action, via `useTransition`
  behind a confirm modal. **Never** a client-side `supabase.auth.signOut()`.
- **Share**: Web Share API with a clipboard fallback (`DockToast` confirms copy).
- **Routing**: all links go through `Link`/`useRouter` from `@/i18n/navigation`
  (locale-agnostic hrefs; the active locale prefix is injected automatically).

---

## 6. i18n

`mobileNav` namespace (`src/i18n/messages/{es,en,it,pt}/mobileNav.json`,
registered in `src/i18n/request.ts`). Corporate drawer links reuse the existing
`common.nav.*` keys; the sign-out confirm reuses `common.userMenu.*` /
`common.actions.*`. Add a key to all four locale files (es is the source).

---

## 7. How to…

**Relabel/reorder a corporate drawer link** → edit `SITE_NAV` in
`src/components/layout/nav-items.ts` (and add the `common.nav.*` label). Both the
desktop header and the drawer update.

**Add a tab to the public dock** → add a `DockGroup` in
`ia/public-ia.ts` (`buildPublicGroups`) and, if it's a page tab, a case in
`publicActiveGroupId`. Add labels to `mobileNav.tabs.*`.

**Change the dashboard dock IA** → it is derived from `navigation.ts`
(the route source of truth). Edit `ia/dashboard-ia.ts`'s `GROUP_META` / `ITEM_META`
maps (labels resolve from `mobileNav`, hrefs come from `navigation.ts`).

**Change a group's behavior** → set `DockGroup.kind`: `page` (navigate),
`sheet` (sub-section sheet), `account` (avatar + "Tu cuenta"), `cta` (accent CTA
sheet, e.g. Acceder).

**Re-skin** → pass a different `accent` hex to `FloatingDock` (it propagates to
the pill, tints, PRO pill, live dot ring).

---

## 8. QA

Dev preview at **`/nav-preview`** (dev-only, 404 in prod) switches between
guest / free / pro / dashboard with mock data. Resize the viewport below `md`
(public) or `lg` (dashboard) to see the dock. Compare against the handoff
`Mobile Nav Redesign v2.html`.

Checklist: pill morph/stagger match; `/pricing` drops for Pro; account sheet
links; share copies; sign-out confirms; active section highlighted in the
dashboard; reduced-motion disables animation; safe-area inset on notch devices;
dock absent on desktop and on `/[slug]` portfolios.
