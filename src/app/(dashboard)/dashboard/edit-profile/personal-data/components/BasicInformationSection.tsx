"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { useForm } from "react-hook-form";
import { Pencil, X } from "lucide-react";

import FormField from "@/components/dashboard/client/FormField";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { profileNotification, useNotificationContext } from "@/modules/notifications";

import { updateBasicInformation } from "../actions";

type BasicInfoFormValues = {
  fullName: string;
  birthDate: string;
  nationalities: string;
  residence: string;
  heightCm: string;
  weightKg: string;
  bio: string;
};

type StatusState = { type: "success" | "error"; message: string } | null;

type Props = {
  playerId: string;
  initialValues: BasicInfoFormValues;
};

export default function BasicInformationSection({ playerId, initialValues }: Props) {
  const [defaults, setDefaults] = useState<BasicInfoFormValues>(initialValues);
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
  } = useForm<BasicInfoFormValues>({
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

      const result = await updateBasicInformation({
        playerId,
        fullName: defaults.fullName,
        birthDate: values.birthDate,
        nationalities: defaults.nationalities,
        residence: values.residence,
        heightCm: values.heightCm,
        weightKg: values.weightKg,
        bio: values.bio,
      });

      if (!result.success) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            if (!message) return;
            setError(field as keyof BasicInfoFormValues, { type: "server", message });
          });
        }
        setStatus({ type: "error", message: result.message });
        return;
      }

      setDefaults(result.data);
      reset(result.data);
      setIsEditing(false);
      setStatus({ type: "success", message: result.message ?? "Información actualizada correctamente." });

      if (result.updatedFields.length > 0) {
        enqueue(
          profileNotification.updated({
            sectionLabel: "tu información básica",
            changedFields: result.updatedFields,
            userName: result.data.fullName || undefined,
            detailsHref: "/dashboard/edit-profile/personal-data",
          }),
        );
      }
    });
  });

  return (
    <SectionCard
      title="Información básica"
      description="Próximamente podrás editar cada campo y sincronizar la información con tus documentos oficiales."
      actions={
        <Button
          size="sm"
          variant="light"
          isIconOnly
          aria-label={isEditing ? "Cancelar edición" : "Editar información básica"}
          onPress={handleToggleEditing}
          isDisabled={isPending}
        >
          {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
        </Button>
      }
    >
      <form className="grid gap-6" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            key={`fullName-${defaults.fullName}`}
            id="full_name"
            label="Nombre completo"
            readOnly
            defaultValue={defaults.fullName}
            errorMessage={errors.fullName?.message}
            {...register("fullName")}
          />
          <FormField
            key={`birthDate-${defaults.birthDate}`}
            id="birth_date"
            label="Fecha de nacimiento"
            placeholder="dd/mm/aaaa"
            readOnly={!isEditing}
            defaultValue={defaults.birthDate}
            errorMessage={errors.birthDate?.message}
            {...register("birthDate")}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            key={`nationalities-${defaults.nationalities}`}
            id="nationality"
            label="Nacionalidades"
            placeholder="Seleccioná una o más nacionalidades"
            readOnly
            defaultValue={defaults.nationalities}
            errorMessage={errors.nationalities?.message}
            {...register("nationalities")}
          />
          <FormField
            key={`residence-${defaults.residence}`}
            id="residence"
            label="Residencia actual"
            placeholder="Ciudad, país"
            description="Podrás definir la ubicación que se mostrará en tu perfil."
            readOnly={!isEditing}
            defaultValue={defaults.residence}
            errorMessage={errors.residence?.message}
            {...register("residence")}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            key={`height-${defaults.heightCm}`}
            id="height_cm"
            label="Altura (cm)"
            placeholder="Ej: 184"
            readOnly={!isEditing}
            defaultValue={defaults.heightCm}
            errorMessage={errors.heightCm?.message}
            {...register("heightCm")}
          />
          <FormField
            key={`weight-${defaults.weightKg}`}
            id="weight_kg"
            label="Peso (kg)"
            placeholder="Ej: 78"
            readOnly={!isEditing}
            defaultValue={defaults.weightKg}
            errorMessage={errors.weightKg?.message}
            {...register("weightKg")}
          />
        </div>
        <FormField
          key={`bio-${defaults.bio}`}
          id="bio"
          as="textarea"
          rows={4}
          label="Biografía breve"
          placeholder="Contá brevemente tu trayectoria y objetivos profesionales."
          readOnly={!isEditing}
          defaultValue={defaults.bio}
          errorMessage={errors.bio?.message}
          {...register("bio")}
        />

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
        ) : null}
      </form>
    </SectionCard>
  );
}
