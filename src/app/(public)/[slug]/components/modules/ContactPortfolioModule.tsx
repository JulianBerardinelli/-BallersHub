import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { playerPersonalDetails, playerProfiles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import PortfolioContact, { type PortfolioContactChannel } from "./contact/PortfolioContact";

const PORTFOLIO_LEAD_COOKIE = "bh_lead_unlocked";

type Props = {
  playerId: string;
  playerSlug: string;
  playerName: string;
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

export default async function ContactPortfolioModule({ playerId, playerSlug, playerName }: Props) {
  const details = await db.query.playerPersonalDetails.findFirst({
    where: eq(playerPersonalDetails.playerId, playerId),
  });

  if (!details || !details.showContactSection) return null;

  // The owner's email is the auth user's email — pulled from auth.users.
  // We resolve it via the player's userId. The Drizzle connection uses the
  // direct Postgres URL, which has access to the auth schema.
  const player = await db.query.playerProfiles.findFirst({
    where: eq(playerProfiles.id, playerId),
    columns: { userId: true },
  });

  let ownerEmail: string | null = null;
  if (player?.userId) {
    const rows = await db.execute<{ email: string | null }>(
      sql`select email from auth.users where id = ${player.userId} limit 1`,
    );
    ownerEmail = (rows as unknown as Array<{ email: string | null }>)[0]?.email ?? null;
  }

  const channels: PortfolioContactChannel[] = [];

  if (ownerEmail) {
    channels.push({
      kind: "email",
      label: "Email",
      value: ownerEmail,
      href: `mailto:${ownerEmail}`,
    });
  }

  const wa = normalizeWhatsapp(details.whatsapp);
  if (wa) {
    channels.push({
      kind: "whatsapp",
      label: "WhatsApp",
      value: wa.display,
      href: wa.href,
    });
  }

  if (channels.length === 0) return null;

  // Auth session OR a previously captured lead cookie unlocks the panel.
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const hasLeadCookie = cookieStore.get(PORTFOLIO_LEAD_COOKIE)?.value === "1";
  const unlocked = Boolean(user) || hasLeadCookie;

  return (
    <PortfolioContact
      playerSlug={playerSlug}
      playerName={playerName}
      channels={channels}
      unlocked={unlocked}
    />
  );
}
