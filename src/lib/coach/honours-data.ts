// Loader del módulo "Logros" (coach_honours) para el EDITOR (dashboard + admin).
// Trae TODOS los logros del coach (cualquier status) + las opciones de etapa de
// la trayectoria para el autocomplete (vincular logro ↔ etapa). El render
// público usa su propia query (sólo approved) en page.tsx.
import type { SupabaseClient } from "@supabase/supabase-js";

export type HonourForEditor = {
  id: string;
  title: string;
  competition: string | null;
  season: string | null;
  description: string | null;
  careerItemId: string | null;
  videoUrl: string | null;
  position: number;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
};

// Opción de etapa para el <Autocomplete> (vincular el logro a un club/período).
export type CareerOption = {
  id: string;
  club: string;
  periodLabel: string;
  startYear: number | null;
  endYear: number | null;
};

const yearOf = (d: string | null): number | null => {
  if (!d) return null;
  const y = Number.parseInt(d.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
};

export async function loadCoachHonoursForEditor(
  supabase: SupabaseClient,
  coachId: string,
): Promise<HonourForEditor[]> {
  const { data } = await supabase
    .from("coach_honours")
    .select(
      "id, title, competition, season, description, career_item_id, video_url, position, status, rejection_reason, awarded_on",
    )
    .eq("coach_id", coachId)
    .order("position", { ascending: true })
    .order("awarded_on", { ascending: false });

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as string,
    title: (r.title as string) ?? "",
    competition: (r.competition as string | null) ?? null,
    season: (r.season as string | null) ?? null,
    description: (r.description as string | null) ?? null,
    careerItemId: (r.career_item_id as string | null) ?? null,
    videoUrl: (r.video_url as string | null) ?? null,
    position: (r.position as number | null) ?? 0,
    status: (["pending", "approved", "rejected"].includes(r.status as string)
      ? r.status
      : "pending") as "pending" | "approved" | "rejected",
    rejectionReason: (r.rejection_reason as string | null) ?? null,
  }));
}

export async function loadCoachCareerOptions(
  supabase: SupabaseClient,
  coachId: string,
): Promise<CareerOption[]> {
  const { data } = await supabase
    .from("coach_career_items")
    .select("id, club, start_date, end_date")
    .eq("coach_id", coachId)
    .order("start_date", { ascending: false });

  const rows = (data ?? []) as Array<{
    id: string;
    club: string;
    start_date: string | null;
    end_date: string | null;
  }>;
  return rows.map((r) => {
    const s = yearOf(r.start_date);
    const e = yearOf(r.end_date);
    const periodLabel = s && e ? `${s} – ${e}` : s && !e ? `${s} – Actualidad` : e ? `${e}` : "—";
    return { id: r.id, club: r.club, periodLabel, startYear: s, endYear: e };
  });
}
