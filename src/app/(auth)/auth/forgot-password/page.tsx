"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Input, Button } from "@heroui/react";
import { Mail, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const redirectTo = `${origin}/auth/callback?redirect=/auth/update-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mb-2">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Revisa tu correo</h2>
        <p className="text-sm text-neutral-400">
          Hemos enviado un enlace de recuperación a <strong className="text-white font-medium">{email}</strong>.
        </p>
        <p className="text-xs text-neutral-500">
          Haz clic en el enlace para restablecer tu contraseña.
        </p>
        <Link href="/auth/sign-in" className="mt-4 text-sm bg-white/5 hover:bg-white/10 text-white w-full py-3 rounded-xl transition-colors">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Recuperar cuenta</h2>
        <p className="text-sm text-neutral-400">
          Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
        </p>
      </div>

      <form onSubmit={handleResetPassword} className="space-y-4">
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

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        <Button
          type="submit"
          isLoading={loading}
          className="w-full bg-white text-black font-semibold text-base py-6 rounded-xl hover:bg-neutral-200 transition-colors"
        >
          {loading ? "Enviando..." : "Enviar enlace mágico"}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <Link href="/auth/sign-in" className="text-sm text-neutral-400 hover:text-white transition-colors">
          ¿Recordaste tu contraseña? Iniciar sesión
        </Link>
      </div>
    </div>
  );
}
