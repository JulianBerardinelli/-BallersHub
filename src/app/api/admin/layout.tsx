import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin");

  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (up?.role !== "admin") redirect("/dashboard?noadmin=1");

  return <>{children}</>;
}
