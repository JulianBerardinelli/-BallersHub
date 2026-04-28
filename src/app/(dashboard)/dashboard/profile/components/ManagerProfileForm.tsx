"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { updateManagerProfile } from "@/app/actions/manager-profiles";
import type { ManagerProfile } from "@/db/schema/managerProfiles";
import { useRouter } from "next/navigation";

import FormField from "@/components/dashboard/client/FormField";

export default function ManagerProfileForm({ profile }: { profile: ManagerProfile }) {
  const [formData, setFormData] = useState({
    fullName: profile.fullName || "",
    avatarUrl: profile.avatarUrl || "",
    bio: profile.bio || "",
    contactEmail: profile.contactEmail || "",
    contactPhone: profile.contactPhone || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await updateManagerProfile(formData);

    setIsSubmitting(false);

    if (result.error) {
      alert(result.error);
    } else {
      alert("Perfil actualizado correctamente");
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Avatar Section */}
      <div className="flex flex-col items-center gap-6 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6 sm:flex-row">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.08] bg-bh-surface-2 text-bh-fg-4">
          {formData.avatarUrl ? (
            <img src={formData.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[11px]">Sin foto</span>
          )}
        </div>
        <div className="flex-1 space-y-3 text-center sm:text-left">
          <div className="space-y-1">
            <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
              Tu foto de perfil
            </h3>
            <p className="max-w-sm text-sm leading-[1.55] text-bh-fg-3">
              Será visible públicamente en el perfil de tu agencia y en las
              invitaciones de revisión.
            </p>
          </div>
          <div className="max-w-md">
            <FormField
              id="bh-mp-avatar-url"
              type="text"
              label="URL de la imagen"
              placeholder="https://..."
              value={formData.avatarUrl}
              onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
            />
          </div>
        </div>
      </div>

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
          className="rounded-bh-md bg-bh-lime px-5 py-2.5 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
        >
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
