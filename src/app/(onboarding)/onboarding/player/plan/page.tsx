import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PlayerPlanPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/onboarding/player/plan");

  return (
    <main className="mx-auto max-w-xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Elegí tu plan</h1>
      <div className="grid gap-3">
        <Link href="/onboarding/player/apply" className="rounded-md border px-4 py-3 hover:bg-neutral-900">
          Free — Solicitar verificación
        </Link>
        <Link href="/billing/checkout?plan=pro" className="rounded-md border px-4 py-3 hover:bg-neutral-900">
          Pro — (próximamente)
        </Link>
        <Link href="/billing/checkout?plan=pro_plus" className="rounded-md border px-4 py-3 hover:bg-neutral-900">
          Pro+ — (próximamente)
        </Link>
      </div>
      <div className="pt-4">
        <Link href="/onboarding/start" className="text-sm underline">Volver</Link>
      </div>
    </main>
  );
}
