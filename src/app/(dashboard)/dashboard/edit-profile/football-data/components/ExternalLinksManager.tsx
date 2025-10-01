"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm, type UseFormSetError } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";

import type { DashboardExternalLink } from "@/lib/dashboard/client/publishing-state";
import { linkMutationSchema, LINK_KINDS, type LinkKind, type LinkMutationInput } from "../schemas";
import { deletePlayerLink, upsertPlayerLink } from "../actions";

type FormValues = {
  id?: string;
  kind: LinkKind;
  label: string;
  url: string;
  isPrimary: boolean;
};

type StatusState = { type: "success" | "error"; message: string } | null;

type Props = {
  playerId: string;
  links: DashboardExternalLink[];
  suggestions: Partial<Record<LinkKind, string | null>>;
};

const defaultValues: FormValues = {
  id: undefined,
  kind: "highlight",
  label: "",
  url: "",
  isPrimary: false,
};

const inputClassName =
  "w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-700 disabled:cursor-not-allowed disabled:opacity-60";

export default function ExternalLinksManager({ playerId, links, suggestions }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusState>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues,
  });

  const orderedLinks = useMemo(
    () =>
      [...links].sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return a.kind.localeCompare(b.kind);
      }),
    [links],
  );

  const availableSuggestions = useMemo(
    () =>
      Object.entries(suggestions)
        .filter(([, url]) => typeof url === "string" && url.length > 0)
        .map(([kind, url]) => ({ kind: kind as LinkKind, url: url as string })),
    [suggestions],
  );

  const onSubmit = handleSubmit((values) => {
    const parsed = linkMutationSchema.safeParse({
      ...values,
      playerId,
    });

    if (!parsed.success) {
      reflectValidationErrors(parsed.error, setError, setStatus);
      return;
    }

    startTransition(async () => {
      const result = await upsertPlayerLink(parsed.data);
      if (!result.success) {
        setStatus({ type: "error", message: result.message });
        return;
      }

      setStatus({ type: "success", message: values.id ? "Enlace actualizado." : "Enlace agregado." });
      router.refresh();
      setEditingId(null);
      reset({ ...defaultValues, kind: values.kind });
    });
  });

  const startEditing = (link: DashboardExternalLink) => {
    setEditingId(link.id);
    reset({
      id: link.id,
      kind: (LINK_KINDS.includes(link.kind as LinkKind) ? (link.kind as LinkKind) : "custom") ?? "custom",
      label: link.label ?? "",
      url: link.url,
      isPrimary: link.isPrimary,
    });
    setStatus(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    reset(defaultValues);
    setStatus(null);
  };

  const handleDelete = (link: DashboardExternalLink) => {
    const confirmed = window.confirm(
      `¿Eliminar el enlace "${link.label ?? link.url}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deletePlayerLink({ id: link.id, playerId });
      if (!result.success) {
        setStatus({ type: "error", message: result.message });
        return;
      }
      setStatus({ type: "success", message: "Enlace eliminado." });
      router.refresh();
      if (editingId === link.id) {
        cancelEditing();
      }
    });
  };

  const applySuggestion = (kind: LinkKind, url: string) => {
    setValue("kind", kind, { shouldDirty: true });
    setValue("url", url, { shouldDirty: true });
    setStatus({ type: "success", message: "Sugerencia aplicada. Revisá y guardá los cambios." });
  };

  return (
    <div className="space-y-6">
      {orderedLinks.length > 0 ? (
        <ul className="space-y-3">
          {orderedLinks.map((link) => (
            <li
              key={link.id}
              className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">{formatLinkKind(link.kind)}</p>
                  <p className="text-sm font-semibold text-white">{link.label ?? formatLinkKind(link.kind)}</p>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-xs text-primary underline"
                  >
                    {link.url}
                  </a>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-neutral-400">
                  {link.isPrimary ? (
                    <span className="inline-flex items-center rounded-full border border-primary/40 px-3 py-1 text-primary">
                      Principal
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-md border border-neutral-800 px-3 py-1 font-medium text-neutral-300 transition hover:border-neutral-700 hover:text-white"
                    onClick={() => startEditing(link)}
                    disabled={pending}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-red-900/60 px-3 py-1 font-medium text-red-400 transition hover:border-red-700 hover:text-red-300"
                    onClick={() => handleDelete(link)}
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
          Aún no cargaste enlaces externos. Podés agregar tus plataformas principales usando el formulario inferior.
        </div>
      )}

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm text-neutral-300">
            <span className="font-medium text-neutral-200">Tipo de enlace</span>
            <select
              {...register("kind")}
              className={`${inputClassName} capitalize`}
              disabled={pending}
            >
              {LINK_KINDS.map((kind) => (
                <option key={kind} value={kind} className="capitalize">
                  {formatLinkKind(kind)}
                </option>
              ))}
            </select>
            <HelperText>{getLinkKindDescription(watchKind(watch("kind")))}</HelperText>
            {errors.kind ? <FieldError message={errors.kind.message} /> : null}
          </label>
          <label className="space-y-1.5 text-sm text-neutral-300">
            <span className="font-medium text-neutral-200">Etiqueta</span>
            <input
              {...register("label")}
              type="text"
              placeholder="Ej: Perfil oficial"
              className={inputClassName}
              disabled={pending}
            />
            <HelperText>Opcional. Se usará como título visible del enlace.</HelperText>
            {errors.label ? <FieldError message={errors.label.message} /> : null}
          </label>
        </div>
        <label className="space-y-1.5 text-sm text-neutral-300">
          <span className="font-medium text-neutral-200">URL</span>
          <input
            {...register("url")}
            type="url"
            placeholder="https://"
            className={inputClassName}
            disabled={pending}
          />
          {errors.url ? <FieldError message={errors.url.message} /> : null}
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input
            {...register("isPrimary")}
            type="checkbox"
            className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-primary focus:ring-primary"
            disabled={pending}
          />
          <span>Mostrar como enlace principal en tu perfil público.</span>
        </label>

        {status ? <FormStatus status={status} /> : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex items-center rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
          >
            {pending ? "Guardando..." : editingId ? "Actualizar enlace" : "Agregar enlace"}
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

      {availableSuggestions.length > 0 ? (
        <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 text-sm text-neutral-300">
          <p className="mb-2 font-medium text-neutral-200">Sugerencias detectadas</p>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.map((suggestion) => (
              <button
                key={`${suggestion.kind}-${suggestion.url}`}
                type="button"
                className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-200 transition hover:border-primary/50 hover:text-primary"
                onClick={() => applySuggestion(suggestion.kind, suggestion.url)}
                disabled={pending}
              >
                {formatLinkKind(suggestion.kind)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function reflectValidationErrors(
  error: z.ZodError<LinkMutationInput>,
  setError: UseFormSetError<FormValues>,
  setStatus: (status: StatusState) => void,
) {
  const fieldErrors = error.flatten().fieldErrors;
  (Object.entries(fieldErrors) as Array<[keyof LinkMutationInput, string[] | undefined]>).forEach(
    ([field, messages]) => {
      if (!messages || messages.length === 0) return;
      if (field === "playerId" || field === "metadata" || field === "id" || field === "isPrimary") return;
      setError(field as keyof FormValues, { type: "manual", message: messages[0] });
    },
  );
  setStatus({ type: "error", message: "Revisá los datos del formulario." });
}

function formatLinkKind(kind: string): string {
  const labels: Record<string, string> = {
    highlight: "Video destacado",
    transfermarkt: "Transfermarkt",
    besoccer: "BeSoccer",
    youtube: "YouTube",
    instagram: "Instagram",
    linkedin: "LinkedIn",
    custom: "Personalizado",
  };
  return labels[kind] ?? kind;
}

function getLinkKindDescription(kind: string | undefined): string {
  const descriptions: Record<string, string> = {
    highlight: "Link utilizado como carta de presentación principal.",
    transfermarkt: "Referencia oficial para valor de mercado y trayectoria.",
    besoccer: "Sincronización con estadísticas verificadas de BeSoccer.",
    youtube: "Canal o playlist con tus mejores jugadas.",
    instagram: "Perfil social para mostrar actualidad y backstage.",
    linkedin: "Perfil profesional orientado a clubes y agentes.",
    custom: "Enlaces adicionales que quieras destacar.",
  };
  return descriptions[kind ?? ""] ?? "";
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-400">{message}</p>;
}

function FormStatus({ status }: { status: StatusState }) {
  if (!status) return null;
  const baseClass =
    "rounded-md border px-3 py-2 text-xs font-medium";
  const variantClass =
    status.type === "success"
      ? "border-emerald-800 bg-emerald-900/20 text-emerald-300"
      : "border-red-900/60 bg-red-950/40 text-red-300";
  return <p className={`${baseClass} ${variantClass}`}>{status.message}</p>;
}

function HelperText({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="text-xs text-neutral-500">{children}</p>;
}

function watchKind(current: unknown): LinkKind {
  return LINK_KINDS.includes(current as LinkKind) ? (current as LinkKind) : "custom";
}
