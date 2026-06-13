"use client";

// FloatingDock — the single, data-driven mobile dock.
//
// A glass capsule anchored to the bottom that MORPHS into a bottom-sheet of
// sub-sections. One component, three contexts (public guest / public authed /
// dashboard) — the difference is just `groups` + `user`. Geometry, curves and
// durations follow the design handoff (docs/nav/mobile-nav.md §1–§2) to the
// pixel; the sliding pill is generalized to N tabs so the public dock can drop
// from 4 (guest/free) to 3 (Pro hides /pricing) without special-casing.
//
// Rendered through a portal to document.body so `position: fixed` references
// the viewport, not a transformed ancestor — the marketing pages use scroll
// transforms everywhere (same reason TutorialDock portals).

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import "./mobile-nav.css";
import { DockIcon } from "./icons";
import { useDockMotion } from "./useDockMotion";
import type { DockGroup, DockItem, DockItemAction, DockUser } from "./types";

// Geometry (handoff §2).
const ITEM_H = 58;
const GAP = 5;
const HEAD_SIMPLE = 36;
const HEAD_ACCOUNT = 76;
const FG_2 = "rgba(255,255,255,0.70)";
const FG_3 = "rgba(255,255,255,0.45)";
const FG_4 = "rgba(255,255,255,0.25)";
const ON_ACCENT = "#0a0a0a"; // sits on top of the lime pill

export type FloatingDockProps = {
  groups: DockGroup[];
  /** Group whose tab the pill sits under, by route. */
  activeGroupId: string;
  user?: DockUser | null;
  /** Brand accent as a hex string (mirrors --bh-lime-200). Parameterizable. */
  accent?: string;
  /** Danger color for destructive rows (#EF4444 dashboard / #FF5C5C public). */
  dangerColor?: string;
  showLabels?: boolean;
  /** Animation speed factor (1 = production). */
  speed?: number;
  /** Open a sheet on mount (preview/testing only). */
  initialOpen?: string | null;
  ariaLabel?: string;
  /** Extra classes on the portal root — used to CSS-gate by breakpoint
   *  (e.g. "md:hidden" / "lg:hidden") so desktop never renders the dock. */
  className?: string;
  onNavigate: (href: string) => void;
  onAction: (action: DockItemAction, item: DockItem) => void;
};

export function FloatingDock({
  groups,
  activeGroupId,
  user = null,
  accent = "#CCFF00",
  dangerColor = "#EF4444",
  showLabels = true,
  speed = 1,
  initialOpen = null,
  ariaLabel = "Navegación",
  className = "",
  onNavigate,
  onAction,
}: FloatingDockProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState<string | null>(initialOpen);
  const { reduce, d, delay } = useDockMotion(speed);

  useEffect(() => setMounted(true), []);

  // Lock body scroll while a sheet is open (the scrim covers the page).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!mounted) return null;

  const n = Math.max(1, groups.length);
  const focusGroupId = open ?? activeGroupId;
  const rawIdx = groups.findIndex((g) => g.id === focusGroupId);
  // On secondary pages reached via the drawer (e.g. /blog, /about) no tab is
  // "current", so hide the pill rather than light the wrong tab. It reappears
  // and slides as soon as a sheet opens (focus follows `open`).
  const hasFocus = rawIdx >= 0;
  const idx = Math.max(0, rawIdx);
  const openGroup = groups.find((g) => g.id === open) ?? null;

  const isAccountSheet = openGroup?.kind === "account" && !!user;
  const headH = openGroup ? (isAccountSheet ? HEAD_ACCOUNT : HEAD_SIMPLE) : 0;
  const childCount = openGroup?.children?.length ?? 0;
  const sheetH = openGroup
    ? headH + childCount * ITEM_H + Math.max(0, childCount - 1) * GAP + 16
    : 0;

  const tapGroup = (g: DockGroup) => {
    if (g.kind === "page") {
      if (g.href) onNavigate(g.href);
      setOpen(null);
      return;
    }
    setOpen(open === g.id ? null : g.id);
  };

  const tapItem = (c: DockItem) => {
    setOpen(null);
    if (c.action) {
      onAction(c.action, c);
    } else if (c.href) {
      onNavigate(c.href);
    }
  };

  const pillW = `calc((100% - 10px) / ${n})`;
  const pillLeft = `calc(5px + ${idx} * ((100% - 10px) / ${n}))`;

  return createPortal(
    <div className={`bh-dock-root${className ? ` ${className}` : ""}`} aria-label={ariaLabel}>
      {/* Scrim */}
      <div
        onClick={() => setOpen(null)}
        aria-hidden={!open}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 55,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: open ? "blur(4px)" : "none",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: `opacity ${d(300)} var(--dock-ease-sheet)`,
        }}
      />

      {/* Dock wrapper — full-width but only the capsule is interactive */}
      <div
        style={{
          position: "fixed",
          left: 16,
          right: 16,
          bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
          display: "flex",
          justifyContent: "center",
          zIndex: 60,
          pointerEvents: "none",
        }}
      >
        <nav
          aria-label={ariaLabel}
          style={{
            width: "100%",
            maxWidth: 374,
            background: "var(--bh-dock-surface, rgba(15,15,15,0.94))",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: open ? 28 : 34,
            backdropFilter: "blur(28px) saturate(160%)",
            boxShadow: open
              ? `0 24px 70px rgba(0,0,0,0.7), 0 -10px 70px ${accent}12, inset 0 1px 0 rgba(255,255,255,0.07)`
              : "0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
            overflow: "hidden",
            pointerEvents: "auto",
            transition: `border-radius ${d(420)} var(--dock-ease-sheet), box-shadow ${d(420)} var(--dock-ease-sheet)`,
          }}
        >
          {/* Expandable sheet */}
          <div
            role="dialog"
            aria-modal={open ? true : undefined}
            aria-hidden={!open}
            style={{
              height: sheetH,
              overflow: "hidden",
              transition: `height ${d(440)} var(--dock-ease-sheet)`,
            }}
          >
            {openGroup && (
              <div key={openGroup.id} style={{ padding: "16px 12px 0" }}>
                <SheetHeader
                  group={openGroup}
                  user={isAccountSheet ? user : null}
                  accent={accent}
                  d={d}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                  {openGroup.children?.map((c, i) => (
                    <SheetRow
                      key={c.id}
                      item={c}
                      index={i}
                      accent={accent}
                      dangerColor={dangerColor}
                      onTap={() => tapItem(c)}
                      d={d}
                      delay={delay}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tab row + sliding pill */}
          <div
            style={{
              position: "relative",
              display: "flex",
              padding: 5,
              height: showLabels ? 62 : 54,
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: 5,
                bottom: 5,
                left: pillLeft,
                width: pillW,
                borderRadius: 999,
                background: accent,
                boxShadow: `0 3px 16px ${accent}55`,
                opacity: hasFocus ? 1 : 0,
                transition: `left ${d(380)} var(--dock-ease-pill), opacity ${d(220)} linear`,
              }}
            />
            {groups.map((g) => {
              const focused = focusGroupId === g.id;
              const ctaIdle = g.kind === "cta" && !focused;
              const isAvatar = g.kind === "account" && !!user;
              const expanded = open === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  className="bh-dock-tap"
                  onClick={() => tapGroup(g)}
                  aria-label={g.label}
                  aria-expanded={g.kind === "page" ? undefined : expanded}
                  aria-current={focused && g.kind === "page" ? "page" : undefined}
                  style={{
                    flex: 1,
                    zIndex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 3,
                    background: "transparent",
                    border: "none",
                    padding: 0,
                  }}
                >
                  {isAvatar && user ? (
                    <span style={{ position: "relative", lineHeight: 0 }}>
                      <DockAvatar
                        initials={user.initials}
                        avatarUrl={user.avatarUrl}
                        size={showLabels ? 23 : 27}
                        ringColor={focused ? ON_ACCENT : `${accent}55`}
                      />
                      <span
                        style={{
                          position: "absolute",
                          bottom: -1,
                          right: -1,
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "var(--bh-live, #22E06B)",
                          border: `1.5px solid ${focused ? accent : "#0f0f0f"}`,
                          animation:
                            focused || reduce
                              ? "none"
                              : `bh-dock-live-pulse ${d(2200)} ease-in-out infinite`,
                        }}
                      />
                    </span>
                  ) : (
                    <DockIcon
                      name={g.icon}
                      size={18}
                      color={focused ? ON_ACCENT : ctaIdle ? accent : "rgba(255,255,255,0.55)"}
                      strokeWidth={focused ? 2.1 : 1.7}
                    />
                  )}
                  {showLabels && (
                    <span
                      style={{
                        fontFamily: "var(--font-bh-body), 'DM Sans', sans-serif",
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: "0.03em",
                        color: focused ? ON_ACCENT : ctaIdle ? accent : "rgba(255,255,255,0.45)",
                        transition: `color ${d(220)} linear`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {g.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------

type DurFn = (ms: number) => string;
type DelayFn = (ms: number) => number;

function SheetHeader({
  group,
  user,
  accent,
  d,
}: {
  group: DockGroup;
  user: DockUser | null;
  accent: string;
  d: DurFn;
}) {
  const headIn = `bh-dock-head-in ${d(300)} var(--dock-ease-in) both`;

  if (user) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "2px 8px 14px",
          animation: headIn,
        }}
      >
        <span style={{ position: "relative" }}>
          <DockAvatar
            initials={user.initials}
            avatarUrl={user.avatarUrl}
            size={42}
            ringColor={`${accent}55`}
          />
          <span
            style={{
              position: "absolute",
              bottom: 1,
              right: 1,
              width: 11,
              height: 11,
              borderRadius: "50%",
              background: "var(--bh-live, #22E06B)",
              border: "2px solid #0f0f0f",
            }}
          />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span
              style={{
                fontFamily: "var(--font-bh-display), 'Barlow Condensed', sans-serif",
                fontWeight: 800,
                fontSize: 16,
                color: "#fff",
                letterSpacing: "0.01em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.name}
            </span>
            <span
              style={{
                flexShrink: 0,
                fontFamily: "var(--font-bh-display), 'Barlow Condensed', sans-serif",
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "2px 7px",
                borderRadius: 999,
                background: user.isPro ? `${accent}1F` : "rgba(255,255,255,0.06)",
                color: user.isPro ? accent : FG_3,
                border: `1px solid ${user.isPro ? `${accent}48` : "rgba(255,255,255,0.07)"}`,
              }}
            >
              {user.plan}
            </span>
          </div>
          {user.handle && (
            <div
              style={{
                fontFamily: "var(--font-bh-mono), 'DM Mono', monospace",
                fontSize: 11,
                color: FG_3,
                marginTop: 3,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.handle}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 8px 12px",
        animation: headIn,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-bh-display), 'Barlow Condensed', sans-serif",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: FG_3,
        }}
      >
        {group.sheetLabel}
      </span>
      {group.sheetMeta && (
        <span
          style={{
            fontFamily: "var(--font-bh-mono), 'DM Mono', monospace",
            fontSize: 10,
            color: FG_4,
            letterSpacing: "0.04em",
          }}
        >
          {group.sheetMeta}
        </span>
      )}
    </div>
  );
}

function SheetRow({
  item,
  index,
  accent,
  dangerColor,
  onTap,
  d,
  delay,
}: {
  item: DockItem;
  index: number;
  accent: string;
  dangerColor: string;
  onTap: () => void;
  d: DurFn;
  delay: DelayFn;
}) {
  const tint = item.danger ? dangerColor : accent;
  const lit = item.highlight || item.current || item.danger;
  const trailing = item.current ? "dot" : (item.trailing ?? "chevron");

  return (
    <button
      type="button"
      className="bh-dock-tap"
      onClick={onTap}
      aria-current={item.current ? "page" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: ITEM_H,
        padding: "0 12px",
        borderRadius: 17,
        width: "100%",
        textAlign: "left",
        background: lit && !item.danger ? `${accent}12` : "rgba(255,255,255,0.03)",
        border: `1px solid ${lit && !item.danger ? `${accent}40` : "rgba(255,255,255,0.05)"}`,
        animation: `bh-dock-item-in ${d(380)} var(--dock-ease-in) both`,
        animationDelay: `${delay(index * 38)}ms`,
      }}
    >
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          flexShrink: 0,
          background: item.danger
            ? `${dangerColor}1A`
            : lit
              ? `${accent}1A`
              : "rgba(255,255,255,0.05)",
          border: `1px solid ${
            item.danger ? `${dangerColor}40` : lit ? `${accent}40` : "rgba(255,255,255,0.07)"
          }`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <DockIcon
          name={item.icon}
          size={15}
          color={item.danger ? dangerColor : lit ? accent : FG_2}
          strokeWidth={1.8}
        />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontFamily: "var(--font-bh-body), 'DM Sans', sans-serif",
            fontSize: 13.5,
            fontWeight: 600,
            color: item.danger ? tint : item.highlight || item.current ? accent : "#fff",
          }}
        >
          {item.label}
          {item.pro && (
            <span
              style={{
                fontFamily: "var(--font-bh-display), 'Barlow Condensed', sans-serif",
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.12em",
                padding: "2px 6px",
                borderRadius: 5,
                background: `${accent}1F`,
                color: accent,
                border: `1px solid ${accent}40`,
              }}
            >
              PRO
            </span>
          )}
        </span>
        {item.desc && (
          <span
            style={{
              display: "block",
              fontFamily: "var(--font-bh-body), 'DM Sans', sans-serif",
              fontSize: 11,
              color: FG_3,
              marginTop: 2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.desc}
          </span>
        )}
      </span>
      {trailing === "dot" ? (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: accent,
            boxShadow: `0 0 10px ${accent}90`,
            flexShrink: 0,
          }}
        />
      ) : (
        <DockIcon
          name={trailing === "share" ? "share" : "chevron"}
          size={13}
          color={lit ? tint : FG_4}
        />
      )}
    </button>
  );
}

function DockAvatar({
  initials,
  avatarUrl,
  size,
  ringColor,
}: {
  initials: string;
  avatarUrl: string | null;
  size: number;
  ringColor: string;
}) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: "#2C2C2C",
        border: `1.5px solid ${ringColor}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- tiny (≤42px), below-the-fold nav avatar; not an LCP candidate.
        <img
          src={avatarUrl}
          alt=""
          width={size}
          height={size}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span
          style={{
            fontFamily: "var(--font-bh-display), 'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: size * 0.4,
            color: "rgba(255,255,255,0.7)",
            letterSpacing: "0.03em",
          }}
        >
          {initials}
        </span>
      )}
    </span>
  );
}
