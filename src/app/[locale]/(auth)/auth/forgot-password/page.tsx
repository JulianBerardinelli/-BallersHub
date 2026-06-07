"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@heroui/react";
import { Mail, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import FormField from "@/components/dashboard/client/FormField";

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
        <div className="w-16 h-16 bg-[rgba(0,194,255,0.12)] rounded-full flex items-center justify-center text-bh-blue mb-2 border border-[rgba(0,194,255,0.25)]">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="font-bh-display text-2xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          Revisá tu correo
        </h2>
        <p className="text-sm text-bh-fg-3">
          Enviamos un enlace de recuperación a{" "}
          <strong className="text-bh-fg-1 font-medium">{email}</strong>.
        </p>
        <p className="text-xs text-bh-fg-4">
          Hacé clic en el enlace para restablecer tu contraseña.
        </p>
        <Link
          href="/auth/sign-in"
          className="mt-4 w-full rounded-bh-md bg-white/5 py-3 text-center text-sm text-bh-fg-1 transition-colors hover:bg-white/10"
        >
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-6">
        <h2 className="font-bh-display text-3xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1 mb-2">
          Recuperar <span className="text-bh-lime">cuenta</span>
        </h2>
        <p className="text-sm text-bh-fg-3">
          Ingresá tu email y te enviaremos un enlace para restablecer tu
          contraseña.
        </p>
      </div>

      <form onSubmit={handleResetPassword} className="space-y-4">
        <FormField
          id="bh-email"
          type="email"
          label="Correo electrónico"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          isRequired
          startContent={<Mail className="w-4 h-4" />}
        />

        {error && (
          <div className="rounded-bh-md border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] p-3 text-sm text-bh-danger">
            {error}
          </div>
        )}

        <Button
          type="submit"
          isLoading={loading}
          className="w-full bg-bh-lime text-bh-black font-semibold text-base py-6 rounded-xl shadow-[0_2px_12px_rgba(204,255,0,0.35)] hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)] transition-all"
        >
          {loading ? "Enviando..." : "Enviar enlace de recuperación"}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <Link
          href="/auth/sign-in"
          className="text-sm text-bh-fg-3 transition-colors hover:text-bh-fg-1"
        >
          ¿Recordaste tu contraseña? Iniciar sesión
        </Link>
      </div>
    </div>
  );
}
