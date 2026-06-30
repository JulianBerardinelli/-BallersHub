"use client";

// Editor de "datos personales (básicos)" del coach: residencia + educación.
// fullName/birthDate/nationality NO se editan acá — viven en coach_profiles y
// los toca el CoachProfileEditor (y en parte el flujo de revisión del onboarding).

import { useEffect, useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { useForm } from "react-hook-form";
import { Pencil, X } from "lucide-react";

import FormField from "@/components/dashboard/client/FormField";
import SectionCard from "@/components/dashboard/client/SectionCard";

import {
  updateCoachBasicInformation,
  type CoachBasicInfoResponse,
} from "@/app/actions/coach-personal-data";

type FormValues = {
  residence: string;
  education: string;
};

type StatusState = { type: "success" | "error"; message: string } | null;

const EDUCATION_MAX_LENGTH = 200;

export type CoachBasicInfoAction = (input: {
  coachId: string;
  residence?: string;
  education?: string;
}) => Promise<
  | { success: true; data: CoachBasicInfoResponse; message?: string; updatedFields: string[] }
  | { success: false; message: string; fieldErrors?: Record<string, string | undefined> }
>;

type Props = {
  coachId: string;
  initialValues: FormValues;
  action?: CoachBasicInfoAction;
};

export default function CoachBasicInformationSection({
  coachId,
  initialValues,
  action = (input) => updateCoachBasicInformation({ coachId: input.coachId, ...input }),
}: Props) {
  const [defaults, setDefaults] = useState<FormValues>(initialValues);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ defaultValues: initialValues });

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
      const result = await action({
        coachId,
        residence: values.residence,
        education: values.education,
      });
      if (!result.success) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            if (!message) return;
            setError(field as keyof FormValues, { type: "server", message });
          });
        }
        setStatus({ type: "error", message: result.message });
        return;
      }
      setDefaults(result.data);
      reset(result.data);
      setIsEditing(false);
      setStatus({ type: "success", message: result.message ?? "Datos personales actualizados." });
    });
  });

  return (
    <SectionCard
      title="Datos básicos"
      description="Residencia y educación se publican en tu página pública (ficha del coach)."
      actions={
        <Button
          size="sm"
          variant="light"
          isIconOnly
          aria-label={isEditing ? "Cancelar edición" : "Editar"}
          onPress={handleToggleEditing}
          isDisabled={isPending}
        >
          {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
        </Button>
      }
    >
      <form className="grid gap-6" onSubmit={onSubmit}>
        <FormField
          key={`residence-${defaults.residence}`}
          id="residence"
          label="Residencia"
          placeholder='Ej "Buenos Aires, Argentina"'
          description="Ciudad y país (separados por coma). El país se valida contra la base de países si lo reconocemos."
          readOnly={!isEditing}
          defaultValue={defaults.residence}
          errorMessage={errors.residence?.message}
          {...register("residence")}
        />
        <FormField
          key={`education-${defaults.education}`}
          id="education"
          label="Educación"
          placeholder='Ej "Licenciado en Educación Física", "Profesor de Educación Física"'
          description={`Línea corta (máx ${EDUCATION_MAX_LENGTH} caracteres). Se muestra en la ficha pública.`}
          maxLength={EDUCATION_MAX_LENGTH}
          readOnly={!isEditing}
          defaultValue={defaults.education}
          errorMessage={errors.education?.message}
          {...register("education", {
            maxLength: {
              value: EDUCATION_MAX_LENGTH,
              message: `La educación no puede superar los ${EDUCATION_MAX_LENGTH} caracteres.`,
            },
          })}
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
