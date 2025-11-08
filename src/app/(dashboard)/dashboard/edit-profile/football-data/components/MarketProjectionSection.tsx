"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { useForm } from "react-hook-form";
import { Pencil, X } from "lucide-react";

import FormField from "@/components/dashboard/client/FormField";
import SectionCard from "@/components/dashboard/client/SectionCard";

import { updateMarketProjection } from "../actions";

type MarketProjectionFormValues = {
  marketValue: string;
  careerObjectives: string;
};

type StatusState = { type: "success" | "error"; message: string } | null;

type Props = {
  playerId: string;
  initialValues: MarketProjectionFormValues;
};

export default function MarketProjectionSection({ playerId, initialValues }: Props) {
  const [defaults, setDefaults] = useState<MarketProjectionFormValues>(initialValues);
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
  } = useForm<MarketProjectionFormValues>({
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

      const result = await updateMarketProjection({
        playerId,
        marketValue: values.marketValue,
        careerObjectives: values.careerObjectives,
      });

      if (!result.success) {
        if (result.fieldErrors) {
          if (result.fieldErrors.marketValue) {
            setError("marketValue", { type: "server", message: result.fieldErrors.marketValue });
          }
          if (result.fieldErrors.careerObjectives) {
            setError("careerObjectives", { type: "server", message: result.fieldErrors.careerObjectives });
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
        message: result.message ?? "Valor de mercado actualizado correctamente.",
      });
    });
  });

  return (
    <SectionCard
      title="Valor de mercado y proyección"
      description="Consolidá métricas económicas para potenciar negociaciones con clubes y agentes."
      actions={
        <Button
          size="sm"
          variant="light"
          isIconOnly
          aria-label={isEditing ? "Cancelar edición" : "Editar valor de mercado"}
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
            key={`marketValue-${defaults.marketValue}`}
            id="market_value"
            label="Valor de mercado"
            placeholder="Ej: 250000"
            description="El dato podrá integrarse con plataformas externas para mantenerlo actualizado."
            readOnly={!isEditing}
            defaultValue={defaults.marketValue}
            errorMessage={errors.marketValue?.message}
            {...register("marketValue")}
          />
          <FormField
            key={`careerObjectives-${defaults.careerObjectives}`}
            id="expectations"
            label="Objetivos de carrera"
            placeholder="Ej: Firmar en Primera División, disputar competencias internacionales"
            description="Se utilizará para personalizar la comunicación con agentes y reclutadores."
            readOnly={!isEditing}
            defaultValue={defaults.careerObjectives}
            errorMessage={errors.careerObjectives?.message}
            {...register("careerObjectives")}
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
