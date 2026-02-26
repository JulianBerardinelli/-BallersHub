"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Controller, useForm, type UseFormSetError } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { Autocomplete, AutocompleteItem } from "@heroui/react";

import type { DashboardHonour } from "@/lib/dashboard/client/publishing-state";
import { honourMutationSchema, type HonourMutationInput } from "../schemas";
import { deletePlayerHonour, upsertPlayerHonour } from "../actions";
import TeamCrest from "@/components/teams/TeamCrest";

type FormValues = {
  id?: string;
  title: string;
  competition: string;
  season: string;
  awardedOn: string;
  description: string;
  careerItemId: string;
};

type StatusState = { type: "success" | "error"; message: string } | null;

type CareerOption = { id: string; label: string; club: string | null; period: string; crestUrl: string | null };

type Props = {
  playerId: string;
  honours: DashboardHonour[];
  careerOptions: CareerOption[];
};

const defaultValues: FormValues = {
  id: undefined,
  title: "",
  competition: "",
  season: "",
  awardedOn: "",
  description: "",
  careerItemId: "",
};

const inputClassName =
  "w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-700 disabled:cursor-not-allowed disabled:opacity-60";

export default function HonoursManager({ playerId, honours, careerOptions }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusState>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const lastAutoSeasonRef = useRef<string | null>(null);
  const lastSelectedStageIdRef = useRef<string | null>(null);
  const skipStageAutofillRef = useRef(false);
  const [careerInputValue, setCareerInputValue] = useState("");

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues,
  });

  const optionMap = useMemo(() => new Map(careerOptions.map((option) => [option.id, option])), [careerOptions]);
  const watchCareerItemId = watch("careerItemId");
  const selectedStage = watchCareerItemId ? optionMap.get(watchCareerItemId) ?? null : null;

  useEffect(() => {
    if (selectedStage) {
      setCareerInputValue(selectedStage.label);
    } else if (!watchCareerItemId) {
      setCareerInputValue("");
    }
  }, [selectedStage, watchCareerItemId]);

  useEffect(() => {
    if (!watchCareerItemId) {
      lastAutoSeasonRef.current = null;
      lastSelectedStageIdRef.current = null;
      setCareerInputValue("");
      return;
    }
    const option = optionMap.get(watchCareerItemId);
    if (!option) return;
    if (skipStageAutofillRef.current) {
      skipStageAutofillRef.current = false;
      lastSelectedStageIdRef.current = option.id;
      return;
    }
    const stageChanged = lastSelectedStageIdRef.current !== option.id;
    const currentSeason = getValues("season");
    if (stageChanged || !currentSeason || currentSeason.trim().length === 0 || currentSeason === lastAutoSeasonRef.current) {
      setValue("season", option.period, { shouldDirty: true });
      lastAutoSeasonRef.current = option.period;
    }
    lastSelectedStageIdRef.current = option.id;
  }, [getValues, optionMap, setValue, watchCareerItemId]);

  const onSubmit = handleSubmit((values) => {
    const parsed = honourMutationSchema.safeParse({
      ...values,
      playerId,
    });

    if (!parsed.success) {
      reflectValidationErrors(parsed.error, setError, setStatus);
      return;
    }

    startTransition(async () => {
      const result = await upsertPlayerHonour(parsed.data);
      if (!result.success) {
        setStatus({ type: "error", message: result.message });
        return;
      }

      setStatus({ type: "success", message: values.id ? "Logro actualizado." : "Logro agregado." });
      router.refresh();
      setEditingId(null);
      reset(defaultValues);
      lastAutoSeasonRef.current = null;
      skipStageAutofillRef.current = false;
      setCareerInputValue("");
    });
  });

  const startEditing = (honour: DashboardHonour) => {
    setEditingId(honour.id);
    reset({
      id: honour.id,
      title: honour.title,
      competition: honour.competition ?? "",
      season: honour.season ?? "",
      awardedOn: honour.awardedOn ?? "",
      description: honour.description ?? "",
      careerItemId: honour.careerItemId ?? "",
    });
    setStatus(null);
    skipStageAutofillRef.current = true;
    lastSelectedStageIdRef.current = honour.careerItemId ?? null;
    lastAutoSeasonRef.current = honour.season ?? null;
    if (honour.careerItemId) {
      const option = optionMap.get(honour.careerItemId);
      if (option) {
        setCareerInputValue(option.label);
      }
    } else {
      setCareerInputValue("");
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    reset(defaultValues);
    setStatus(null);
    lastAutoSeasonRef.current = null;
    skipStageAutofillRef.current = false;
    lastSelectedStageIdRef.current = null;
    setCareerInputValue("");
  };

  const handleDelete = (honour: DashboardHonour) => {
    const confirmed = window.confirm(`¿Eliminar "${honour.title}"? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deletePlayerHonour({ id: honour.id, playerId });
      if (!result.success) {
        setStatus({ type: "error", message: result.message });
        return;
      }
      setStatus({ type: "success", message: "Logro eliminado." });
      router.refresh();
      if (editingId === honour.id) {
        cancelEditing();
      }
    });
  };

  return (
    <div className="space-y-6">
      {honours.length > 0 ? (
        <ul className="space-y-3">
          {honours.map((honour) => {
            const linkedStage = honour.careerItemId ? optionMap.get(honour.careerItemId) : null;
            return (
              <li
                key={honour.id}
                className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{honour.title}</p>
                    <p className="text-xs text-neutral-400">
                      {honour.competition ?? "Competencia pendiente"} · {honour.season ?? "Temporada sin definir"}
                    </p>
                    {linkedStage ? (
                      <p className="text-[11px] text-neutral-500">Vinculado a: {linkedStage.label}</p>
                    ) : null}
                    {honour.description ? <p className="text-xs text-neutral-400">{honour.description}</p> : null}
                  </div>
                <div className="flex flex-wrap gap-2 text-xs text-neutral-400">
                  <span className="rounded-full border border-neutral-800 px-3 py-1">
                    {formatHonourDate(honour.awardedOn)}
                  </span>
                  <button
                    type="button"
                    className="rounded-md border border-neutral-800 px-3 py-1 font-medium text-neutral-300 transition hover:border-neutral-700 hover:text-white"
                    onClick={() => startEditing(honour)}
                    disabled={pending}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-red-900/60 px-3 py-1 font-medium text-red-400 transition hover:border-red-700 hover:text-red-300"
                    onClick={() => handleDelete(honour)}
                    disabled={pending}
                  >
                    Eliminar
                  </button>
                </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-6 text-sm text-neutral-400">
          Aquí podrás cargar logros, premios y hitos relevantes para potenciar tu CV deportivo.
        </div>
      )}

      <form className="grid gap-4" onSubmit={onSubmit}>
        <label className="space-y-1.5 text-sm text-neutral-300">
          <span className="font-medium text-neutral-200">Título</span>
          <input
            {...register("title")}
            type="text"
            placeholder="Ej: Campeón Primera Nacional"
            className={inputClassName}
            disabled={pending}
          />
          {errors.title ? <FieldError message={errors.title.message} /> : null}
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm text-neutral-300">
            <span className="font-medium text-neutral-200">Competencia</span>
            <input
              {...register("competition")}
              type="text"
              placeholder="Liga o torneo"
              className={inputClassName}
              disabled={pending}
            />
            {errors.competition ? <FieldError message={errors.competition.message} /> : null}
          </label>
          <label className="space-y-1.5 text-sm text-neutral-300">
            <span className="font-medium text-neutral-200">Etapa de trayectoria</span>
            <Controller
              control={control}
              name="careerItemId"
              render={({ field }) => (
                <Autocomplete
                  aria-label="Etapa de trayectoria"
                  placeholder="Seleccioná una etapa"
                  selectedKey={field.value ? field.value : undefined}
                  inputValue={careerInputValue}
                  onInputChange={setCareerInputValue}
                  onSelectionChange={(key) => {
                    const value = key ? String(key) : "";
                    field.onChange(value);
                    const option = value ? optionMap.get(value) ?? null : null;
                    if (!value) {
                      lastSelectedStageIdRef.current = null;
                      lastAutoSeasonRef.current = null;
                    }
                    setCareerInputValue(option ? option.label : "");
                  }}
                  onBlur={field.onBlur}
                  isDisabled={pending}
                  allowsCustomValue={false}
                  variant="flat"
                  radius="sm"
                  className="w-full text-sm"
                  classNames={{
                    base: "w-full",
                  }}
                  inputProps={{
                    classNames: {
                      inputWrapper:
                        "rounded-md border border-neutral-800 bg-neutral-950 px-0 data-[hover=true]:border-neutral-700 transition focus-within:border-primary/40",
                      innerWrapper: "px-0",
                      input: "px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600",
                      helperWrapper: "hidden",
                    },
                  }}
                  startContent={
                    selectedStage ? (
                      <TeamCrest
                        src={selectedStage.crestUrl}
                        name={selectedStage.club ?? "Club"}
                        size={24}
                        className="rounded-sm bg-neutral-900/60"
                      />
                    ) : null
                  }
                  items={careerOptions}
                >
                  {(item: CareerOption) => (
                    <AutocompleteItem
                      key={item.id}
                      textValue={item.label}
                      startContent={
                        <TeamCrest
                          src={item.crestUrl}
                          name={item.club ?? "Club"}
                          size={24}
                          className="rounded-sm bg-neutral-900/60"
                        />
                      }
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">{item.club ?? "Club sin definir"}</span>
                        <span className="text-xs text-neutral-400">{item.period}</span>
                      </div>
                    </AutocompleteItem>
                  )}
                </Autocomplete>
              )}
            />
            {errors.careerItemId ? <FieldError message={errors.careerItemId.message} /> : null}
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm text-neutral-300">
            <span className="font-medium text-neutral-200">Temporada</span>
            <input
              {...register("season")}
              type="text"
              placeholder="Ej: 2023 / 2024"
              className={inputClassName}
              disabled={pending}
            />
            {errors.season ? <FieldError message={errors.season.message} /> : null}
          </label>
          <label className="space-y-1.5 text-sm text-neutral-300">
            <span className="font-medium text-neutral-200">Fecha</span>
            <input
              {...register("awardedOn")}
              type="date"
              className={inputClassName}
              disabled={pending}
            />
            {errors.awardedOn ? <FieldError message={errors.awardedOn.message} /> : null}
          </label>
        </div>
        <label className="space-y-1.5 text-sm text-neutral-300">
          <span className="font-medium text-neutral-200">Descripción</span>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="Detalles adicionales o méritos individuales"
            className={`${inputClassName} min-h-[96px] resize-y`}
            disabled={pending}
          />
          {errors.description ? <FieldError message={errors.description.message} /> : null}
        </label>

        {status ? <FormStatus status={status} /> : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex items-center rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
          >
            {pending ? "Guardando..." : editingId ? "Actualizar logro" : "Agregar logro"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={cancelEditing}
              className="inline-flex items-center rounded-md border border-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-300 transition hover:border-neutral-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pending}
            >
              Cancelar edición
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function reflectValidationErrors(
  error: z.ZodError<HonourMutationInput>,
  setError: UseFormSetError<FormValues>,
  setStatus: (status: StatusState) => void,
) {
  const fieldErrors = error.flatten().fieldErrors;
  (Object.entries(fieldErrors) as Array<[keyof HonourMutationInput, string[] | undefined]>).forEach(
    ([field, messages]) => {
      if (!messages || messages.length === 0) return;
      if (field === "playerId" || field === "id") return;
      setError(field as keyof FormValues, { type: "manual", message: messages[0] });
    },
  );
  setStatus({ type: "error", message: "Revisá los datos del formulario." });
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-400">{message}</p>;
}

function FormStatus({ status }: { status: StatusState }) {
  if (!status) return null;
  const baseClass = "rounded-md border px-3 py-2 text-xs font-medium";
  const variantClass =
    status.type === "success"
      ? "border-emerald-800 bg-emerald-900/20 text-emerald-300"
      : "border-red-900/60 bg-red-950/40 text-red-300";
  return <p className={`${baseClass} ${variantClass}`}>{status.message}</p>;
}

function formatHonourDate(date: string | null): string {
  if (!date) return "Fecha pendiente";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Fecha pendiente";
  return new Intl.DateTimeFormat("es-AR", { year: "numeric", month: "short" }).format(parsed);
}
