"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm, type UseFormSetError } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";

import type { DashboardExternalLink } from "@/lib/dashboard/client/publishing-state";
import { linkMutationSchema, LINK_KINDS, type LinkKind, type LinkMutationInput } from "../schemas";
import { deletePlayerLink, upsertPlayerLink } from "../actions";
import TransfermarktIcon from "@/components/icons/TransfermarktIcon";
import BeSoccerIcon from "@/components/icons/BeSoccerIcon";
import FlashscoreIcon from "@/components/icons/FlashscoreIcon";
import { YouTube } from "@/components/icons/YoutubeIcon";
import { Instagram } from "@/components/icons/InstagramIcon";
import { LinkedIn } from "@/components/icons/LinkedInIcon";

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
  "w-full rounded-md border border-white/[0.08] bg-bh-black px-3 py-2 text-sm text-bh-fg-1 placeholder:text-bh-fg-4 focus:outline-none focus:ring-1 focus:ring-bh-lime/30 disabled:cursor-not-allowed disabled:opacity-60";

/** Returns an icon node for a given link kind, sized via className */
function LinkKindIcon({ kind, className }: { kind: string; className?: string }) {
  const cls = className ?? "h-4 w-4";
  switch (kind) {
    case "transfermarkt":
      return <TransfermarktIcon className={cls} />;
    case "besoccer":
      return <BeSoccerIcon className={cls} />;
    case "flashscore":
      return <FlashscoreIcon className={cls} />;
    case "youtube":
      return <YouTube className={cls} />;
    case "instagram":
      return <Instagram className={cls} />;
    case "linkedin":
      return <LinkedIn className={cls} />;
    case "highlight":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polygon points="5 3 19 12 5 21 5 3" />
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

  /** The set of kinds that already have at least one saved link */
  const addedKinds = useMemo(() => new Set(links.map((l) => l.kind)), [links]);

  /**
   * Suggestions: only show entries that have a URL AND whose kind is not yet
   * represented in the player's existing links.
   */
  const availableSuggestions = useMemo(
    () =>
      Object.entries(suggestions)
        .filter(([kind, url]) => typeof url === "string" && url.length > 0 && !addedKinds.has(kind))
        .map(([kind, url]) => ({ kind: kind as LinkKind, url: url as string })),
    [suggestions, addedKinds],
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
              className="rounded-lg border border-white/[0.08] bg-bh-surface-1/40 p-4 text-sm text-bh-fg-2"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-bh-surface-1">
                    <LinkKindIcon kind={link.kind} className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wide text-bh-fg-4">{formatLinkKind(link.kind)}</p>
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
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-bh-fg-3">
                  {link.isPrimary ? (
                    <span className="inline-flex items-center rounded-full border border-primary/40 px-3 py-1 text-primary">
                      Principal
                    </span>
                  ) : null}
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
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-white/[0.08] bg-bh-surface-1/40 p-6 text-sm text-bh-fg-3">
          Aún no cargaste enlaces externos. Podés agregar tus plataformas principales usando el formulario inferior.
        </div>
      )}

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm text-bh-fg-2">
            <span className="font-medium text-bh-fg-1">Tipo de enlace</span>
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
          <label className="space-y-1.5 text-sm text-bh-fg-2">
            <span className="font-medium text-bh-fg-1">Etiqueta</span>
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
        <label className="space-y-1.5 text-sm text-bh-fg-2">
          <span className="font-medium text-bh-fg-1">URL</span>
          <input
            {...register("url")}
            type="url"
            placeholder="https://"
            className={inputClassName}
            disabled={pending}
          />
          {errors.url ? <FieldError message={errors.url.message} /> : null}
        </label>
        <label className="flex items-center gap-2 text-sm text-bh-fg-2">
          <input
            {...register("isPrimary")}
            type="checkbox"
            className="h-4 w-4 rounded border-white/[0.12] bg-bh-black text-primary focus:ring-primary"
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
              className="inline-flex items-center rounded-md border border-white/[0.08] px-4 py-2 text-sm font-semibold text-bh-fg-2 transition hover:border-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pending}
            >
              Cancelar edición
            </button>
          ) : null}
        </div>
      </form>

      {availableSuggestions.length > 0 ? (
        <div className="rounded-lg border border-white/[0.08] bg-bh-surface-1/40 p-4 text-sm text-bh-fg-2">
          <p className="mb-3 font-medium text-bh-fg-1">Sugerencias detectadas</p>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.map((suggestion) => {
              const isPrimaryLink = links.some(
                (l) => l.kind === suggestion.kind && l.isPrimary,
              );
              return (
                <button
                  key={`${suggestion.kind}-${suggestion.url}`}
                  type="button"
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition",
                    isPrimaryLink
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-white/[0.12] text-bh-fg-1 hover:border-primary/50 hover:text-primary",
                  ].join(" ")}
                  onClick={() => applySuggestion(suggestion.kind, suggestion.url)}
                  disabled={pending}
                >
                  <LinkKindIcon kind={suggestion.kind} className="h-3.5 w-3.5" />
                  {formatLinkKind(suggestion.kind)}
                  {isPrimaryLink ? (
                    <span className="ml-0.5 text-[10px] opacity-70">· Destacado</span>
                  ) : null}
                </button>
              );
            })}
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
    flashscore: "Flashscore",
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
    flashscore: "Perfil y resultados en tiempo real desde Flashscore.",
    youtube: "Canal o playlist con tus mejores jugadas.",
    instagram: "Perfil social para mostrar actualidad y backstage.",
    linkedin: "Perfil profesional orientado a clubes y agentes.",
    custom: "Enlaces adicionales que quieras destacar.",
  };
  return descriptions[kind ?? ""] ?? "";
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-bh-danger">{message}</p>;
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
  return <p className="text-xs text-bh-fg-4">{children}</p>;
}

function watchKind(current: unknown): LinkKind {
  return LINK_KINDS.includes(current as LinkKind) ? (current as LinkKind) : "custom";
}
