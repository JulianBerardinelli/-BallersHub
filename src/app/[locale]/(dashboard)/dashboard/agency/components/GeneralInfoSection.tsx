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

type GeneralValues = {
  headquarters: string;
  foundationYear: string;
  description: string;
};

type StatusState = { type: "success" | "error"; message: string } | null;

type Props = {
  agencyId: string;
  agencyName: string;
  initialValues: GeneralValues;
};

export default function GeneralInfoSection({ agencyId, agencyName, initialValues }: Props) {
  const { enqueue } = useNotificationContext();
  const [defaults, setDefaults] = useState<GeneralValues>(initialValues);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);
  const [isPending, startTransition] = useTransition();

  const currentYear = new Date().getFullYear();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<GeneralValues>({ defaultValues: initialValues });

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
        const yearTrimmed = values.foundationYear.trim();
        const yearParsed = yearTrimmed ? parseInt(yearTrimmed, 10) : null;
        if (yearParsed !== null && (Number.isNaN(yearParsed) || yearParsed < 1800 || yearParsed > currentYear)) {
          setStatus({
            type: "error",
            message: `El año debe estar entre 1800 y ${currentYear}.`,
          });
          return;
        }

        await updateAgencyProfile(agencyId, {
          headquarters: values.headquarters.trim() || null,
          foundationYear: yearParsed,
          description: values.description.trim() || null,
        });

        setDefaults(values);
        reset(values);
        setIsEditing(false);
        setStatus({ type: "success", message: "Información general actualizada." });
        enqueue(
          profileNotification.updated({
            userName: agencyName,
            sectionLabel: "Información general",
            changedFields: ["sede", "fundación", "descripción"],
          }),
        );
      } catch (err) {
        setStatus({
          type: "error",
          message: err instanceof Error ? err.message : "Error al guardar información general.",
        });
      }
    });
  });

  return (
    <SectionCard
      title="Información general"
      description="Sede central, año de fundación y la biografía extendida que aparece en la sección 'Sobre la agencia'."
      actions={
        <EditPencilButton
          isEditing={isEditing}
          onPress={() => (isEditing ? onCancel() : setIsEditing(true))}
          isDisabled={isPending}
          ariaLabel="información general"
        />
      }
    >
      <form className="grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            key={`hq-${defaults.headquarters}`}
            id="agency_hq"
            label="Sede central"
            placeholder="Ej: Madrid, España"
            readOnly={!isEditing}
            defaultValue={defaults.headquarters}
            {...register("headquarters")}
          />
          <FormField
            key={`year-${defaults.foundationYear}`}
            id="agency_foundation_year"
            type="number"
            label="Año de fundación"
            placeholder="Ej: 2010"
            readOnly={!isEditing}
            min={1800}
            max={currentYear}
            defaultValue={defaults.foundationYear}
            {...register("foundationYear")}
            isInvalid={Boolean(errors.foundationYear)}
          />
        </div>

        <FormField
          key={`desc-${defaults.description}`}
          id="agency_description"
          as="textarea"
          rows={6}
          label="Sobre la agencia"
          placeholder="Escribí la historia, los valores y el enfoque principal de tu agencia..."
          readOnly={!isEditing}
          defaultValue={defaults.description}
          description="Texto largo, hasta 4000 caracteres. Aparece en el bloque 'Sobre la agencia'."
          maxLength={4000}
          {...register("description")}
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
              Guardar información
            </Button>
          </div>
        ) : null}
      </form>
    </SectionCard>
  );
}
