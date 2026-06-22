import { NextResponse } from "next/server";
import sharp from "sharp";
import { ensureAdminActor } from "@/lib/admin/auth";
import { revalidateCoachPublicProfile } from "@/lib/seo/revalidate";

// Admin media upload for ANY coach. Mirrors /api/coach/media/upload but is
// admin-gated, writes with the service-role client to the target coach, skips
// the plan quota gate, and inserts status='approved' (admin-added media is live
// immediately — the admin is the moderator).

const ACCEPTED = new Set(["image/avif", "image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX = 5 * 1024 * 1024;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const gate = await ensureAdminActor();
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });
    const admin = gate.actor.adminClient;

    const { data: coach } = await admin
      .from("coach_profiles")
      .select("id, user_id, slug, full_name")
      .eq("id", id)
      .maybeSingle<{ id: string; user_id: string; slug: string | null; full_name: string | null }>();
    if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const url = formData.get("url") as string | null;
    const type = formData.get("type") as "photo" | "video";
    const title = (formData.get("title") as string | null)?.trim() || null;
    const rawSeasonYear = formData.get("seasonYear") as string | null;
    if (type !== "photo" && type !== "video") {
      return NextResponse.json({ error: "Media type is required" }, { status: 400 });
    }

    let seasonYear: number | null = null;
    if (type === "video" && rawSeasonYear?.trim()) {
      const p = parseInt(rawSeasonYear.trim(), 10);
      if (Number.isFinite(p) && p >= 1900 && p <= 2100) seasonYear = p;
    }
    const altText = `${coach.full_name?.trim() || "Entrenador"}${title ? ` — ${title}` : ""}`;

    let publicUrl = url?.trim() || "";
    if (file && !publicUrl) {
      if (type === "video") {
        return NextResponse.json({ error: "Subí los videos como link de YouTube o Vimeo." }, { status: 400 });
      }
      if (file.size > MAX) {
        return NextResponse.json({ error: "La imagen supera el límite de 5MB." }, { status: 400 });
      }
      const mime = file.type.toLowerCase();
      if (!ACCEPTED.has(mime)) {
        return NextResponse.json({ error: "Formato no soportado (JPG, PNG, WebP, AVIF)." }, { status: 400 });
      }
      let buf: Buffer;
      if (mime === "image/avif") buf = Buffer.from(await file.arrayBuffer());
      else {
        try {
          buf = await sharp(Buffer.from(await file.arrayBuffer())).rotate().avif({ quality: 60, effort: 4 }).toBuffer();
        } catch (e) {
          console.error("AVIF transcode error:", e);
          return NextResponse.json({ error: "No se pudo procesar la imagen." }, { status: 400 });
        }
      }
      const fileName = `gallery/${coach.user_id}/${crypto.randomUUID()}.avif`;
      const { error: upErr } = await admin.storage
        .from("coach-media")
        .upload(fileName, buf, { contentType: "image/avif", cacheControl: "31536000", upsert: false });
      if (upErr) {
        console.error("Storage upload error:", upErr);
        return NextResponse.json({ error: "No se pudo subir el archivo." }, { status: 500 });
      }
      publicUrl = admin.storage.from("coach-media").getPublicUrl(fileName).data.publicUrl;
    }
    if (!publicUrl) return NextResponse.json({ error: "Adjuntá un archivo o un link." }, { status: 400 });

    let nextPosition = 0;
    if (type === "video") {
      const { data: maxRow } = await admin
        .from("coach_media")
        .select("position")
        .eq("coach_id", coach.id)
        .eq("type", "video")
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle<{ position: number }>();
      nextPosition = (maxRow?.position ?? -1) + 1;
    }

    const { data: mediaRecord, error: insErr } = await admin
      .from("coach_media")
      .insert({
        coach_id: coach.id,
        type,
        url: publicUrl,
        title,
        alt_text: altText,
        season_year: seasonYear,
        position: nextPosition,
        is_primary: false,
        status: "approved",
        reviewed_by_user_id: gate.actor.actorId,
        reviewed_at: new Date().toISOString(),
      })
      .select("id, type, url, title, status")
      .single();
    if (insErr) {
      console.error("Admin coach media insert error:", insErr);
      return NextResponse.json({ error: "No se pudo guardar el archivo." }, { status: 500 });
    }

    revalidateCoachPublicProfile(coach.slug);
    return NextResponse.json({ success: true, data: mediaRecord });
  } catch (error) {
    console.error("Admin coach media upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
