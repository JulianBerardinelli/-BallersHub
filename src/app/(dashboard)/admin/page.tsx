import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
export default async function AdminPage() {
  const supabase = await createSupabaseServerRSC();

  // auth + admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin");

  const { data: up } = await supabase
    .from("user_profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  redirect("/admin/applications");
}
