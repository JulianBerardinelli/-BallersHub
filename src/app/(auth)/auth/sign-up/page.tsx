"use client";

import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); 
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function signUpWithEmail(e: React.FormEvent) {
    e.preventDefault(); 
    setError(null); 
    setLoading(true);
    
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    
    if (error) return setError(error.message);
    
    // Mostramos estado de éxito en lugar de redireccionar bruscamente
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <h3 className="text-xl font-bold">¡Revisa tu correo!</h3>
        <p className="text-sm text-neutral-400">
          Te hemos enviado un enlace de confirmación a <strong>{email}</strong>. 
          Haz clic en él para activar tu cuenta y poder iniciar sesión.
        </p>
        <p className="text-xs text-neutral-500 mt-4">
          Si no lo ves, revisa tu carpeta de Spam.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={signUpWithEmail} className="space-y-3">
        <label className="block">
          <span className="text-sm">Email</span>
          <input className="mt-1 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm">Contraseña</span>
          <input className="mt-1 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} />
        </label>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button disabled={loading} className="w-full rounded-md bg-white text-black font-medium py-2 hover:bg-neutral-200 transition-colors">
          {loading ? "Creando..." : "Crear cuenta"}
        </button>
      </form>

      <p className="text-sm text-center text-neutral-400">
        ¿Ya tenés cuenta? <a href="/auth/sign-in" className="text-white hover:underline">Ingresar al panel</a>
      </p>
    </div>
  );
}
