import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { portfolioContactClicks } from "@/db/schema";
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

  const player = await db.query.playerProfiles.findFirst({
    where: (p, { and, eq }) =>
      and(eq(p.slug, slug), eq(p.visibility, "public"), eq(p.status, "approved")),
    columns: { id: true },
  });

  if (!player) {
    return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
  }

  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await db.insert(portfolioContactClicks).values({
    playerId: player.id,
    platform: parsed.data.platform,
    viewerEmail: user?.email ?? null,
    viewerUserId: user?.id ?? null,
  });

  return NextResponse.json({ ok: true });
}
