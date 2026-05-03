// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

function makeClient() {
  const { url, anon } = getSupabaseEnv();
  return createBrowserClient(url, anon);
}

type BrowserClient = ReturnType<typeof makeClient>;

let _client: BrowserClient | null = null;

// Lazy proxy: defers env validation until first property access.
// This avoids crashing at module load (e.g. during Next.js build's
// "collect page data" phase) when NEXT_PUBLIC_SUPABASE_URL isn't yet in scope.
export const supabase = new Proxy({} as BrowserClient, {
  get(_target, prop, receiver) {
    if (!_client) _client = makeClient();
    return Reflect.get(_client as object, prop, receiver);
  },
});
