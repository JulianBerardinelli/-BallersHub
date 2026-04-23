"use client";

import { useState } from "react";
import { Input, Button } from "@heroui/react";
import { Mail, Lock, Eye, EyeOff, Save, CheckCircle2, AlertCircle, Pencil, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import SectionCard from "@/components/dashboard/client/SectionCard";

export default function AccountSecurityForm({ defaultEmail, role, createdAt }: { defaultEmail: string; role: string; createdAt: string }) {
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);

  // Email state
  const [email, setEmail] = useState(defaultEmail);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Password state
  const [password, setPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleToggleEditing = () => {
    if (isEditing) {
      // Cancel edit mode
      setEmail(defaultEmail);
      setPassword("");
      setEmailMessage(null);
      setPasswordMessage(null);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email === defaultEmail) return;
    setEmailLoading(true);
    setEmailMessage(null);

    const { error } = await supabase.auth.updateUser({ email });
    setEmailLoading(false);

    if (error) {
      setEmailMessage({ text: error.message, type: "error" });
    } else {
      setEmailMessage({
        text: "Te hemos enviado un enlace de confirmación a tus correos para validar el cambio.",
        type: "success",
      });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setPasswordMessage({ text: "La contraseña debe tener al menos 6 caracteres.", type: "error" });
      return;
    }
    setPasswordLoading(true);
    setPasswordMessage(null);

    const { error } = await supabase.auth.updateUser({ password });
    setPasswordLoading(false);

    if (error) {
      setPasswordMessage({ text: error.message, type: "error" });
    } else {
      setPasswordMessage({ text: "Contraseña actualizada exitosamente.", type: "success" });
      setPassword("");
    }
  };

  return (
    <SectionCard
      title="Información de acceso"
      description="Actualizá tus credenciales o consultá la información básica de tu cuenta."
      actions={
        <Button
          size="sm"
          variant="light"
          isIconOnly
          aria-label={isEditing ? "Cancelar edición" : "Editar información de acceso"}
          onPress={handleToggleEditing}
          isDisabled={emailLoading || passwordLoading}
        >
          {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
        </Button>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <form onSubmit={handleUpdateEmail} className="space-y-3">
            <Input
              isReadOnly={!isEditing}
              label="Correo electrónico"
              placeholder="tu@email.com"
              value={email}
              onValueChange={setEmail}
              isRequired
              variant="flat"
              classNames={{
                inputWrapper: `border border-neutral-800 ${!isEditing ? 'bg-neutral-950/50 opacity-80 cursor-not-allowed' : 'bg-neutral-950/50 hover:bg-neutral-900 group-data-[focus=true]:bg-neutral-900 group-data-[focus=true]:border-white'}`,
                label: "text-neutral-400 font-medium",
              }}
              startContent={<Mail className="w-4 h-4 text-neutral-500" />}
            />
            {emailMessage && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${emailMessage.type === "success" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}>
                {emailMessage.type === "success" ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                <p>{emailMessage.text}</p>
              </div>
            )}
            {isEditing && (
              <Button
                type="submit"
                isLoading={emailLoading}
                isDisabled={email === defaultEmail}
                startContent={!emailLoading && <Save className="w-4 h-4" />}
                className="w-full bg-white text-black font-semibold"
              >
                {emailLoading ? "Actualizando..." : "Actualizar correo"}
              </Button>
            )}
          </form>

          <form onSubmit={handleUpdatePassword} className={`space-y-3 pt-6 border-t border-neutral-800 ${!isEditing ? 'hidden' : 'block'}`}>
            <Input
              type={isVisible ? "text" : "password"}
              label="Nueva contraseña"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onValueChange={setPassword}
              isRequired
              variant="flat"
              classNames={{
                inputWrapper: "border border-neutral-800 bg-neutral-950/50 hover:bg-neutral-900 group-data-[focus=true]:bg-neutral-900 group-data-[focus=true]:border-white",
                label: "text-neutral-400 font-medium",
              }}
              startContent={<Lock className="w-4 h-4 text-neutral-500" />}
              endContent={
                <button className="focus:outline-none" type="button" onClick={() => setIsVisible(!isVisible)}>
                  {isVisible ? (
                    <EyeOff className="w-4 h-4 text-neutral-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-neutral-500" />
                  )}
                </button>
              }
            />
            {passwordMessage && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${passwordMessage.type === "success" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}>
                {passwordMessage.type === "success" ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                <p>{passwordMessage.text}</p>
              </div>
            )}
            <Button
              type="submit"
              isLoading={passwordLoading}
              isDisabled={!password}
              startContent={!passwordLoading && <Save className="w-4 h-4" />}
              className="w-full bg-white text-black font-semibold"
            >
              {passwordLoading ? "Actualizando..." : "Actualizar contraseña"}
            </Button>
          </form>
          
          {!isEditing && (
             <Input
               isReadOnly
               type="password"
               label="Contraseña"
               value="********"
               variant="flat"
               classNames={{
                 inputWrapper: "border border-neutral-800 bg-neutral-950/50 opacity-80 cursor-not-allowed",
                 label: "text-neutral-400 font-medium",
               }}
               startContent={<Lock className="w-4 h-4 text-neutral-500" />}
             />
          )}

        </div>

        <div className="space-y-4">
          <Input
            isReadOnly
            label="Rol de la cuenta"
            value={role === "manager" ? "Agencia / Representante" : role === "admin" ? "Administrador" : "Jugador / Miembro"}
            variant="flat"
            classNames={{
              inputWrapper: "border border-neutral-800 bg-neutral-950/50 opacity-60 cursor-not-allowed",
              label: "text-neutral-400 font-medium",
            }}
            description="Afecta el tipo de perfil al que tienes acceso."
          />
          <Input
            isReadOnly
            label="Alta de la cuenta"
            value={createdAt ? new Date(createdAt).toLocaleDateString("es-AR", { year: 'numeric', month: 'long', day: 'numeric' }) : ""}
            variant="flat"
            classNames={{
              inputWrapper: "border border-neutral-800 bg-neutral-950/50 opacity-60 cursor-not-allowed",
              label: "text-neutral-400 font-medium",
            }}
          />
        </div>
      </div>
    </SectionCard>
  );
}
