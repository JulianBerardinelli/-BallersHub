"use client";

// Manager de enlaces del coach (dashboard + admin via liveMode + injected actions).
// Espeja el patrón del ExternalLinksManager de players, pero acotado: sin caps
// de plan (los links del coach no están gateados por plan, todos los planes
// muestran los suyos), sin sugerencias preconfiguradas.

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";

import TransfermarktIcon from "@/components/icons/TransfermarktIcon";
import { YouTube } from "@/components/icons/YoutubeIcon";
import { Instagram } from "@/components/icons/InstagramIcon";
import { LinkedIn } from "@/components/icons/LinkedInIcon";
import {
  COACH_LINK_KINDS,
  COACH_LINK_LABELS_ES,
  COACH_LINK_DESCRIPTIONS_ES,
  coachLinkMutationSchema,
  type CoachLinkKind,
  type CoachLinkMutationInput,
} from "@/lib/coach/links";
import {
  upsertCoachLink as defaultUpsert,
  deleteCoachLink as defaultDelete,
  type CoachLinkActionResult,
} from "@/app/actions/coach-links";

export type CoachLinkRow = {
  id: string;
  label: string | null;
  url: string;
  kind: string;
  isPrimary: boolean;
};

type Props = {
  links: CoachLinkRow[];
  /** Override the write actions (admin CRUD injects service-role variants). */
  upsertAction?: (input: CoachLinkMutationInput) => Promise<CoachLinkActionResult>;
  deleteAction?: (input: { id: string }) => Promise<CoachLinkActionResult>;
  /** Cosmetic — copy hint to clarify when the page lives in admin (writes go live). */
  liveMode?: boolean;
};

type FormValues = {
  id?: string;
  kind: CoachLinkKind;
  label: string;
  url: string;
};

type StatusState = { type: "success" | "error"; message: string } | null;

const inputClass =
  "w-full rounded-md border border-white/[0.08] bg-bh-black px-3 py-2 text-sm text-bh-fg-1 placeholder:text-bh-fg-4 focus:outline-none focus:ring-1 focus:ring-bh-lime/30 disabled:cursor-not-allowed disabled:opacity-60";

const defaultValues: FormValues = {
  id: undefined,
  kind: "custom",
  label: "",
  url: "",
};

function LinkIcon({ kind, className }: { kind: string; className?: string }) {
  const cls = className ?? "h-4 w-4";
  switch (kind) {
    case "transfermarkt":
      return <TransfermarktIcon className={cls} />;
    case "instagram":
      return <Instagram className={cls} />;
    case "youtube":
      return <YouTube className={cls} />;
    case "linkedin":
      return <LinkedIn className={cls} />;
    case "twitter":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
        </svg>
      );
    default:
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
  }
}

export default function CoachLinksManager({
  links,
  upsertAction = defaultUpsert,
  deleteAction = defaultDelete,
  liveMode = false,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = React.useState<StatusState>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues });

  const watchedKind = watch("kind");

  const ordered = React.useMemo(
    () =>
      [...links].sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return a.kind.localeCompare(b.kind);
      }),
    [links],
  );

  const onSubmit = handleSubmit((values) => {
    const parsed = coachLinkMutationSchema.safeParse({
      id: values.id,
      kind: values.kind,
      label: values.label,
      url: values.url,
      isPrimary: false,
    });
    if (!parsed.success) {
      setStatus({ type: "error", message: parsed.error.issues[0]?.message ?? "Revisá los datos del enlace." });
      return;
    }
    startTransition(async () => {
      const result = await upsertAction(parsed.data);
      if (!result.success) {
        setStatus({ type: "error", message: result.message ?? "No fue posible guardar el enlace." });
        return;
      }
      setStatus({
        type: "success",
        message: values.id ? "Enlace actualizado." : "Enlace agregado.",
      });
      setEditingId(null);
      reset({ ...defaultValues, kind: values.kind });
      router.refresh();
    });
  });

  const startEditing = (link: CoachLinkRow) => {
    setEditingId(link.id);
    reset({
      id: link.id,
      kind: (COACH_LINK_KINDS as readonly string[]).includes(link.kind)
        ? (link.kind as CoachLinkKind)
        : "custom",
      label: link.label ?? "",
      url: link.url,
    });
    setStatus(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    reset(defaultValues);
    setStatus(null);
  };

  const handleDelete = (link: CoachLinkRow) => {
    const label = link.label?.trim() || COACH_LINK_LABELS_ES[(link.kind as CoachLinkKind)] || link.url;
    const confirmed = window.confirm(`¿Eliminar el enlace "${label}"?`);
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deleteAction({ id: link.id });
      if (!result.success) {
        setStatus({ type: "error", message: result.message ?? "No fue posible eliminar el enlace." });
        return;
      }
      setStatus({ type: "success", message: "Enlace eliminado." });
      router.refresh();
      if (editingId === link.id) cancelEditing();
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-bh-display text-xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          Enlaces externos
        </h2>
        <p className="text-sm text-bh-fg-3">
          {liveMode
            ? "Cambios visibles al instante en la página pública del entrenador."
            : "Perfiles externos que aparecen en tu página pública (sección §04)."}
        </p>
      </div>

      {ordered.length > 0 ? (
        <ul className="space-y-3">
          {ordered.map((link) => {
            const label = link.label?.trim() || COACH_LINK_LABELS_ES[link.kind as CoachLinkKind] || "Sitio";
            return (
              <li
                key={link.id}
                className="rounded-bh-md border border-white/[0.08] bg-bh-surface-1/40 p-4 text-sm text-bh-fg-2"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-bh-surface-1">
                      <LinkIcon kind={link.kind} className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-bh-fg-4">
                        {COACH_LINK_LABELS_ES[link.kind as CoachLinkKind] ?? link.kind}
                      </p>
                      <p className="text-sm font-semibold text-white">{label}</p>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-xs text-primary underline"
                      >
                        {link.url}
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-bh-fg-3">
                    <button
                      type="button"
                      className="rounded-md border border-white/[0.08] px-3 py-1 font-medium text-bh-fg-2 transition hover:border-white/[0.12] hover:text-white"
                      onClick={() => startEditing(link)}
                      disabled={pending}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-red-900/60 px-3 py-1 font-medium text-bh-danger transition hover:border-red-700 hover:text-red-300"
                      onClick={() => handleDelete(link)}
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
        <div className="rounded-bh-md border border-dashed border-white/[0.08] bg-bh-surface-1/40 p-6 text-sm text-bh-fg-3">
          Todavía no agregaste enlaces externos.
        </div>
      )}

      <form className="space-y-4 rounded-bh-md border border-white/[0.08] bg-bh-surface-1/40 p-5" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm text-bh-fg-2">
            <span className="font-medium text-bh-fg-1">Tipo de enlace</span>
            <select
              {...register("kind")}
              className={`${inputClass}`}
              disabled={pending}
            >
              {COACH_LINK_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {COACH_LINK_LABELS_ES[kind]}
                </option>
              ))}
            </select>
            <p className="text-xs text-bh-fg-4">{COACH_LINK_DESCRIPTIONS_ES[watchedKind]}</p>
            {errors.kind ? <p className="text-xs text-bh-danger">{errors.kind.message}</p> : null}
          </label>
          <label className="space-y-1.5 text-sm text-bh-fg-2">
            <span className="font-medium text-bh-fg-1">Etiqueta (opcional)</span>
            <input
              {...register("label")}
              type="text"
              placeholder='Ej "Canal de análisis"'
              className={inputClass}
              disabled={pending}
            />
            <p className="text-xs text-bh-fg-4">Si lo dejás vacío, se usa el nombre del servicio.</p>
          </label>
        </div>
        <label className="block space-y-1.5 text-sm text-bh-fg-2">
          <span className="font-medium text-bh-fg-1">URL</span>
          <input
            {...register("url")}
            type="url"
            placeholder="https://"
            className={inputClass}
            disabled={pending}
          />
          {errors.url ? <p className="text-xs text-bh-danger">{errors.url.message}</p> : null}
        </label>

        {status ? (
          <p
            className={[
              "rounded-md border px-3 py-2 text-xs font-medium",
              status.type === "success"
                ? "border-emerald-800 bg-emerald-900/20 text-emerald-300"
                : "border-red-900/60 bg-red-950/40 text-red-300",
            ].join(" ")}
          >
            {status.message}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex items-center rounded-md border border-bh-lime/40 bg-bh-lime/10 px-4 py-2 text-sm font-semibold text-bh-lime transition hover:bg-bh-lime/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
          >
            {pending ? "Guardando…" : editingId ? "Actualizar enlace" : "Agregar enlace"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={cancelEditing}
              className="inline-flex items-center rounded-md border border-white/[0.08] px-4 py-2 text-sm font-semibold text-bh-fg-2 transition hover:border-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
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
