// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";
const { url, anon } = getSupabaseEnv();
export const supabase = createBrowserClient(url, anon);
