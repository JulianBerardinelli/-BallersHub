"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Input, Button } from "@heroui/react";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";

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
    
    // Redirect to dashboard after brief delay
    setTimeout(() => {
      router.push("/dashboard");
    }, 2000);
  }

  if (success) {
    return (
      <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mb-2">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">¡Contraseña actualizada!</h2>
        <p className="text-sm text-neutral-400">
          Tu contraseña ha sido cambiada de forma segura. Redirigiendo al panel...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Nueva contraseña</h2>
        <p className="text-sm text-neutral-400">
          Por favor, ingresa tu nueva contraseña a continuación.
        </p>
      </div>

      <form onSubmit={handleUpdatePassword} className="space-y-4">
        <Input
          type={isVisible ? "text" : "password"}
          label="Nueva contraseña"
          placeholder="********"
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

        <Input
          type={isVisible ? "text" : "password"}
          label="Confirmar contraseña"
          placeholder="********"
          value={confirmPassword}
          onValueChange={setConfirmPassword}
          isRequired
          minLength={8}
          variant="bordered"
          classNames={{
            inputWrapper: "border-neutral-800 bg-neutral-950/50 hover:border-neutral-700 data-[focus=true]:border-white data-[focus=true]:bg-neutral-900",
            label: "text-neutral-400",
          }}
          startContent={<Lock className="w-4 h-4 text-neutral-500" />}
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
          {loading ? "Actualizando..." : "Actualizar contraseña"}
        </Button>
      </form>
    </div>
  );
}
