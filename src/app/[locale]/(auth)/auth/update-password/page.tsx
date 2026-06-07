"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";

import FormField from "@/components/dashboard/client/FormField";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => setIsVisible(!isVisible);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);

    setTimeout(() => {
      router.push("/dashboard");
    }, 2000);
  }

  if (success) {
    return (
      <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-[rgba(34,197,94,0.12)] rounded-full flex items-center justify-center text-bh-success mb-2 border border-[rgba(34,197,94,0.25)]">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="font-bh-display text-2xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          Contraseña actualizada
        </h2>
        <p className="text-sm text-bh-fg-3">
          Tu contraseña fue cambiada de forma segura. Redirigiendo al panel...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-6">
        <h2 className="font-bh-display text-3xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1 mb-2">
          Nueva <span className="text-bh-lime">contraseña</span>
        </h2>
        <p className="text-sm text-bh-fg-3">
          Ingresá tu nueva contraseña a continuación.
        </p>
      </div>

      <form onSubmit={handleUpdatePassword} className="space-y-4">
        <FormField
          id="bh-password"
          type={isVisible ? "text" : "password"}
          label="Nueva contraseña"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          isRequired
          minLength={8}
          startContent={<Lock className="w-4 h-4" />}
          endContent={
            <button
              className="text-bh-fg-3 transition-colors hover:text-bh-fg-1 focus:outline-none"
              type="button"
              onClick={toggleVisibility}
              aria-label={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />

        <FormField
          id="bh-confirm-password"
          type={isVisible ? "text" : "password"}
          label="Confirmar contraseña"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          isRequired
          minLength={8}
          startContent={<Lock className="w-4 h-4" />}
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
          {loading ? "Actualizando..." : "Actualizar contraseña"}
        </Button>
      </form>
    </div>
  );
}
