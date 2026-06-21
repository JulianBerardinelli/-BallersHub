import { createSupabaseAdmin } from "@/lib/supabase/admin";
import ArticlesManager from "@/components/dashboard/client/media/ArticlesManager";
import type { Article } from "@/components/dashboard/client/media/ArticleModal";

export default async function AdminPrensaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createSupabaseAdmin();

  const { data: articles } = await admin
    .from("player_articles")
    .select("*")
    .eq("player_id", id)
    .order("position", { ascending: true })
    .order("published_at", { ascending: false, nullsFirst: false });

  return (
    <ArticlesManager
      articles={(articles ?? []) as Article[]}
      apiBase={`/api/admin/players/${id}/articles`}
    />
  );
}
