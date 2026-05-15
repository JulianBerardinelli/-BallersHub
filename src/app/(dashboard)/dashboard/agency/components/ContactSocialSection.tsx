"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { useForm } from "react-hook-form";
import FormField from "@/components/dashboard/client/FormField";
import SectionCard from "@/components/dashboard/client/SectionCard";
import EditPencilButton from "./EditPencilButton";
import { updateAgencyProfile } from "@/app/actions/agencies";
import { useNotificationContext, profileNotification } from "@/modules/notifications";
import { bhButtonClass } from "@/components/ui/bh-button-class";

type ContactValues = {
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  verifiedLink: string;
  instagramUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
};

type StatusState = { type: "success" | "error"; message: string } | null;

type Props = {
  agencyId: string;
  agencyName: string;
  initialValues: ContactValues;
};

export default function ContactSocialSection({ agencyId, agencyName, initialValues }: Props) {
  const { enqueue } = useNotificationContext();
  const [defaults, setDefaults] = useState<ContactValues>(initialValues);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<ContactValues>({ defaultValues: initialValues });

  useEffect(() => {
    setDefaults(initialValues);
    reset(initialValues);
  }, [initialValues, reset]);

  const onCancel = () => {
    reset(defaults);
    setIsEditing(false);
    setStatus(null);
  };

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      setStatus(null);
      try {
        const trimmed = Object.fromEntries(
          Object.entries(values).map(([k, v]) => [k, (v ?? "").trim() || null]),
        ) as Record<keyof ContactValues, string | null>;

        await updateAgencyProfile(agencyId, trimmed);
        const next = Object.fromEntries(
          Object.entries(values).map(([k, v]) => [k, (v ?? "").trim()]),
        ) as ContactValues;
        setDefaults(next);
        reset(next);
        setIsEditing(false);
        setStatus({ type: "success", message: "Contacto y redes actualizadas." });
        enqueue(
          profileNotification.updated({
            userName: agencyName,
            sectionLabel: "Contacto y redes",
            changedFields: ["email", "teléfono", "redes"],
          }),
        );
      } catch (err) {
        setStatus({
          type: "error",
          message: err instanceof Error ? err.message : "Error al guardar contacto.",
        });
      }
    });
  });

  return (
    <SectionCard
      title="Contacto y redes"
      description="Email, teléfono, sitio web, enlace verificado y perfiles sociales que aparecen en el portfolio."
      actions={
        <EditPencilButton
          isEditing={isEditing}
          onPress={() => (isEditing ? onCancel() : setIsEditing(true))}
          isDisabled={isPending}
          ariaLabel="contacto y redes"
        />
      }
    >
      <form className="grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            key={`email-${defaults.contactEmail}`}
            label="Email institucional"
            type="email"
            placeholder="agencia@ejemplo.com"
            readOnly={!isEditing}
            defaultValue={defaults.contactEmail}
            {...register("contactEmail")}
          />
          <FormField
            key={`phone-${defaults.contactPhone}`}
            label="Teléfono comercial"
            type="tel"
            placeholder="+54 9 11 1234 5678"
            readOnly={!isEditing}
            defaultValue={defaults.contactPhone}
            {...register("contactPhone")}
          />
          <FormField
            key={`web-${defaults.websiteUrl}`}
            label="Sitio web (opcional)"
            type="url"
            placeholder="https://tu-agencia.com"
            readOnly={!isEditing}
            defaultValue={defaults.websiteUrl}
            {...register("websiteUrl")}
          />
          <FormField
            key={`verified-${defaults.verifiedLink}`}
            label="Enlace verificado (Transfermarkt, etc.)"
            type="url"
            placeholder="https://transfermarkt..."
            readOnly={!isEditing}
            defaultValue={defaults.verifiedLink}
            {...register("verifiedLink")}
          />
          <FormField
            key={`ig-${defaults.instagramUrl}`}
            label="Instagram"
            type="url"
            placeholder="https://instagram.com/tuagencia"
            readOnly={!isEditing}
            defaultValue={defaults.instagramUrl}
            {...register("instagramUrl")}
          />
          <FormField
            key={`tw-${defaults.twitterUrl}`}
            label="Twitter / X"
            type="url"
            placeholder="https://twitter.com/tuagencia"
            readOnly={!isEditing}
            defaultValue={defaults.twitterUrl}
            {...register("twitterUrl")}
          />
          <FormField
            key={`li-${defaults.linkedinUrl}`}
            label="LinkedIn"
            type="url"
            placeholder="https://linkedin.com/company/tuagencia"
            readOnly={!isEditing}
            defaultValue={defaults.linkedinUrl}
            {...register("linkedinUrl")}
          />
        </div>

        {status ? (
          <div>
            <Chip
              color={status.type === "success" ? "success" : "danger"}
              variant="flat"
              className="text-sm"
            >
              {status.message}
            </Chip>
          </div>
        ) : null}

        {isEditing ? (
          <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:justify-end">
            <Button variant="light" onPress={onCancel} isDisabled={isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              isDisabled={isPending || !isDirty}
              isLoading={isPending}
              className={bhButtonClass({ variant: "lime", size: "sm" })}
            >
              Guardar contacto
            </Button>
          </div>
        ) : null}
      </form>
    </SectionCard>
  );
}
