// src/lib/supabase/env.ts
/**
 * Valida/centraliza envs de Supabase. Soporta publishable/anon.
 */
export function getSupabaseEnv() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    // Quickstart actual usa PUBLISHABLE_KEY; antes se usaba ANON_KEY.
    const anon =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  
    if (!url || !/^https:\/\/.+supabase\.co$/.test(url)) {
      throw new Error("[Supabase] NEXT_PUBLIC_SUPABASE_URL inválida o no definida");
    }
    if (!anon || anon.length < 40) {
      throw new Error("[Supabase] Publishable/Anon key faltante o inválida");
    }
    return { url, anon, service };
  }
  
  export function ensureServiceKey(service?: string) {
    const key = service?.trim();
    if (!key || key.length < 40) {
      throw new Error("[Supabase] SUPABASE_SERVICE_ROLE_KEY faltante o inválida");
    }
    return key;
  }
  