import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { ensureAdminActor } from "@/lib/admin/auth";
import { revalidateAdminCounters } from "@/lib/admin/counters";
import { sendNationalTeamReviewedNotification } from "@/lib/admin/notify";
import { revalidatePlayerPublicProfile } from "@/lib/seo/revalidate";

// POST /api/admin/national-team/[id]/reject
// Rechaza una etapa de selección con una nota. El jugador ve el estado +
// la observación en su dashboard. Admin-only.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await ensureAdminActor();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: 403 });
  }
  const { actorId, actorIp, adminClient } = gate.actor;

  const body = (await req.json().catch(() => ({}))) as { resolutionNote?: unknown };
  const resolutionNote =
    typeof body.resolutionNote === "string" && body.resolutionNote.trim().length > 0
      ? body.resolutionNote.trim()
      : null;

  const { data: stint, error: fetchError } = await adminClient
    .from("national_team_stints")
    .select("id, player_id, status")
    .eq("id", id)
    .maybeSingle<{ id: string; player_id: string; status: string }>();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }
  if (!stint) {
    return NextResponse.json({ error: "Etapa no encontrada" }, { status: 404 });
  }
  if (stint.status !== "pending_review") {
    return NextResponse.json({ error: "La etapa ya fue procesada" }, { status: 409 });
  }

  const { error: updateError } = await adminClient
    .from("national_team_stints")
    .update({
      status: "rejected",
      reviewed_by_user_id: actorId,
      reviewed_at: new Date().toISOString(),
      resolution_note: resolutionNote,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  try {
    await adminClient.from("audit_logs").insert({
      user_id: actorId,
      actor_ip: actorIp,
      action: "admin.national_team.reject",
      subject_table: "national_team_stints",
      subject_id: id,
      meta: { note: resolutionNote },
    });
  } catch (auditError) {
    console.error("Audit log error (non-fatal):", auditError);
  }

  // Si estaba publicada y se rechaza, el portfolio debe dejar de mostrarla.
  const { data: player } = await adminClient
    .from("player_profiles")
    .select("user_id, full_name, slug")
    .eq("id", stint.player_id)
    .maybeSingle<{ user_id: string | null; full_name: string | null; slug: string | null }>();
  revalidatePlayerPublicProfile(player?.slug ?? null);
  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin/national-team");
  revalidateAdminCounters();

  // Notificación in-app + email al jugador (no-fatal: la moderación ya escribió).
  if (player?.user_id) {
    await sendNationalTeamReviewedNotification({
      actor: gate.actor,
      recipientUserId: player.user_id,
      playerName: player.full_name ?? "",
      result: "rejected",
      stintId: id,
      note: resolutionNote,
    });
  }

  return NextResponse.json({ success: true });
}
