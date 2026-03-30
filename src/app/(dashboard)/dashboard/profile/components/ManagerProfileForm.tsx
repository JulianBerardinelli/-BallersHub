"use client";

import { useState } from "react";
import { Button, Input, Textarea } from "@heroui/react";
import { updateManagerProfile } from "@/app/actions/manager-profiles";
import type { ManagerProfile } from "@/db/schema/managerProfiles";
import { useRouter } from "next/navigation";

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

  const handleAvatarUpdate = async (url: string) => {
    setFormData((prev) => ({ ...prev, avatarUrl: url }));
    // Auto-save the avatar directly 
    await updateManagerProfile({ avatarUrl: url });
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      
      {/* Avatar Section */}
      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-xl border border-neutral-800 bg-neutral-900/40">
        <div className="h-24 w-24 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500 overflow-hidden">
           {formData.avatarUrl ? (
             <img src={formData.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
           ) : (
             <span className="text-sm">Sin Foto</span>
           )}
        </div>
        <div className="text-center sm:text-left space-y-2">
          <h3 className="text-lg font-medium text-white">Tu foto de perfil</h3>
          <p className="text-sm text-neutral-400 max-w-sm">
            Será visible públicamente en el perfil de tu agencia y en las invitaciones de revisión.
          </p>
          <div className="pt-2">
            <Input 
              type="text" 
              placeholder="https://... (URL de la imagen por ahora)" 
              value={formData.avatarUrl}
              onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
              className="max-w-xs"
              size="sm"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Input
          label="Nombre Completo"
          labelPlacement="outside"
          placeholder="Juan Pérez"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          classNames={{ inputWrapper: "bg-neutral-950 border-neutral-800" }}
          isRequired
        />

        <Input
          label="Correo de Contacto"
          labelPlacement="outside"
          placeholder="correo@ejemplo.com"
          type="email"
          value={formData.contactEmail}
          onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
          classNames={{ inputWrapper: "bg-neutral-950 border-neutral-800" }}
          isRequired
        />

        <Input
          label="Teléfono Móvil"
          labelPlacement="outside"
          placeholder="+54 9 11 1234 5678"
          value={formData.contactPhone}
          onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
          classNames={{ inputWrapper: "bg-neutral-950 border-neutral-800" }}
        />
      </div>

      <Textarea
        label="Biografía Corta (Opcional)"
        labelPlacement="outside"
        placeholder="Breve descripción sobre ti, tu experiencia y lo que le ofreces a los jugadores."
        classNames={{ inputWrapper: "bg-neutral-950 border-neutral-800" }}
        minRows={4}
        value={formData.bio}
        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
      />

      <div className="flex justify-end pt-4 border-t border-neutral-800">
        <Button 
          type="submit" 
          color="primary" 
          isLoading={isSubmitting}
          className="font-medium"
        >
          Guardar Cambios
        </Button>
      </div>
    </form>
  );
}
