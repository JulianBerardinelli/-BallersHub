import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveProUserIds } from "@/lib/seo/indexable-profiles";
import CoachMediaManager, {
  type CoachMediaItem,
} from "@/app/[locale]/(dashboard)/dashboard/coach/multimedia/CoachMediaManager";
import { adminDeleteCoachMedia } from "@/app/actions/admin-coach";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar multimedia - Ballers Hub" };

export default async function AdminCoachMediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/sign-in?redirect=/admin/coaches/${id}/edit/multimedia`);
  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  const admin = createSupabaseAdmin();
  const { data: coach } = await admin
    .from("coach_profiles")
    .select("id, user_id, full_name")
    .eq("id", id)
    .maybeSingle<{ id: string; user_id: string; full_name: string }>();
  if (!coach) notFound();

  const proIds = await resolveProUserIds([coach.user_id]);
  const isPro = proIds.has(coach.user_id);

  const { data: rows } = await admin
    .from("coach_media")
    .select("id, type, url, title, status, rejection_reason, season_year, provider")
    .eq("coach_id", id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  const items: CoachMediaItem[] = (rows ?? []).map((r) => {
    const x = r as Record<string, unknown>;
    return {
      id: x.id as string,
      type: (x.type as "photo" | "video" | "doc") ?? "photo",
      url: (x.url as string) ?? "",
      title: (x.title as string | null) ?? null,
      status: (x.status as "pending" | "approved" | "rejected") ?? "pending",
      rejectionReason: (x.rejection_reason as string | null) ?? null,
      seasonYear: (x.season_year as number | null) ?? null,
      provider: (x.provider as string | null) ?? null,
    };
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href={`/admin/coaches/${id}/edit`} className="text-[12px] text-bh-fg-3 hover:text-bh-fg-1">
          ← {coach.full_name}
        </Link>
        <p className="mt-1 text-sm text-neutral-400">
          Subí o eliminá fotos y videos del DT. Lo que subís acá queda publicado al instante.
        </p>
      </div>
      <CoachMediaManager
        items={items}
        isPro={isPro}
        uploadUrl={`/api/admin/coaches/${id}/media/upload`}
        deleteAction={adminDeleteCoachMedia}
      />
    </main>
  );
}
