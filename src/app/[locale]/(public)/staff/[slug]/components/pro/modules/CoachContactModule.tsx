"use client";

// Pro coach — Contact (#contact). Reuses the player's agnostic, lead-gated
// `PortfolioContact` (blurred preview + email-capture form; unlocking reveals
// the channels). The coach Pro page is ISR-cached and rendered byte-identical
// to everyone, so — like the Free portfolio's owner-gated islands — we resolve
// the "is this viewer unlocked?" answer CLIENT-side instead of with
// next/headers cookies() (which would deopt the route out of the cache):
//   • a previously captured lead drops a JS-readable `bh_lead_unlocked=1` cookie
//   • a logged-in viewer has an `sb-…-auth-token` cookie
// Either one unlocks the panel. The same /api/portfolio/<slug>/lead endpoint
// the player form posts to sets the lead cookie, so refreshing reflects it.
//
// Renders nothing when the coach hasn't enabled the contact section or has no
// reachable channel (email + whatsapp both empty).

import { useEffect, useState } from "react";
import PortfolioContact, {
  type PortfolioContactChannel,
} from "@/app/[locale]/(public)/[slug]/components/modules/contact/PortfolioContact";
import type { CoachPersonalDetailsData } from "../../CoachPortfolio";

const PORTFOLIO_LEAD_COOKIE = "bh_lead_unlocked";
const AUTH_TOKEN_KEY = /^sb-.+-auth-token(\.\d+)?$/;

export type CoachContactModuleProps = {
  coachSlug: string;
  coachName: string;
  ownerEmail: string | null;
  personalDetails: CoachPersonalDetailsData | null;
};

function normalizeWhatsapp(raw: string | null | undefined): { display: string; href: string } | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const onlyDigits = trimmed.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (!onlyDigits) return null;
  return {
    display: trimmed.startsWith("+") ? trimmed : `+${onlyDigits}`,
    href: `https://wa.me/${onlyDigits}`,
  };
}

function readUnlocked(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const cookies = document.cookie.split(";").map((c) => c.trim());
    const hasLead = cookies.some((c) => c.startsWith(`${PORTFOLIO_LEAD_COOKIE}=1`));
    if (hasLead) return true;
    const hasSession = cookies.some((c) => AUTH_TOKEN_KEY.test((c.split("=")[0] ?? "").trim()));
    return hasSession;
  } catch {
    return false;
  }
}

export default function CoachContactModule({
  coachSlug,
  coachName,
  ownerEmail,
  personalDetails,
}: CoachContactModuleProps) {
  // Start locked on the server / first paint (cache-safe), then resolve the
  // real unlock state on mount from JS-readable cookies.
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    setUnlocked(readUnlocked());
  }, []);

  if (!personalDetails || !personalDetails.showContactSection) return null;

  const channels: PortfolioContactChannel[] = [];
  if (ownerEmail) {
    channels.push({ kind: "email", label: "Email", value: ownerEmail, href: `mailto:${ownerEmail}` });
  }
  const wa = normalizeWhatsapp(personalDetails.whatsapp);
  if (wa) {
    channels.push({ kind: "whatsapp", label: "WhatsApp", value: wa.display, href: wa.href });
  }

  if (channels.length === 0) return null;

  return (
    <PortfolioContact
      playerSlug={coachSlug}
      playerName={coachName}
      channels={channels}
      unlocked={unlocked}
      apiKind="coach"
      profilePath={`/staff/${coachSlug}`}
    />
  );
}
