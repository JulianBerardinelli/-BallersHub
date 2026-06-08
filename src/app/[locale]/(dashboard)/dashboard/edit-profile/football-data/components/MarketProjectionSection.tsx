"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { bhButtonClass } from "@/components/ui/BhButton";
import { useForm } from "react-hook-form";
import { Lock, Pencil, X } from "lucide-react";

import FormField from "@/components/dashboard/client/FormField";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { profileNotification, useNotificationContext } from "@/modules/notifications";
import { usePlanAccess } from "@/components/dashboard/plan/PlanAccessProvider";
import UpgradeModal, { useUpgradeModal } from "@/components/dashboard/plan/UpgradeModal";

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
  const { enqueue } = useNotificationContext();
  const { access } = usePlanAccess();
  const upgradeModal = useUpgradeModal();

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
    if (!access.isPro) {
      // Soft-save gate: free users see the form but can't persist. Open
      // the upgrade modal instead of hitting the server.
      upgradeModal.open("marketValue");
      return;
    }

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

      if (result.updatedFields.length > 0) {
        enqueue(
          profileNotification.updated({
            sectionLabel: "tu valor de mercado y proyección",
            changedFields: result.updatedFields,
            detailsHref: "/dashboard/edit-profile/football-data",
          }),
        );
      }
    });
  });

  return (
    <SectionCard
      title={
        <span className="inline-flex items-center gap-2">
          Valor de mercado y proyección
          {!access.isPro && (
            <span className="inline-flex items-center gap-1 rounded-full border border-bh-lime/40 bg-bh-lime/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-bh-lime">
              <Lock size={9} /> Pro
            </span>
          )}
        </span>
      }
      description={
        access.isPro
          ? "Consolidá métricas económicas para potenciar negociaciones con clubes y agentes."
          : "Cargá tu valor de mercado y objetivos de carrera. Para guardarlos necesitás Pro."
      }
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
          <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:justify-end">
            <Button variant="light" onPress={handleCancel} isDisabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" isDisabled={isPending || !isDirty} isLoading={isPending} className={bhButtonClass({ variant: "lime", size: "sm" })}>
              Guardar cambios
            </Button>
          </div>
        ) : null}
      </form>

      <UpgradeModal state={upgradeModal.state} onClose={upgradeModal.close} />
    </SectionCard>
  );
}
