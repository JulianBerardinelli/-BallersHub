"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { createSupabaseServerRoute } from "@/lib/supabase/server";

const schema = z.object({ locale: z.enum(["es", "en", "it", "pt"]) });

export type SetLocaleResult = { success: boolean; message: string };

/**
 * Sets the user's native/preferred locale (user_profiles.preferred_locale).
 * This is the language the player writes their profile in — the adaptive
 * editor orders/labels around it, and the AI assistant translates FROM it.
 * It does NOT change the canonical /slug (which stays es).
 */
export async function setPreferredLocale(input: {
  locale: string;
}): Promise<SetLocaleResult> {
  const t = await getTranslations("dashSettings");

  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: t("common.invalidLocale") };

  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: t("common.mustSignIn") };

  const { error } = await supabase
    .from("user_profiles")
    .update({ preferred_locale: parsed.data.locale })
    .eq("user_id", user.id);

  if (error) {
    return { success: false, message: t("common.localeSaveFailed") };
  }

  revalidatePath("/dashboard/settings/account");
  revalidatePath("/dashboard/edit-profile/translations");
  return { success: true, message: t("common.localeUpdated") };
}
