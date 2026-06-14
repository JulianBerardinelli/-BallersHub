"use client";

// Locale switcher that lives INSIDE the portfolio header pill (after the share
// icon). Same height/alignment as the rest of the nav by construction; on mobile
// it's part of the floating island. Only offers locales with a real translation;
// renders nothing for single-language profiles.
//
// Dropdown menu is portaled out of the header to `position: fixed` (anchored
// to the trigger via getBoundingClientRect). Reason: the agency Pro nav has
// `overflow-x-auto` so its children scroll horizontally; an absolutely-positioned
// menu inside that scroll context would be clipped by the rounded pill. `fixed`
// escapes every ancestor's overflow so the menu always renders on top.
// (Review Codex P2 on #214.)

import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const ORDER: Locale[] = ["es", "en", "it", "pt"];
const META: Record<Locale, { label: string; flag: string }> = {
  es: { label: "Español", flag: "🇦🇷" },
  en: { label: "English", flag: "🇬🇧" },
  it: { label: "Italiano", flag: "🇮🇹" },
  pt: { label: "Português", flag: "🇧🇷" },
};

export default function HeaderLocaleSwitcher({
  basePath,
  available,
  current,
}: {
  basePath: string;
  available: string[];
  current: string;
}) {
  const t = useTranslations("portfolio");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  // Trigger rect (top/right of the button in the viewport). Used to anchor the
  // fixed-position menu so it escapes the header's overflow-x scroll context.
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(
    null,
  );
  const locales = ORDER.filter((l) => available.includes(l));

  // Position the menu under the trigger every time it opens, and keep it in
  // sync on scroll/resize while open (the header is `position: fixed`, so the
  // trigger's viewport coords only change with those events).
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const measure = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      setAnchor({ top: r.bottom, right: window.innerWidth - r.right });
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [open]);

  if (locales.length <= 1) return null;

  const cur = META[current as Locale] ?? META.es;

  return (
    <div className="relative shrink-0">
      {/* Click-outside backdrop. */}
      {open ? (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[200] cursor-default"
        />
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("switcher.aria")}
        aria-expanded={open}
        className="pointer-events-auto flex items-center gap-1.5 rounded-full px-1.5 py-1 text-white/80 transition-colors hover:text-white md:px-2"
      >
        <span className="text-sm leading-none" aria-hidden>
          {cur.flag}
        </span>
        <span className="hidden text-[11px] font-bold uppercase tracking-[0.14em] md:inline">
          {current}
        </span>
        <ChevronDown
          className={`size-3.5 text-white/50 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && anchor ? (
        // `position: fixed` so the menu escapes any ancestor's overflow:auto
        // (the agency Pro nav has overflow-x-auto and would clip an absolutely
        // positioned dropdown — review Codex P2 on #214).
        <div
          className="fixed z-[210] min-w-[170px] overflow-hidden rounded-2xl border border-white/10 bg-black/80 p-1 shadow-[0_20px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          style={{ top: anchor.top + 8, right: anchor.right }}
        >
          {locales.map((loc) => {
            const isCur = loc === current;
            return (
              <Link
                key={loc}
                href={basePath}
                locale={loc}
                onClick={() => setOpen(false)}
                aria-current={isCur ? "true" : undefined}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors ${
                  isCur
                    ? "bg-bh-lime text-bh-black"
                    : "text-white/75 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                <span className="text-base leading-none" aria-hidden>
                  {META[loc].flag}
                </span>
                <span>{META[loc].label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
