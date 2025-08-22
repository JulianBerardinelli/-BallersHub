import Link from "next/link";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function StartPage() {
  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/onboarding/start");

  return (
    <main className="mx-auto max-w-xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Elegí tu tipo de cuenta</h1>
      <p className="text-neutral-400">Podés cambiarlo más tarde desde el Dashboard.</p>

      <div className="grid gap-3">
        <Link href="/onboarding/player/plan" className="rounded-md border px-4 py-3 hover:bg-neutral-900">
          Soy Jugador/a
        </Link>
        <Link href="/onboarding/other" className="rounded-md border px-4 py-3 hover:bg-neutral-900">
          Soy DT / Scout / Dirigente (próximamente)
        </Link>
      </div>

      <div className="pt-4">
        <Link href="/dashboard" className="text-sm underline">Lo haré después</Link>
      </div>
    </main>
  );
}
