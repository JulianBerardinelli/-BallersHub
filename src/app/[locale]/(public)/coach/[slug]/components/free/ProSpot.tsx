"use client";

// ProSpot — owner/visitor switch for the interleaved Pro slots on the Free
// portfolio. Renders the BallersHub advertising (`promo`) by default and swaps
// to the owner's "Activar Pro" upsell (`locked`) only once the viewer is
// confirmed to be the profile owner.
//
// Why default to the ad: the page is ISR-cached and the same HTML is served to
// everyone, so the SSR/first-paint state must be the version we want crawlers
// and the ~99% anonymous traffic to see — the advertising. The owner is a
// single logged-in viewer who gets the upsell swapped in after a client-side
// auth check (see useViewerIsOwner).
//
// Both `promo` and `locked` are built in the parent server component and passed
// in as already-rendered nodes, so PromoBanner/LockedBanner stay server
// components (no extra client JS) — this wrapper just chooses which to mount.

import type { ReactNode } from "react";
import { useViewerIsOwner } from "./viewer-identity";

export default function ProSpot({
  ownerUserId,
  promo,
  locked,
}: {
  /** The profile owner's user id, or null to always show the ad. */
  ownerUserId: string | null;
  /** Visitor-facing BallersHub advertising. Shown by default (SSR). */
  promo: ReactNode;
  /** Owner-facing "Activar Pro" upsell. Shown only to the owner. */
  locked: ReactNode;
}) {
  const isOwner = useViewerIsOwner(ownerUserId);
  return <>{isOwner ? locked : promo}</>;
}
