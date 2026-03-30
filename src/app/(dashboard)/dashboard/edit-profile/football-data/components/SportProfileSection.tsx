"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Chip, Select, SelectItem } from "@heroui/react";
import { useForm, Controller } from "react-hook-form";
import { Pencil, X } from "lucide-react";

import FormField from "@/components/dashboard/client/FormField";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { profileNotification, useNotificationContext } from "@/modules/notifications";

import { updateSportProfile } from "../actions";

type SportProfileFormValues = {
  positions: string;
  foot: string;
  currentClub: string;
  contractStatus: string;
  agencyId: string;
};

type StatusState = { type: "success" | "error"; message: string } | null;

type AgencyOption = { id: string; name: string; logoUrl: string | null };

type Props = {
  playerId: string;
  initialValues: SportProfileFormValues;
  agencies: AgencyOption[];
};

export default function SportProfileSection({ playerId, initialValues, agencies }: Props) {
  const [defaults, setDefaults] = useState<SportProfileFormValues>(initialValues);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);
  const [isPending, startTransition] = useTransition();
  const { enqueue } = useNotificationContext();

  const {
    register,
    handleSubmit,
    reset,
    control,
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
        agencyId: values.agencyId,
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

      const nextDefaults = {
        ...result.data,
        agencyId: result.data.agencyId ?? "",
      };

      setDefaults(nextDefaults);
      reset(nextDefaults);
      setIsEditing(false);
      setStatus({
        type: "success",
        message: result.message ?? "Perfil deportivo actualizado correctamente.",
      });

      if (result.updatedFields.length > 0) {
        enqueue(
          profileNotification.updated({
            sectionLabel: "tu perfil deportivo",
            changedFields: result.updatedFields,
            detailsHref: "/dashboard/edit-profile/football-data",
          }),
        );
      }
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
            readOnly={!isEditing}
            defaultValue={defaults.contractStatus}
            errorMessage={errors.contractStatus?.message}
            {...register("contractStatus")}
          />
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Controller
              name="agencyId"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Agencia / Representante"
                  placeholder="Buscá o seleccioná una agencia"
                  isDisabled={!isEditing}
                  labelPlacement="outside"
                  classNames={{
                    label: "text-xs font-semibold uppercase tracking-wider text-neutral-500",
                    trigger: "bg-neutral-900/50 border border-neutral-800",
                  }}
                  defaultSelectedKeys={field.value ? [field.value] : [""]}
                  selectedKeys={field.value ? [field.value] : [""]}
                  onChange={(e) => field.onChange(e.target.value)}
                >
                  {[
                    <SelectItem key="" textValue="Sin representación (Libre)">
                      Sin representación (Libre)
                    </SelectItem>,
                    ...agencies.map((agency) => (
                      <SelectItem key={agency.id} textValue={agency.name}>
                        {agency.name}
                      </SelectItem>
                    )),
                  ]}
                </Select>
              )}
            />
          </div>
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
