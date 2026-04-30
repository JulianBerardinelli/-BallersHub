import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { portfolioLeads } from "@/db/schema";

const PORTFOLIO_LEAD_COOKIE = "bh_lead_unlocked";
const COOKIE_MAX_AGE_DAYS = 60;

const bodySchema = z.object({
  email: z.string().email(),
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
    return NextResponse.json({ error: "Ingresá un email válido." }, { status: 400 });
  }

  const player = await db.query.playerProfiles.findFirst({
    where: (p, { and, eq }) =>
      and(eq(p.slug, slug), eq(p.visibility, "public"), eq(p.status, "approved")),
    columns: { id: true },
  });

  if (!player) {
    return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
  }

  const referrer = req.headers.get("referer");
  const userAgent = req.headers.get("user-agent");

  await db.insert(portfolioLeads).values({
    playerId: player.id,
    email: parsed.data.email.toLowerCase().trim(),
    source: "contact_unlock",
    referrer: referrer ?? null,
    userAgent: userAgent ?? null,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: PORTFOLIO_LEAD_COOKIE,
    value: "1",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * COOKIE_MAX_AGE_DAYS,
  });

  return response;
}
