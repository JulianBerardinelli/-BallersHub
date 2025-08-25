// src/lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

const { url: SUPABASE_URL, anon: SUPABASE_ANON_KEY } = getSupabaseEnv();

/** Server Components: no escribe cookies */
export async function createSupabaseServerRSC() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) { return cookieStore.get(name)?.value; },
      set() {}, remove() {},
    },
  });
}

/** Route Handlers: puede escribir cookies */
export async function createSupabaseServerRoute() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) { return cookieStore.get(name)?.value; },
      set(name: string, value: string, options: CookieOptions) { cookieStore.set(name, value, options); },
      remove(name: string, options: CookieOptions) { cookieStore.set(name, "", { ...options, expires: new Date(0) }); },
    },
  });
}
