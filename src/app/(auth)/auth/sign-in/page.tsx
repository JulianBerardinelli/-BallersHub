"use client";

import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);

  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?redirect=/dashboard`;

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/dashboard");
  }

  async function signInOAuth(provider: "google") {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={signInWithEmail} className="space-y-3">
        <label className="block">
          <span className="text-sm">Email</span>
          <input className="mt-1 w-full rounded-md border px-3 py-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm">Contraseña</span>
          <input className="mt-1 w-full rounded-md border px-3 py-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full rounded-md bg-black text-white py-2">{loading ? "Ingresando..." : "Ingresar"}</button>
      </form>

      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <span className="flex-1 h-px bg-neutral-200" />
        o
        <span className="flex-1 h-px bg-neutral-200" />
      </div>

      <div className="grid gap-2">
        <button onClick={() => signInOAuth("google")} className="w-full rounded-md border py-2">Continuar con Google</button>
        {/* <button onClick={() => signInOAuth("apple")} className="w-full rounded-md border py-2">Continuar con Apple</button> */}
      </div>

      <p className="text-sm text-center">
        ¿No tenés cuenta? <a href="/auth/sign-up" className="underline">Crear cuenta</a>
      </p>
    </div>
  );
}
