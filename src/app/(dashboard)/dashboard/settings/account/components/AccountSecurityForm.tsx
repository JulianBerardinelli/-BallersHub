"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { Mail, Lock, Eye, EyeOff, Save, CheckCircle2, AlertCircle, Pencil, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

import SectionCard from "@/components/dashboard/client/SectionCard";
import FormField from "@/components/dashboard/client/FormField";

const SAVE_BUTTON_CLS =
  "w-full rounded-bh-md bg-bh-lime px-4 py-2.5 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)] data-[disabled=true]:opacity-40 data-[disabled=true]:hover:translate-y-0 data-[disabled=true]:shadow-none";

function MessageBox({
  message,
}: {
  message: { text: string; type: "success" | "error" };
}) {
  const isSuccess = message.type === "success";
  return (
    <div
      className={`flex items-start gap-2 rounded-bh-md border p-3 text-[12px] ${
        isSuccess
          ? "border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.08)] text-bh-success"
          : "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-bh-danger"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <p className="leading-[1.5]">{message.text}</p>
    </div>
  );
}

export default function AccountSecurityForm({
  defaultEmail,
  role,
  createdAt,
}: {
  defaultEmail: string;
  role: string;
  createdAt: string;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const [email, setEmail] = useState(defaultEmail);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [password, setPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleToggleEditing = () => {
    if (isEditing) {
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
        text: "Te enviamos un enlace de confirmación a tu correo para validar el cambio.",
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

  const roleLabel =
    role === "manager"
      ? "Agencia / Representante"
      : role === "admin"
        ? "Administrador"
        : "Jugador / Miembro";

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
          className="rounded-bh-md text-bh-fg-3 transition-colors hover:bg-white/[0.06] hover:text-bh-fg-1"
        >
          {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
        </Button>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <form onSubmit={handleUpdateEmail} className="space-y-3">
            <FormField
              id="bh-acc-email"
              type="email"
              label="Correo electrónico"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              isRequired
              disabled={!isEditing}
              startContent={<Mail className="h-4 w-4" />}
            />
            {emailMessage && <MessageBox message={emailMessage} />}
            {isEditing && (
              <Button
                type="submit"
                isLoading={emailLoading}
                isDisabled={email === defaultEmail}
                startContent={!emailLoading && <Save className="h-4 w-4" />}
                className={SAVE_BUTTON_CLS}
              >
                {emailLoading ? "Actualizando..." : "Actualizar correo"}
              </Button>
            )}
          </form>

          <form
            onSubmit={handleUpdatePassword}
            className={`space-y-3 border-t border-white/[0.06] pt-5 ${!isEditing ? "hidden" : "block"}`}
          >
            <FormField
              id="bh-acc-password"
              type={isVisible ? "text" : "password"}
              label="Nueva contraseña"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              isRequired
              startContent={<Lock className="h-4 w-4" />}
              endContent={
                <button
                  className="text-bh-fg-3 transition-colors hover:text-bh-fg-1 focus:outline-none"
                  type="button"
                  onClick={() => setIsVisible(!isVisible)}
                  aria-label={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            {passwordMessage && <MessageBox message={passwordMessage} />}
            <Button
              type="submit"
              isLoading={passwordLoading}
              isDisabled={!password}
              startContent={!passwordLoading && <Save className="h-4 w-4" />}
              className={SAVE_BUTTON_CLS}
            >
              {passwordLoading ? "Actualizando..." : "Actualizar contraseña"}
            </Button>
          </form>

          {!isEditing && (
            <FormField
              id="bh-acc-password-display"
              type="password"
              label="Contraseña"
              value="••••••••"
              disabled
              readOnly
              startContent={<Lock className="h-4 w-4" />}
            />
          )}
        </div>

        <div className="space-y-4">
          <FormField
            id="bh-acc-role"
            label="Rol de la cuenta"
            value={roleLabel}
            disabled
            readOnly
            description="Afecta el tipo de perfil al que tenés acceso."
          />
          <FormField
            id="bh-acc-created"
            label="Alta de la cuenta"
            value={
              createdAt
                ? new Date(createdAt).toLocaleDateString("es-AR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : ""
            }
            disabled
            readOnly
          />
        </div>
      </div>
    </SectionCard>
  );
}
