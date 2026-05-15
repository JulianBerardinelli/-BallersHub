"use server";

import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function upsertDivision(input: {
  id?: string;
  name: string;
  countryCode: string;
  level?: number;
  isYouth?: boolean;
  status: "pending" | "approved" | "rejected";
  crestUrl?: string;
  referenceUrl?: string;
}) {
  const supabase = await createSupabaseServerRoute();
  
  // Authorization
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Unauthorized" };
  const { data: profile } = await supabase.from("user_profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "moderator") return { success: false, message: "Forbidden: No tienes permisos para gestionar divisiones." };

  let error;
  
  // Basic slug generation
  const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + input.countryCode.toLowerCase();
  
  const payload = {
    name: input.name,
    country_code: input.countryCode,
    slug: slug,
    level: input.level || null,
    is_youth: input.isYouth || false,
    status: input.status,
    ...(input.referenceUrl ? { reference_url: input.referenceUrl } : {}),
    ...(input.crestUrl ? { crest_url: input.crestUrl } : {})
  };

  if (input.id) {
    const { error: updErr } = await supabase
      .from("divisions")
      .update(payload)
      .eq("id", input.id);
    error = updErr;
  } else {
    const { error: insErr } = await supabase
      .from("divisions")
      .insert(payload);
    error = insErr;
  }

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/admin/divisions");
  return { success: true };
}
