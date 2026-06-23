import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { coachContactClicks, portfolioContactClicks } from "@/db/schema";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

const PLATFORMS = ["email", "whatsapp"] as const;

const bodySchema = z.object({
  platform: z.enum(PLATFORMS),
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

  // Shared by player AND coach portfolios. Resolve a player first; fall back
  // to a coach so coach contact-click analytics land in `coach_contact_clicks`.
  const player = await db.query.playerProfiles.findFirst({
    where: (p, { and, eq }) =>
      and(eq(p.slug, slug), eq(p.visibility, "public"), eq(p.status, "approved")),
    columns: { id: true },
  });

  let coachId: string | null = null;
  if (!player) {
    const coach = await db.query.coachProfiles.findFirst({
      where: (c, { and, eq }) =>
        and(eq(c.slug, slug), eq(c.visibility, "public"), eq(c.status, "approved")),
      columns: { id: true },
    });
    coachId = coach?.id ?? null;
  }

  if (!player && !coachId) {
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
      playerId: player!.id,
      platform: parsed.data.platform,
      viewerEmail: user?.email ?? null,
      viewerUserId: user?.id ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}
