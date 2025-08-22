// lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!; // ⚠️ sólo en servidor
  return createClient(url, service, { auth: { persistSession: false } });
}
