import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import DivisionsTableUI from "./components/DivisionsTableUI";

export default async function AdminDivisionsPage() {
  noStore();

  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/divisions");

  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  const { data: divisions, error } = await supabase
    .from("divisions")
    .select(`
      id, name, slug, country_code, level, status, crest_url, created_at, updated_at, is_youth, reference_url
    `)
    .order("created_at", { ascending: false });

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Divisiones</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Gestioná divisiones y ligas, editalas y agregá escudos.
        </p>
      </div>

      {error && <p className="text-red-500">{error.message}</p>}

      <DivisionsTableUI items={divisions ?? []} />
    </main>
  );
}
