"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";

import { updateManagerProfile } from "@/app/actions/manager-profiles";
import type { ManagerProfile } from "@/db/schema/managerProfiles";
import FormField from "@/components/dashboard/client/FormField";
import BhImageUploader from "@/components/ui/BhImageUploader";
import { bhButtonClass } from "@/components/ui/bh-button-class";

export default function ManagerProfileForm({ profile }: { profile: ManagerProfile }) {
  const [formData, setFormData] = useState({
    fullName: profile.fullName || "",
    avatarUrl: profile.avatarUrl || "",
    bio: profile.bio || "",
    contactEmail: profile.contactEmail || "",
    contactPhone: profile.contactPhone || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    const result = await updateManagerProfile(formData);

    setIsSubmitting(false);

    if (result.error) {
      setFeedback({ type: "error", message: result.error });
    } else {
      setFeedback({ type: "success", message: "Perfil actualizado correctamente." });
      router.refresh();
    }
  };

  const handleAvatarUpload = async (publicUrl: string) => {
    setFormData((curr) => ({ ...curr, avatarUrl: publicUrl }));
    const result = await updateManagerProfile({ ...formData, avatarUrl: publicUrl });
    if (result.error) {
      setFeedback({ type: "error", message: result.error });
    } else {
      setFeedback({ type: "success", message: "Foto actualizada." });
      router.refresh();
    }
  };

  const handleAvatarRemove = async () => {
    setFormData((curr) => ({ ...curr, avatarUrl: "" }));
    const result = await updateManagerProfile({ ...formData, avatarUrl: "" });
    if (result.error) {
      setFeedback({ type: "error", message: result.error });
    } else {
      setFeedback({ type: "success", message: "Foto eliminada." });
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Avatar Section */}
      <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6">
        <div className="mb-5 space-y-1">
          <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
            Tu foto de perfil
          </h3>
          <p className="max-w-xl text-sm leading-[1.55] text-bh-fg-3">
            Será visible en el portfolio de tu agencia y en las invitaciones a jugadores. Cuadrada y centrada en la cara funciona mejor.
          </p>
        </div>

        <BhImageUploader
          bucket="manager-avatars"
          pathFor={(file) => {
            const ext = file.name.split(".").pop() || "jpg";
            return `${profile.userId}/${profile.id}-${Date.now()}.${ext}`;
          }}
          currentUrl={formData.avatarUrl || null}
          onUploaded={handleAvatarUpload}
          onRemove={handleAvatarRemove}
          maxBytes={1.5 * 1024 * 1024}
          shape="circle"
          size={96}
          emptyLabel="Sin foto"
        />
      </div>

      {feedback && (
        <div
          className={`rounded-bh-md border p-3 text-sm ${
            feedback.type === "success"
              ? "border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.08)] text-bh-success"
              : "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-bh-danger"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="bh-mp-full-name"
          label="Nombre completo"
          placeholder="Juan Pérez"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          isRequired
        />

        <FormField
          id="bh-mp-email"
          label="Correo de contacto"
          placeholder="correo@ejemplo.com"
          type="email"
          value={formData.contactEmail}
          onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
          isRequired
        />

        <FormField
          id="bh-mp-phone"
          label="Teléfono móvil"
          placeholder="+54 9 11 1234 5678"
          value={formData.contactPhone}
          onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
        />
      </div>

      <FormField
        as="textarea"
        id="bh-mp-bio"
        label="Biografía corta (opcional)"
        placeholder="Breve descripción sobre vos, tu experiencia y lo que le ofreces a los jugadores."
        rows={4}
        value={formData.bio}
        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
      />

      <div className="flex justify-end border-t border-white/[0.06] pt-5">
        <Button
          type="submit"
          isLoading={isSubmitting}
          className={bhButtonClass({ variant: "lime", size: "sm" })}
        >
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
