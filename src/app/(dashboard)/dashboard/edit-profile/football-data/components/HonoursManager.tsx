"use client";

import { useState, useTransition } from "react";
import { useForm, type UseFormSetError } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";

import type { DashboardHonour } from "@/lib/dashboard/client/publishing-state";
import { honourMutationSchema, type HonourMutationInput } from "../schemas";
import { deletePlayerHonour, upsertPlayerHonour } from "../actions";

type FormValues = {
  id?: string;
  title: string;
  competition: string;
  season: string;
  awardedOn: string;
  description: string;
};

type StatusState = { type: "success" | "error"; message: string } | null;

type Props = {
  playerId: string;
  honours: DashboardHonour[];
};

const defaultValues: FormValues = {
  id: undefined,
  title: "",
  competition: "",
  season: "",
  awardedOn: "",
  description: "",
};

const inputClassName =
  "w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-700 disabled:cursor-not-allowed disabled:opacity-60";

export default function HonoursManager({ playerId, honours }: Props) {
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
    });
    setStatus(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    reset(defaultValues);
    setStatus(null);
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
          {honours.map((honour) => (
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
          ))}
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
            <span className="font-medium text-neutral-200">Temporada</span>
            <input
              {...register("season")}
              type="text"
              placeholder="Ej: 2023"
              className={inputClassName}
              disabled={pending}
            />
            {errors.season ? <FieldError message={errors.season.message} /> : null}
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
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
        </div>

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
