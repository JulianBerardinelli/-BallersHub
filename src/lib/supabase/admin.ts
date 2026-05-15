// src/lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv, ensureServiceKey } from "./env";

/**
 * Cliente con Service Role (solo server). ⚠️ Requiere runtime "nodejs".
 */
export function createSupabaseAdmin() {
  const { url, service } = getSupabaseEnv();
  const serviceRoleKey = ensureServiceKey(service);

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  });
}
