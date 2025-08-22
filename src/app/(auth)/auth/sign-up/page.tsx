"use client";

import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);

  async function signUpWithEmail(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    // Supabase puede requerir confirm email; luego el usuario vuelve y se loguea
    router.push("/auth/sign-in");
  }

  return (
    <div className="space-y-4">
      <form onSubmit={signUpWithEmail} className="space-y-3">
        <label className="block">
          <span className="text-sm">Email</span>
          <input className="mt-1 w-full rounded-md border px-3 py-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm">Contraseña</span>
          <input className="mt-1 w-full rounded-md border px-3 py-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full rounded-md bg-black text-white py-2">{loading ? "Creando..." : "Crear cuenta"}</button>
      </form>

      <p className="text-sm text-center">
        ¿Ya tenés cuenta? <a href="/auth/sign-in" className="underline">Ingresar</a>
      </p>
    </div>
  );
}
