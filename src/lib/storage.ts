// // src/lib/storage.ts
// import { createClient } from "@supabase/supabase-js";

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// const sb = createClient(supabaseUrl, supabaseAnon);

// export function teamLogoUrl(path?: string | null) {
//   const key = path && path.trim().length > 0 ? path : "defaults/crest-default.svg";
//   const { data } = sb.storage.from("team-logos").getPublicUrl(key);
//   return data.publicUrl;
// }
