// src/lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/** Server Components: no escribe cookies */
export async function createSupabaseServerRSC() {
  const { url: SUPABASE_URL, anon: SUPABASE_ANON_KEY } = getSupabaseEnv();
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        // En server components ignoramos los sets ya que no se pueden modificar headers
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Ignorado intencionalmente
          })
        } catch {
        }
      },
    },
  });
}

/** Route Handlers / Server Actions: puede escribir cookies */
export async function createSupabaseServerRoute() {
  const { url: SUPABASE_URL, anon: SUPABASE_ANON_KEY } = getSupabaseEnv();
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Ignorado preventivo
        }
      },
    },
  });
}
