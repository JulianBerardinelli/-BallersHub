import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

export function slugify(input: string): string {
  return (
    (input || "team")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "team"
  );
}

export async function ensureUniqueTeamSlug(base: string, admin: AnyClient): Promise<string> {
  const MAX = 60;
  const candidate = base.slice(0, MAX);

  const { data } = await admin.from("teams").select("slug").ilike("slug", `${candidate}%`);
  const taken = new Set((data ?? []).map((row: { slug: string }) => row.slug));

  if (!taken.has(candidate)) return candidate;

  for (let suffix = 2; suffix < 1_000; suffix++) {
    const slug = `${candidate.slice(0, MAX - (`-${suffix}`).length)}-${suffix}`;
    if (!taken.has(slug)) return slug;
  }

  return `${candidate}-${Date.now()}`;
}

export async function findExistingTeamIdByName(
  nameRaw: string,
  admin: AnyClient,
): Promise<string | null> {
  const name = nameRaw.trim();
  if (!name) return null;

  const slug = slugify(name);

  const bySlug = await admin.from("teams").select("id").eq("slug", slug).maybeSingle<{ id: string }>();
  if (bySlug.data?.id) return bySlug.data.id;

  const byName = await admin.from("teams").select("id").ilike("name", name);
  if (byName.data && byName.data.length > 0) {
    const [row] = byName.data as { id: string }[];
    return row.id;
  }

  return null;
}

