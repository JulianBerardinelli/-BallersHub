"use client";

// Floating owner-only nudge shown ONLY when:
//   • The profile's owner has a Pro subscription
//   • The currently rendered layout is FreeLayout (theme.layout === "free")
//   • The viewer's session matches the profile owner
//
// The first two checks are done server-side in page.tsx (which decides
// whether to mount this component at all by passing `ownerUserId`).
// The third (viewer === owner) is done client-side here so the public
// portfolio page can keep its ISR cache for anonymous viewers — we don't
// want to read cookies in the RSC.
//
// Until the auth check resolves, the nudge renders null. Once confirmed
// it fades in. Dismiss is page-session-local — disappears on refresh,
// which is intentional: we want to keep prompting the owner without
// making it a permanent badge of shame.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles, X } from "lucide-react";
import { bhButtonClass } from "@/components/ui/bh-button-class";
import { supabase } from "@/lib/supabase/client";

export default function OwnerProUpgradeNudge({ ownerUserId }: { ownerUserId: string }) {
  const [isOwner, setIsOwner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (cancelled) return;
        if (data.user?.id === ownerUserId) setIsOwner(true);
      })
      .catch(() => {
        // Silent — viewer is treated as not-owner, nudge stays hidden.
      });
    return () => {
      cancelled = true;
    };
  }, [ownerUserId]);

  if (!isOwner || dismissed) return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[80] flex justify-center sm:inset-auto sm:bottom-5 sm:right-5 sm:justify-end">
      <div
        role="status"
        className="pointer-events-auto relative w-full max-w-[360px] overflow-hidden rounded-2xl border border-bh-lime/25 bg-bh-surface-1/95 p-4 shadow-[0_18px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-300 sm:p-5"
      >
        {/* Lime accent glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(120% 80% at 100% 0%, rgba(204,255,0,0.14) 0%, transparent 60%)",
          }}
        />

        <button
          type="button"
          aria-label="Cerrar invitación"
          onClick={() => setDismissed(true)}
          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-bh-fg-4 transition-colors hover:bg-white/[0.06] hover:text-bh-fg-1"
        >
          <X size={14} />
        </button>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-bh-lime/30 bg-bh-lime/15 text-bh-lime">
            <Sparkles size={16} />
          </span>
          <div className="min-w-0">
            <p className="font-bh-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-bh-lime">
              Tu plan permite Pro Athlete
            </p>
            <p className="mt-1 pr-4 font-bh-display text-[15px] font-extrabold uppercase leading-[1.15] tracking-[-0.005em] text-bh-fg-1">
              Estás publicando en Free Editorial
            </p>
            <p className="mt-1.5 text-[12px] leading-[1.5] text-bh-fg-3">
              Cambiá a la plantilla Pro Athlete cuando quieras: hero cinemático,
              parallax y galería editorial.
            </p>
          </div>
        </div>

        <div className="mt-3.5 flex items-center gap-2">
          <Link
            href="/dashboard/edit-template/styles"
            className={bhButtonClass({ variant: "lime", size: "sm" })}
          >
            Activar Pro Athlete
            <ArrowUpRight size={14} />
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className={bhButtonClass({ variant: "ghost", size: "sm" })}
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
