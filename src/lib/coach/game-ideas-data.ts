// Loader del módulo "Ideas de Juego" para el EDITOR (dashboard + admin). Trae
// TODAS las ideas del coach (cualquier status) ordenadas por position. El render
// público usa su propia query (sólo approved) en page.tsx.
import type { SupabaseClient } from "@supabase/supabase-js";
import { parsePitchBoard, type PitchBoard } from "./game-ideas";

export type GameIdeaForEditor = {
  id: string;
  title: string | null;
  formation: string | null;
  blurb: string | null;
  link: string | null;
  pitchBoard: PitchBoard;
  position: number;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
};

export async function loadCoachGameIdeasForEditor(
  supabase: SupabaseClient,
  coachId: string,
): Promise<GameIdeaForEditor[]> {
  const { data } = await supabase
    .from("coach_game_ideas")
    .select("id, title, formation, blurb, link, pitch_board, position, status, rejection_reason")
    .eq("coach_id", coachId)
    .order("position", { ascending: true });

  const rows = (data ?? []) as Array<{
    id: string;
    title: string | null;
    formation: string | null;
    blurb: string | null;
    link: string | null;
    pitch_board: unknown;
    position: number;
    status: string;
    rejection_reason: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    formation: r.formation,
    blurb: r.blurb,
    link: r.link,
    pitchBoard: parsePitchBoard(r.pitch_board),
    position: r.position,
    status: (["pending", "approved", "rejected"].includes(r.status) ? r.status : "pending") as
      | "pending"
      | "approved"
      | "rejected",
    rejectionReason: r.rejection_reason,
  }));
}
