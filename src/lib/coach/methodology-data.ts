// Loader del módulo Metodología para el EDITOR del dashboard (y el admin).
// Trae TODOS los rubros del coach (cualquier status) ordenados por position +
// sus archivos adjuntos (coach_media type='doc', cualquier status) agrupados.
// El render público usa su propia query (sólo status='approved') en page.tsx.
import type { SupabaseClient } from "@supabase/supabase-js";

export type MethodologyDocMime = "pdf" | "ppt" | "pptx" | "file";

export type MethodologyDocForEditor = {
  id: string;
  url: string;
  title: string | null;
  status: string;
  mime: MethodologyDocMime;
};

export type MethodologyRubroForEditor = {
  id: string;
  title: string;
  icon: string | null;
  body: string | null;
  position: number;
  status: string;
  rejectionReason: string | null;
  docs: MethodologyDocForEditor[];
};

/** Deriva el tipo de archivo desde la extensión de la URL pública. */
export function docMimeFromUrl(url: string): MethodologyDocMime {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".pdf")) return "pdf";
  if (clean.endsWith(".pptx")) return "pptx";
  if (clean.endsWith(".ppt")) return "ppt";
  return "file";
}

export async function loadCoachMethodologyForEditor(
  supabase: SupabaseClient,
  coachId: string,
): Promise<MethodologyRubroForEditor[]> {
  const { data: rubroRows } = await supabase
    .from("coach_methodology_rubros")
    .select("id, title, icon, body, position, status, rejection_reason")
    .eq("coach_id", coachId)
    .order("position", { ascending: true });

  const rubros = (rubroRows ?? []) as Array<{
    id: string;
    title: string;
    icon: string | null;
    body: string | null;
    position: number;
    status: string;
    rejection_reason: string | null;
  }>;
  if (rubros.length === 0) return [];

  const ids = rubros.map((r) => r.id);
  const { data: docRows } = await supabase
    .from("coach_media")
    .select("id, rubro_id, url, title, status")
    .eq("coach_id", coachId)
    .eq("type", "doc")
    .in("rubro_id", ids)
    .order("created_at", { ascending: true });

  const docs = (docRows ?? []) as Array<{
    id: string;
    rubro_id: string | null;
    url: string;
    title: string | null;
    status: string;
  }>;

  const docsByRubro = new Map<string, MethodologyDocForEditor[]>();
  for (const d of docs) {
    if (!d.rubro_id) continue;
    const list = docsByRubro.get(d.rubro_id) ?? [];
    list.push({ id: d.id, url: d.url, title: d.title, status: d.status, mime: docMimeFromUrl(d.url) });
    docsByRubro.set(d.rubro_id, list);
  }

  return rubros.map((r) => ({
    id: r.id,
    title: r.title,
    icon: r.icon,
    body: r.body,
    position: r.position,
    status: r.status,
    rejectionReason: r.rejection_reason,
    docs: docsByRubro.get(r.id) ?? [],
  }));
}
