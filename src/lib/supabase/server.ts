// src/lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** Server Components: no escribe cookies */
export async function createSupabaseServerRSC() {
  // Read cookies first so Next.js detects this as a dynamic API and skips
  // static prerendering. If we throw on missing env before this, Next falls
  // back to attempting a static export which crashes the build.
  const cookieStore = await cookies();
  const { url: SUPABASE_URL, anon: SUPABASE_ANON_KEY } = getSupabaseEnv();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      // En server components no podemos modificar headers — ignoramos los
      // sets a propósito. El parámetro está tipado para que TS no marque
      // implicit any.
      setAll(_cookiesToSet: CookieToSet[]) {
        // intentionally noop
      },
    },
  });
}

/** Route Handlers / Server Actions: puede escribir cookies */
export async function createSupabaseServerRoute() {
  const cookieStore = await cookies();
  const { url: SUPABASE_URL, anon: SUPABASE_ANON_KEY } = getSupabaseEnv();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Ignorado preventivo: en algunos contextos no se pueden escribir.
        }
      },
    },
  });
}
