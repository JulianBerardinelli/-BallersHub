import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import AdminCoachMediaManager, { type AdminCoachMediaRow } from "./AdminCoachMediaManager";

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
    .select("id, full_name")
    .eq("id", id)
    .maybeSingle<{ id: string; full_name: string }>();
  if (!coach) notFound();

  const { data: rows } = await admin
    .from("coach_media")
    .select("id, type, url, title, status, season_year, created_at")
    .eq("coach_id", id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  const media: AdminCoachMediaRow[] = (rows ?? []).map((r) => {
    const x = r as Record<string, unknown>;
    return {
      id: x.id as string,
      type: (x.type as "photo" | "video" | "doc") ?? "photo",
      url: (x.url as string) ?? "",
      title: (x.title as string | null) ?? null,
      status: (x.status as "pending" | "approved" | "rejected") ?? "pending",
      seasonYear: (x.season_year as number | null) ?? null,
    };
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/admin/coaches" className="text-[12px] text-bh-fg-3 hover:text-bh-fg-1">
          ← Directorio
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
          Multimedia · {coach.full_name}
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Aprobá, rechazá o eliminá fotos y videos del DT directamente.
        </p>
      </div>
      <AdminCoachMediaManager items={media} />
    </main>
  );
}
