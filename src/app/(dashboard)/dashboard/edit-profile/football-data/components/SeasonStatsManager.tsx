"use client";

import { useState, useTransition } from "react";
import { useForm, type UseFormSetError } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";

import type { DashboardSeasonStat } from "@/lib/dashboard/client/publishing-state";
import { seasonStatMutationSchema, type SeasonStatMutationInput } from "../schemas";
import { deleteSeasonStat, upsertSeasonStat } from "../actions";

type FormValues = {
  id?: string;
  season: string;
  competition: string;
  team: string;
  matches: string;
  minutes: string;
  goals: string;
  assists: string;
  yellowCards: string;
  redCards: string;
};

type StatusState = { type: "success" | "error"; message: string } | null;

type Props = {
  playerId: string;
  stats: DashboardSeasonStat[];
};

const defaultValues: FormValues = {
  id: undefined,
  season: "",
  competition: "",
  team: "",
  matches: "",
  minutes: "",
  goals: "",
  assists: "",
  yellowCards: "",
  redCards: "",
};

const inputClassName =
  "w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-700 disabled:cursor-not-allowed disabled:opacity-60";

export default function SeasonStatsManager({ playerId, stats }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusState>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues,
  });

  const onSubmit = handleSubmit((values) => {
    const parsed = seasonStatMutationSchema.safeParse({
      ...values,
      playerId,
    });

    if (!parsed.success) {
      reflectValidationErrors(parsed.error, setError, setStatus);
      return;
    }

    startTransition(async () => {
      const result = await upsertSeasonStat(parsed.data);
      if (!result.success) {
        setStatus({ type: "error", message: result.message });
        return;
      }

      setStatus({ type: "success", message: values.id ? "Estadística actualizada." : "Estadística agregada." });
      router.refresh();
      setEditingId(null);
      reset(defaultValues);
    });
  });

  const startEditing = (stat: DashboardSeasonStat) => {
    setEditingId(stat.id);
    reset({
      id: stat.id,
      season: stat.season,
      competition: stat.competition ?? "",
      team: stat.team ?? "",
      matches: stat.matches?.toString() ?? "",
      minutes: stat.minutes?.toString() ?? "",
      goals: stat.goals?.toString() ?? "",
      assists: stat.assists?.toString() ?? "",
      yellowCards: stat.yellowCards?.toString() ?? "",
      redCards: stat.redCards?.toString() ?? "",
    });
    setStatus(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    reset(defaultValues);
    setStatus(null);
  };

  const handleDelete = (stat: DashboardSeasonStat) => {
    const confirmed = window.confirm(`¿Eliminar la temporada ${stat.season}? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteSeasonStat({ id: stat.id, playerId });
      if (!result.success) {
        setStatus({ type: "error", message: result.message });
        return;
      }
      setStatus({ type: "success", message: "Estadística eliminada." });
      router.refresh();
      if (editingId === stat.id) {
        cancelEditing();
      }
    });
  };

  return (
    <div className="space-y-6">
      {stats.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-800 text-sm text-neutral-300">
            <thead className="bg-neutral-950/60 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Temporada
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Competencia
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Equipo
                </th>
                <th scope="col" className="px-4 py-3 text-center font-medium">
                  PJ
                </th>
                <th scope="col" className="px-4 py-3 text-center font-medium">
                  Goles
                </th>
                <th scope="col" className="px-4 py-3 text-center font-medium">
                  Asist.
                </th>
                <th scope="col" className="px-4 py-3 text-center font-medium">
                  Minutos
                </th>
                <th scope="col" className="px-4 py-3 text-center font-medium">
                  TA
                </th>
                <th scope="col" className="px-4 py-3 text-center font-medium">
                  TR
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {stats.map((stat) => (
                <tr key={stat.id} className="bg-neutral-950/40">
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-white">{stat.season}</td>
                  <td className="whitespace-nowrap px-4 py-3">{stat.competition ?? "Competencia pendiente"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{stat.team ?? "Equipo sin definir"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">{formatNumericStat(stat.matches)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">{formatNumericStat(stat.goals)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">{formatNumericStat(stat.assists)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">{formatNumericStat(stat.minutes)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">{formatNumericStat(stat.yellowCards)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">{formatNumericStat(stat.redCards)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        type="button"
                        className="rounded-md border border-neutral-800 px-3 py-1 font-medium text-neutral-300 transition hover:border-neutral-700 hover:text-white"
                        onClick={() => startEditing(stat)}
                        disabled={pending}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-red-900/60 px-3 py-1 font-medium text-red-400 transition hover:border-red-700 hover:text-red-300"
                        onClick={() => handleDelete(stat)}
                        disabled={pending}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-6 text-sm text-neutral-400">
          Cargá tus estadísticas oficiales para potenciar el análisis deportivo. Podrás sincronizarlas con integraciones y reportes externos.
        </div>
      )}

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm text-neutral-300">
            <span className="font-medium text-neutral-200">Temporada</span>
            <input
              {...register("season")}
              type="text"
              placeholder="Ej: 2024/25"
              className={inputClassName}
              disabled={pending}
            />
            {errors.season ? <FieldError message={errors.season.message} /> : null}
          </label>
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
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm text-neutral-300">
            <span className="font-medium text-neutral-200">Equipo</span>
            <input
              {...register("team")}
              type="text"
              placeholder="Club"
              className={inputClassName}
              disabled={pending}
            />
            {errors.team ? <FieldError message={errors.team.message} /> : null}
          </label>
          <div className="grid grid-cols-3 gap-4">
            {([
              { name: "matches", label: "PJ" },
              { name: "goals", label: "Goles" },
              { name: "assists", label: "Asist." },
            ] as const).map((field) => (
              <label key={field.name} className="space-y-1.5 text-xs text-neutral-300">
                <span className="font-medium text-neutral-200">{field.label}</span>
                <input
                  {...register(field.name)}
                  type="number"
                  min={0}
                  className={inputClassName}
                  disabled={pending}
                />
                {errors[field.name] ? <FieldError message={errors[field.name]?.message} /> : null}
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1.5 text-xs text-neutral-300">
            <span className="font-medium text-neutral-200">Minutos</span>
            <input
              {...register("minutes")}
              type="number"
              min={0}
              className={inputClassName}
              disabled={pending}
            />
            {errors.minutes ? <FieldError message={errors.minutes.message} /> : null}
          </label>
          <label className="space-y-1.5 text-xs text-neutral-300">
            <span className="font-medium text-neutral-200">Tarjetas amarillas</span>
            <input
              {...register("yellowCards")}
              type="number"
              min={0}
              className={inputClassName}
              disabled={pending}
            />
            {errors.yellowCards ? <FieldError message={errors.yellowCards.message} /> : null}
          </label>
          <label className="space-y-1.5 text-xs text-neutral-300">
            <span className="font-medium text-neutral-200">Tarjetas rojas</span>
            <input
              {...register("redCards")}
              type="number"
              min={0}
              className={inputClassName}
              disabled={pending}
            />
            {errors.redCards ? <FieldError message={errors.redCards.message} /> : null}
          </label>
        </div>

        {status ? <FormStatus status={status} /> : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex items-center rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
          >
            {pending ? "Guardando..." : editingId ? "Actualizar temporada" : "Agregar temporada"}
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
  error: z.ZodError<SeasonStatMutationInput>,
  setError: UseFormSetError<FormValues>,
  setStatus: (status: StatusState) => void,
) {
  const fieldErrors = error.flatten().fieldErrors;
  (Object.entries(fieldErrors) as Array<[keyof SeasonStatMutationInput, string[] | undefined]>).forEach(
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

function formatNumericStat(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "–";
  return new Intl.NumberFormat("es-AR").format(value);
}
