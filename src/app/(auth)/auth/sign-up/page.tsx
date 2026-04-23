"use client";

import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input, Button } from "@heroui/react";
import { Mail, Lock, Eye, EyeOff, UserPlus, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => setIsVisible(!isVisible);

  async function signUpWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback?redirect=/dashboard`,
      },
    });
    setLoading(false);

    if (error) return setError(error.message);

    // Show success state
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mb-2">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">¡Revisa tu correo!</h2>
        <p className="text-sm text-neutral-400">
          Te hemos enviado un enlace de confirmación a <strong className="text-white font-medium">{email}</strong>.
          <br /> Haz clic en él para activar tu cuenta.
        </p>
        <p className="text-xs text-neutral-500 mt-4">
          Si no lo ves, revisa tu carpeta de Spam o Correo no deseado.
        </p>
        <Link href="/auth/sign-in" className="mt-8 text-sm bg-white/5 hover:bg-white/10 text-white w-full py-3 rounded-xl transition-colors">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Crear cuenta</h2>
        <p className="text-sm text-neutral-400">
          Únete y lleva tu carrera deportiva al siguiente nivel.
        </p>
      </div>

      <form onSubmit={signUpWithEmail} className="space-y-4">
        <Input
          type="email"
          label="Correo electrónico"
          placeholder="tu@email.com"
          value={email}
          onValueChange={setEmail}
          isRequired
          variant="bordered"
          classNames={{
            inputWrapper: "border-neutral-800 bg-neutral-950/50 hover:border-neutral-700 data-[focus=true]:border-white data-[focus=true]:bg-neutral-900",
            label: "text-neutral-400",
          }}
          startContent={<Mail className="w-4 h-4 text-neutral-500" />}
        />
        
        <Input
          type={isVisible ? "text" : "password"}
          label="Contraseña"
          placeholder="••••••••"
          value={password}
          onValueChange={setPassword}
          isRequired
          minLength={8}
          variant="bordered"
          classNames={{
            inputWrapper: "border-neutral-800 bg-neutral-950/50 hover:border-neutral-700 data-[focus=true]:border-white data-[focus=true]:bg-neutral-900",
            label: "text-neutral-400",
          }}
          startContent={<Lock className="w-4 h-4 text-neutral-500" />}
          endContent={
            <button className="focus:outline-none" type="button" onClick={toggleVisibility}>
              {isVisible ? (
                <EyeOff className="w-4 h-4 text-neutral-500" />
              ) : (
                <Eye className="w-4 h-4 text-neutral-500" />
              )}
            </button>
          }
        />

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        <Button
          type="submit"
          isLoading={loading}
          startContent={!loading && <UserPlus className="w-4 h-4" />}
          className="w-full bg-white text-black font-semibold text-base py-6 rounded-xl hover:bg-neutral-200 transition-colors mt-2"
        >
          {loading ? "Creando tu perfil..." : "Crear cuenta gratis"}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm text-neutral-400">
          ¿Ya tienes cuenta?{" "}
          <Link href="/auth/sign-in" className="text-white hover:underline transition-all">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
