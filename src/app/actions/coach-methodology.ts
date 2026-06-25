"use server";

// Server actions del módulo Metodología (universal staff). Espeja
// coach-licenses.ts: items atómicos, pre-moderados. Reglas de oro:
//  - el dueño NUNCA setea status='approved' (RLS WITH CHECK lo bloquea); en
//    create se omite (default 'pending'), en update se fuerza 'pending'
//    explícito — la RLS rechazaría un update que deje 'approved', así que un
//    update sin status fallaría sobre un rubro aprobado. Bajar a pending es obligatorio.
//  - gating D7: Free hasta 2 rubros; archivos sólo Pro (gate en la ruta de upload).
//  - el upload de archivos lo maneja /api/coach/methodology-doc/upload (inserta
//    la fila coach_media). Acá sólo removeDoc.
import { z } from "zod";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { loadCoachPlanAccess } from "@/lib/dashboard/coach-plan";
import { isMethodologyIconKey } from "@/lib/staff/methodology-icons";
import { FREE_RUBRO_CAP } from "@/lib/coach/methodology-data";
import { revalidateCoachPublicProfile } from "@/lib/seo/revalidate";
import { revalidatePath } from "next/cache";

export type MethodologyActionResult = {
  success: boolean;
  message?: string;
  id?: string;
};

const rubroSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string({ message: "Ingresá un título." }).trim().min(1, "Ingresá un título.").max(80, "Máximo 80 caracteres."),
  icon: z
    .union([z.string().trim(), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v && v.trim() ? v.trim() : null))
    .refine((v) => v === null || isMethodologyIconKey(v), { message: "Ícono inválido." }),
  body: z
    .union([z.string().trim().max(4000, "Máximo 4000 caracteres."), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v && v.trim() ? v.trim() : null)),
});

export type MethodologyRubroInput = z.infer<typeof rubroSchema>;

const REVALIDATE = "/dashboard/coach/methodology";

// Bucket helper: deriva el path interno desde la URL pública para borrar storage.
function storagePathFromUrl(url: string): string | null {
  const marker = "/coach-media/";
  const i = url.indexOf(marker);
  return i >= 0 ? url.slice(i + marker.length).split("?")[0] : null;
}

async function resolveOwnCoach() {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." as const, supabase: null, coach: null, userId: null };

  const { data: coach, error } = await supabase
    .from("coach_profiles")
    .select("id, slug")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; slug: string | null }>();
  if (error) return { error: error.message, supabase: null, coach: null, userId: null };
  if (!coach) return { error: "No tenés un perfil de entrenador.", supabase: null, coach: null, userId: null };
  return { error: null, supabase, coach, userId: user.id };
}

export async function upsertMethodologyRubro(
  input: MethodologyRubroInput,
): Promise<MethodologyActionResult> {
  const parsed = rubroSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const ctx = await resolveOwnCoach();
  if (ctx.error || !ctx.supabase || !ctx.coach || !ctx.userId) {
    return { success: false, message: ctx.error ?? "No autorizado." };
  }
  const { supabase, coach, userId } = ctx;

  // EDIT: cualquier cambio re-entra a moderación (status='pending' explícito).
  if (parsed.data.id) {
    const { data, error } = await supabase
      .from("coach_methodology_rubros")
      .update({
        title: parsed.data.title,
        icon: parsed.data.icon,
        body: parsed.data.body,
        status: "pending",
        reviewed_by_user_id: null,
        reviewed_at: null,
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.id)
      .eq("coach_id", coach.id)
      .select("id")
      .maybeSingle<{ id: string }>();
    if (error) return { success: false, message: error.message };
    if (!data) return { success: false, message: "No se encontró el rubro." };
    revalidateCoachPublicProfile(coach.slug);
    revalidatePath(REVALIDATE);
    return { success: true, id: data.id };
  }

  // CREATE: gating Free (≤2 rubros). Pro ilimitado.
  const access = await loadCoachPlanAccess(supabase, userId);
  if (!access.isPro) {
    const { count } = await supabase
      .from("coach_methodology_rubros")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", coach.id);
    if ((count ?? 0) >= FREE_RUBRO_CAP) {
      return {
        success: false,
        message: `El plan Free permite hasta ${FREE_RUBRO_CAP} rubros. Activá Pro para sumar más.`,
      };
    }
  }

  const { data: maxRow } = await supabase
    .from("coach_methodology_rubros")
    .select("position")
    .eq("coach_id", coach.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();
  const nextPosition = (maxRow?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("coach_methodology_rubros")
    .insert({
      coach_id: coach.id,
      title: parsed.data.title,
      icon: parsed.data.icon,
      body: parsed.data.body,
      position: nextPosition,
    })
    .select("id")
    .single<{ id: string }>();
  if (error) return { success: false, message: error.message };
  revalidatePath(REVALIDATE);
  return { success: true, id: data.id };
}

export async function deleteMethodologyRubro(id: string): Promise<MethodologyActionResult> {
  const ctx = await resolveOwnCoach();
  if (ctx.error || !ctx.supabase || !ctx.coach) {
    return { success: false, message: ctx.error ?? "No autorizado." };
  }
  const { supabase, coach } = ctx;

  // Borrar archivos de storage de los docs adjuntos (el FK CASCADE borra las
  // filas coach_media, pero NO toca el Storage). Best-effort.
  const { data: docs } = await supabase
    .from("coach_media")
    .select("url")
    .eq("coach_id", coach.id)
    .eq("type", "doc")
    .eq("rubro_id", id);
  const paths = (docs ?? [])
    .map((d) => storagePathFromUrl((d as { url: string }).url))
    .filter((p): p is string => !!p);
  if (paths.length > 0) {
    await supabase.storage.from("coach-media").remove(paths);
  }

  const { error } = await supabase
    .from("coach_methodology_rubros")
    .delete()
    .eq("id", id)
    .eq("coach_id", coach.id);
  if (error) return { success: false, message: error.message };
  revalidateCoachPublicProfile(coach.slug);
  revalidatePath(REVALIDATE);
  return { success: true };
}

export async function removeMethodologyDoc(docId: string): Promise<MethodologyActionResult> {
  const ctx = await resolveOwnCoach();
  if (ctx.error || !ctx.supabase || !ctx.coach) {
    return { success: false, message: ctx.error ?? "No autorizado." };
  }
  const { supabase, coach } = ctx;

  const { data: doc } = await supabase
    .from("coach_media")
    .select("id, url")
    .eq("id", docId)
    .eq("coach_id", coach.id)
    .eq("type", "doc")
    .maybeSingle<{ id: string; url: string }>();
  if (!doc) return { success: false, message: "No se encontró el archivo." };

  const path = storagePathFromUrl(doc.url);
  if (path) await supabase.storage.from("coach-media").remove([path]);

  const { error } = await supabase.from("coach_media").delete().eq("id", docId).eq("coach_id", coach.id);
  if (error) return { success: false, message: error.message };
  revalidateCoachPublicProfile(coach.slug);
  revalidatePath(REVALIDATE);
  return { success: true };
}
