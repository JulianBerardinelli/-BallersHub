"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { useForm } from "react-hook-form";
import { Pencil, X } from "lucide-react";

import FormField from "@/components/dashboard/client/FormField";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { profileNotification, useNotificationContext } from "@/modules/notifications";

import { updateContactInformation } from "../actions";

type ContactFormValues = {
  email: string;
  phone: string;
  languages: string;
  documents: string;
  documentCountry: string;
};

type StatusState = { type: "success" | "error"; message: string } | null;

type Props = {
  playerId: string;
  initialValues: ContactFormValues;
};

export default function ContactInformationSection({ playerId, initialValues }: Props) {
  const [defaults, setDefaults] = useState<ContactFormValues>(initialValues);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);
  const [isPending, startTransition] = useTransition();
  const { enqueue } = useNotificationContext();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<ContactFormValues>({
    defaultValues: initialValues,
  });

  useEffect(() => {
    setDefaults(initialValues);
    reset(initialValues);
  }, [initialValues, reset]);

  function handleToggleEditing() {
    if (isEditing) {
      reset(defaults);
      clearErrors();
      setStatus(null);
      setIsEditing(false);
      return;
    }

    clearErrors();
    setStatus(null);
    setIsEditing(true);
  }

  function handleCancel() {
    reset(defaults);
    clearErrors();
    setStatus(null);
    setIsEditing(false);
  }

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      setStatus(null);
      clearErrors();

      const result = await updateContactInformation({
        playerId,
        email: values.email,
        phone: values.phone,
        languages: values.languages,
        documents: values.documents,
        documentCountry: values.documentCountry,
      });

      if (!result.success) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            if (!message) return;
            setError(field as keyof ContactFormValues, { type: "server", message });
          });
        }
        setStatus({ type: "error", message: result.message });
        return;
      }

      setDefaults(result.data);
      reset(result.data);
      setIsEditing(false);
      setStatus({ type: "success", message: result.message ?? "Datos de contacto actualizados correctamente." });

      if (result.updatedFields.length > 0) {
        enqueue(
          profileNotification.updated({
            sectionLabel: "tus datos de contacto",
            changedFields: result.updatedFields,
            detailsHref: "/dashboard/edit-profile/personal-data",
          }),
        );
      }
    });
  });

  return (
    <SectionCard
      title="Datos de contacto"
      description="Esta información se utilizará para comunicaciones privadas. Podrás decidir qué mostrar de forma pública."
      actions={
        <Button
          size="sm"
          variant="light"
          isIconOnly
          aria-label={isEditing ? "Cancelar edición" : "Editar datos de contacto"}
          onPress={handleToggleEditing}
          isDisabled={isPending}
        >
          {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
        </Button>
      }
    >
      <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <FormField
          key={`email-${defaults.email}`}
          id="email"
          label="Email principal"
          readOnly={!isEditing}
          defaultValue={defaults.email}
          errorMessage={errors.email?.message}
          {...register("email")}
        />
        <FormField
          key={`phone-${defaults.phone}`}
          id="phone"
          label="Teléfono de contacto"
          placeholder="Próximamente podrás agregar números verificados"
          readOnly={!isEditing}
          defaultValue={defaults.phone}
          errorMessage={errors.phone?.message}
          {...register("phone")}
        />
        <FormField
          key={`languages-${defaults.languages}`}
          id="languages"
          label="Idiomas"
          placeholder="Ej: Español, Inglés"
          description="Definí los idiomas en los que te pueden contactar."
          readOnly={!isEditing}
          defaultValue={defaults.languages}
          errorMessage={errors.languages?.message}
          {...register("languages")}
        />
        <FormField
          key={`documents-${defaults.documents}`}
          id="documents"
          label="Documentación"
          placeholder="Pasaporte UE, DNI, etc."
          description="Se integrará con verificación documental más adelante."
          readOnly={!isEditing}
          defaultValue={defaults.documents}
          errorMessage={errors.documents?.message}
          {...register("documents")}
        />
        <FormField
          key={`documentCountry-${defaults.documentCountry}`}
          id="document_country"
          label="País del documento"
          placeholder="País emisor"
          readOnly={!isEditing}
          defaultValue={defaults.documentCountry}
          errorMessage={errors.documentCountry?.message}
          {...register("documentCountry")}
        />

        <div className="md:col-span-2 md:mt-2">
          {status ? (
            <Chip
              color={status.type === "success" ? "success" : "danger"}
              variant="flat"
              className="text-sm"
            >
              {status.message}
            </Chip>
          ) : null}
        </div>

        {isEditing ? (
          <div className="md:col-span-2">
            <div className="flex flex-col gap-3 border-t border-neutral-900 pt-4 sm:flex-row sm:justify-end">
              <Button variant="light" onPress={handleCancel} isDisabled={isPending}>
                Cancelar
              </Button>
              <Button
                color="primary"
                type="submit"
                isDisabled={isPending || !isDirty}
                isLoading={isPending}
              >
                Guardar cambios
              </Button>
            </div>
          </div>
        ) : null}
      </form>
    </SectionCard>
  );
}
