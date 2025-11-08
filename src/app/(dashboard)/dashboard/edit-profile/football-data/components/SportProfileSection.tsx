"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { useForm } from "react-hook-form";
import { Pencil, X } from "lucide-react";

import FormField from "@/components/dashboard/client/FormField";
import SectionCard from "@/components/dashboard/client/SectionCard";

import { updateSportProfile } from "../actions";

type SportProfileFormValues = {
  positions: string;
  foot: string;
  currentClub: string;
  contractStatus: string;
};

type StatusState = { type: "success" | "error"; message: string } | null;

type Props = {
  playerId: string;
  initialValues: SportProfileFormValues;
};

export default function SportProfileSection({ playerId, initialValues }: Props) {
  const [defaults, setDefaults] = useState<SportProfileFormValues>(initialValues);
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
  } = useForm<SportProfileFormValues>({
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

      const result = await updateSportProfile({
        playerId,
        foot: values.foot,
        contractStatus: values.contractStatus,
      });

      if (!result.success) {
        if (result.fieldErrors) {
          if (result.fieldErrors.foot) {
            setError("foot", { type: "server", message: result.fieldErrors.foot });
          }
          if (result.fieldErrors.contractStatus) {
            setError("contractStatus", { type: "server", message: result.fieldErrors.contractStatus });
          }
        }

        setStatus({ type: "error", message: result.message });
        return;
      }

      setDefaults(result.data);
      reset(result.data);
      setIsEditing(false);
      setStatus({
        type: "success",
        message: result.message ?? "Perfil deportivo actualizado correctamente.",
      });
    });
  });

  return (
    <SectionCard
      title="Perfil deportivo"
      description="Definí tus posiciones naturales, perfil y club actual para orientar a scouts y clubes."
      actions={
        <Button
          size="sm"
          variant="light"
          isIconOnly
          aria-label={isEditing ? "Cancelar edición" : "Editar perfil deportivo"}
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
            key={`positions-${defaults.positions}`}
            id="positions"
            label="Posiciones principales"
            placeholder="Ej: Mediocentro, Interior Derecho"
            readOnly
            defaultValue={defaults.positions}
            errorMessage={errors.positions?.message}
            {...register("positions")}
          />
          <FormField
            key={`foot-${defaults.foot}`}
            id="foot"
            label="Perfil dominante"
            placeholder="Derecho, Izquierdo, Ambidiestro"
            readOnly={!isEditing}
            defaultValue={defaults.foot}
            errorMessage={errors.foot?.message}
            {...register("foot")}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            key={`currentClub-${defaults.currentClub}`}
            id="current_club"
            label="Club actual"
            placeholder="Equipo o agencia actual"
            readOnly
            defaultValue={defaults.currentClub}
            errorMessage={errors.currentClub?.message}
            {...register("currentClub")}
          />
          <FormField
            key={`contractStatus-${defaults.contractStatus}`}
            id="contract_status"
            label="Situación contractual"
            placeholder="Libre, con contrato hasta 2026, etc."
            description="Configuración pendiente de integración con contratos y documentos."
            readOnly={!isEditing}
            defaultValue={defaults.contractStatus}
            errorMessage={errors.contractStatus?.message}
            {...register("contractStatus")}
          />
        </div>

        {status ? (
          <div>
            <Chip color={status.type === "success" ? "success" : "danger"} variant="flat" className="text-sm">
              {status.message}
            </Chip>
          </div>
        ) : null}

        {isEditing ? (
          <div className="flex flex-col gap-3 border-t border-neutral-900 pt-4 sm:flex-row sm:justify-end">
            <Button variant="light" onPress={handleCancel} isDisabled={isPending}>
              Cancelar
            </Button>
            <Button color="primary" type="submit" isDisabled={isPending || !isDirty} isLoading={isPending}>
              Guardar cambios
            </Button>
          </div>
        ) : null}
      </form>
    </SectionCard>
  );
}
