import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { coachContactClicks, portfolioContactClicks } from "@/db/schema";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

const PLATFORMS = ["email", "whatsapp"] as const;

const bodySchema = z.object({
  platform: z.enum(PLATFORMS),
  // Disambiguates coach vs player when they share a slug (different tables).
  kind: z.enum(["player", "coach"]).optional(),
});

type Params = Promise<{ slug: string }>;

export async function POST(req: Request, { params }: { params: Params }) {
  const { slug } = await params;

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Plataforma inválida." }, { status: 400 });
  }

  // Shared by player AND coach portfolios, which can share a slug. The form
  // sends `kind` ("coach" from /coach/<slug>) so coach clicks aren't logged
  // against a same-slug player. Resolve the declared kind first, then fall back.
  const findPlayerId = () =>
    db.query.playerProfiles.findFirst({
      where: (p, { and, eq }) =>
        and(eq(p.slug, slug), eq(p.visibility, "public"), eq(p.status, "approved")),
      columns: { id: true },
    });
  const findCoachId = () =>
    db.query.coachProfiles.findFirst({
      where: (c, { and, eq }) =>
        and(eq(c.slug, slug), eq(c.visibility, "public"), eq(c.status, "approved")),
      columns: { id: true },
    });

  let playerId: string | null = null;
  let coachId: string | null = null;

  if (parsed.data.kind === "coach") {
    coachId = (await findCoachId())?.id ?? null;
    if (!coachId) playerId = (await findPlayerId())?.id ?? null;
  } else {
    playerId = (await findPlayerId())?.id ?? null;
    if (!playerId) coachId = (await findCoachId())?.id ?? null;
  }

  if (!playerId && !coachId) {
    return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
  }

  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (coachId) {
    await db.insert(coachContactClicks).values({
      coachId,
      platform: parsed.data.platform,
      viewerEmail: user?.email ?? null,
      viewerUserId: user?.id ?? null,
    });
  } else {
    await db.insert(portfolioContactClicks).values({
      playerId: playerId!,
      platform: parsed.data.platform,
      viewerEmail: user?.email ?? null,
      viewerUserId: user?.id ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}
