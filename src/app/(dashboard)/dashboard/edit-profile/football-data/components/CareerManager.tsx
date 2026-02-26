"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

import CareerEditor, { type CareerItemInput } from "@/components/career/CareerEditor";
import CountryFlag from "@/components/common/CountryFlag";
import type { CareerStageInput } from "../schemas";
import { submitCareerRevision } from "../actions";

const RESOLUTION_TONE_STYLES = {
  success: {
    container: "border-emerald-500/40 bg-emerald-500/10",
    label: "text-emerald-200",
    note: "text-emerald-100/90",
    icon: "text-emerald-300",
  },
  danger: {
    container: "border-red-500/40 bg-red-500/10",
    label: "text-red-200",
    note: "text-red-100/90",
    icon: "text-red-300",
  },
  default: {
    container: "border-neutral-700 bg-neutral-900/60",
    label: "text-neutral-200",
    note: "text-neutral-300",
    icon: "text-neutral-300",
  },
} as const;

type ResolutionTone = keyof typeof RESOLUTION_TONE_STYLES;

import { reviewNotification, useNotificationContext } from "@/modules/notifications";
import { ensureEventRecorded } from "@/modules/notifications/utils/eventStore";

export type CareerStage = {
  id: string;
  club: string | null;
  division: string | null;
  startYear: number | null;
  endYear: number | null;
  team: {
    id: string | null;
    name: string | null;
    crestUrl: string | null;
    countryCode: string | null;
  } | null;
};

export type CareerRequestStage = CareerStage & {
  proposedTeam: {
    name: string | null;
    countryCode: string | null;
    countryName: string | null;
  } | null;
};

export type CareerRequestSnapshot = {
  id: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  submittedAt: string | null;
  reviewedAt: string | null;
  note: string | null;
  resolutionNote: string | null;
  items: CareerRequestStage[];
};

type StatusState = { type: "success" | "error"; message: string } | null;

type ResolutionDescriptor = {
  label: string;
  note: string;
  tone: ResolutionTone;
};


type Props = {
  playerId: string;
  playerName?: string | null;
  stages: CareerStage[];
  latestRequest: CareerRequestSnapshot | null;
};

type AugmentedCareerItem = CareerItemInput & { originalId?: string | null };

const DEFAULT_STATUS: StatusState = null;

function toEditorItem(stage: CareerStage): AugmentedCareerItem {
  const isCurrent = stage.endYear === null;
  return {
    id: stage.id,
    originalId: stage.id,
    club: stage.team?.name ?? stage.club ?? "",
    division: stage.division ?? null,
    start_year: stage.startYear ?? null,
    end_year: stage.endYear ?? null,
    team_id: stage.team?.id ?? null,
    team_meta: stage.team
      ? { slug: null, country_code: stage.team.countryCode ?? null, crest_url: stage.team.crestUrl ?? null }
      : null,
    proposed: null,
    confirmed: true,
    lockEnd: isCurrent,
    source: isCurrent ? "current" : "manual",
  };
}

function mapToPayload(item: AugmentedCareerItem): CareerStageInput {
  return {
    id: item.id,
    originalId: item.originalId ?? null,
    club: item.club,
    division: item.division ?? null,
    startYear: item.start_year ?? null,
    endYear: item.end_year ?? null,
    teamId: item.team_id ?? null,
    proposedTeam: item.proposed
      ? {
          name: item.club,
          countryCode: item.proposed.country?.code ?? "",
          countryName: item.proposed.country?.name ?? null,
          transfermarktUrl: item.proposed.tmUrl ?? null,
        }
      : null,
  };
}

type ComparableStage = {
  club: string;
  division: string | null;
  startYear: number | null;
  endYear: number | null;
  teamId: string | null;
  proposedTeam: {
    name: string | null;
    countryCode: string | null;
    countryName: string | null;
    transfermarktUrl: string | null;
  } | null;
};

function normalizeOptional(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function toComparableStage(stage: CareerStageInput): ComparableStage {
  const proposed = stage.proposedTeam
    ? {
        name: normalizeOptional(stage.proposedTeam.name ?? null),
        countryCode: (() => {
          const value = normalizeOptional(stage.proposedTeam.countryCode ?? null);
          return value ? value.toUpperCase() : null;
        })(),
        countryName: normalizeOptional(stage.proposedTeam.countryName ?? null),
        transfermarktUrl: normalizeOptional(stage.proposedTeam.transfermarktUrl ?? null),
      }
    : null;

  return {
    club: stage.club.trim(),
    division: normalizeOptional(stage.division ?? null),
    startYear: stage.startYear ?? null,
    endYear: stage.endYear ?? null,
    teamId: stage.teamId ?? null,
    proposedTeam: proposed,
  };
}

function proposedTeamsEqual(
  a: ComparableStage["proposedTeam"],
  b: ComparableStage["proposedTeam"],
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    a.name === b.name &&
    a.countryCode === b.countryCode &&
    a.countryName === b.countryName &&
    a.transfermarktUrl === b.transfermarktUrl
  );
}

function comparableStagesEqual(a: ComparableStage, b: ComparableStage): boolean {
  return (
    a.club === b.club &&
    a.division === b.division &&
    a.startYear === b.startYear &&
    a.endYear === b.endYear &&
    a.teamId === b.teamId &&
    proposedTeamsEqual(a.proposedTeam, b.proposedTeam)
  );
}

function formatStatus(status: CareerRequestSnapshot["status"]): { label: string; tone: "default" | "success" | "warning" | "danger" } {
  switch (status) {
    case "approved":
      return { label: "Aprobada", tone: "success" };
    case "rejected":
      return { label: "Rechazada", tone: "danger" };
    case "cancelled":
      return { label: "Cancelada", tone: "default" };
    default:
      return { label: "En revisión", tone: "warning" };
  }
}

function formatDate(value: string | null): string {
  if (!value) return "";
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return value;
  }
}

export default function CareerManager({ playerId, playerName, stages, latestRequest }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusState>(DEFAULT_STATUS);
  const [note, setNote] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const { enqueue } = useNotificationContext();

  const baseItems = useMemo<AugmentedCareerItem[]>(() => stages.map(toEditorItem), [stages]);
  const baseOriginalMap = useMemo(
    () => new Map(baseItems.map((item) => [item.id, item.originalId ?? null])),
    [baseItems],
  );
  const baseComparableMap = useMemo(() => {
    const entries: Array<[string, ComparableStage]> = [];
    for (const item of baseItems) {
      const payload = mapToPayload(item);
      const key = payload.originalId ?? payload.id ?? null;
      if (key) {
        entries.push([key, toComparableStage(payload)]);
      }
    }
    return new Map(entries);
  }, [baseItems]);
  const [items, setItems] = useState<AugmentedCareerItem[]>(baseItems);
  const [guardMessage, setGuardMessage] = useState<string | null>(null);
  const requestDescriptor = useMemo(
    () => (latestRequest ? formatStatus(latestRequest.status) : null),
    [latestRequest],
  );
  const pendingItems = latestRequest?.status === "pending" ? latestRequest.items : [];
  const pendingNote = latestRequest?.status === "pending" ? latestRequest.note : null;
  const isLockedByRequest = latestRequest?.status === "pending";
  const resolutionDescriptor = useMemo<ResolutionDescriptor | null>(() => {
    if (!latestRequest || latestRequest.status === "pending") {
      return null;
    }

    const note = latestRequest.resolutionNote?.trim();
    if (!note) {
      return null;
    }

    switch (latestRequest.status) {
      case "approved":
        return { label: "Solicitud aprobada", note, tone: "success" };
      case "rejected":
        return { label: "Solicitud rechazada", note, tone: "danger" };
      case "cancelled":
        return { label: "Solicitud cancelada", note, tone: "default" };
      default:
        return null;
    }
  }, [latestRequest]);

  useEffect(() => {
    if (!latestRequest?.id) {
      return;
    }

    if (latestRequest.status === "approved") {
      const eventId = `career.review.approved:${latestRequest.id}:${latestRequest.reviewedAt ?? ""}`;
      if (ensureEventRecorded(eventId)) {
        enqueue(
          reviewNotification.approved({
            userName: playerName ?? undefined,
            requestId: latestRequest.id,
            topicLabel: "tu trayectoria",
            detailsHref: "/dashboard/edit-profile/football-data",
          }),
        );
      }
    }

    if (latestRequest.status === "rejected") {
      const eventId = `career.review.rejected:${latestRequest.id}:${latestRequest.reviewedAt ?? ""}`;
      if (ensureEventRecorded(eventId)) {
        enqueue(
          reviewNotification.rejected({
            userName: playerName ?? undefined,
            requestId: latestRequest.id,
            topicLabel: "tu trayectoria",
            retryHref: "/dashboard/edit-profile/football-data",
            moderatorMessage: latestRequest.resolutionNote ?? undefined,
          }),
        );
      }
    }
  }, [enqueue, latestRequest, playerName]);

  useEffect(() => {
    setItems(baseItems);
    setStatus(DEFAULT_STATUS);
    setNote("");
    setGuardMessage(null);
  }, [baseItems]);

  const handleChange = (next: CareerItemInput[]) => {
    if (isLockedByRequest) {
      return;
    }
    let nextGuard = guardMessage;
    setItems((prev) => {
      let normalized = next.map((item) => {
        const previous = prev.find((p) => p.id === item.id);
        const fallbackOriginal = baseOriginalMap.get(item.id) ?? null;
        return {
          ...item,
          originalId: previous?.originalId ?? fallbackOriginal ?? null,
        } as AugmentedCareerItem;
      });

      const currentCandidate = normalized.find((item) => item.source === "current") ?? null;
      const currentId = currentCandidate?.id ?? null;

      if (currentId) {
        normalized = normalized.map((item) => {
          if (item.id === currentId) {
            return {
              ...item,
              source: "current",
              lockEnd: true,
              end_year: null,
            };
          }
          if (item.source === "current") {
            return { ...item, source: "manual", lockEnd: false };
          }
          return item;
        });

        normalized = normalized.filter((item) => {
          if (item.id === currentId) return true;
          if (item.team_id || item.team_meta || item.proposed) return true;
          const label = item.club?.trim().toLowerCase() ?? "";
          if (!label) return true;
          return !["libre", "jugador libre", "free agent", "agente libre", "sin club"].includes(label);
        });
      }

      const hasOpenOtherStage = normalized.some((item) => {
        if (item.id === currentId) return false;
        const meaningful = Boolean(
          item.team_id ||
            item.team_meta ||
            item.proposed ||
            (item.club && item.club.trim().length > 0),
        );
        if (!meaningful) return false;
        return item.end_year === null;
      });

      if (!hasOpenOtherStage) {
        nextGuard = null;
      }

      return normalized;
    });

    setGuardMessage(nextGuard);
  };

  const handleRequestCurrentChange = useCallback(
    (row: CareerItemInput, selected: boolean) => {
      if (!selected) {
        setGuardMessage(null);
        return true;
      }

      const hasOpenOtherStage = items.some((item) => {
        if (item.id === row.id) return false;
        const meaningful = Boolean(
          item.team_id ||
            item.team_meta ||
            item.proposed ||
            (item.club && item.club.trim().length > 0),
        );
        if (!meaningful) return false;
        return item.end_year === null;
      });

      if (hasOpenOtherStage) {
        setGuardMessage(
          "Para marcar un nuevo equipo como actual, cerrá la etapa vigente indicando su año de finalización.",
        );
        return false;
      }

      setGuardMessage(null);
      return true;
    },
    [items],
  );

  const confirmedItems = useMemo(() => items.filter((item) => item.confirmed), [items]);
  const confirmedPayloads = useMemo(() => confirmedItems.map(mapToPayload), [confirmedItems]);
  const confirmedComparableEntries = useMemo(
    () =>
      confirmedPayloads.map((payload) => ({
        key: payload.originalId ?? payload.id ?? null,
        value: toComparableStage(payload),
      })),
    [confirmedPayloads],
  );
  const hasPendingDrafts = useMemo(() => items.some((item) => !item.confirmed), [items]);
  const hasConfirmedChanges = useMemo(() => {
    const confirmedKeys = new Set<string>();

    for (const entry of confirmedComparableEntries) {
      if (!entry.key) {
        return true;
      }
      confirmedKeys.add(entry.key);
      const baseStage = baseComparableMap.get(entry.key);
      if (!baseStage) {
        return true;
      }
      if (!comparableStagesEqual(entry.value, baseStage)) {
        return true;
      }
    }

    if (confirmedComparableEntries.length !== baseComparableMap.size) {
      return true;
    }

    for (const baseKey of baseComparableMap.keys()) {
      if (!confirmedKeys.has(baseKey)) {
        return true;
      }
    }

    return false;
  }, [confirmedComparableEntries, baseComparableMap]);
  const showActionPanel = hasConfirmedChanges && !isLockedByRequest;

  useEffect(() => {
    if (!hasConfirmedChanges) {
      setStatus(DEFAULT_STATUS);
      setNote("");
    }
  }, [hasConfirmedChanges]);

  const handleSubmit = () => {
    if (isLockedByRequest) {
      setStatus({ type: "error", message: "Ya tenés una solicitud en revisión. Esperá la respuesta del equipo." });
      return;
    }

    if (!hasConfirmedChanges) {
      setStatus({
        type: "error",
        message: "Confirmá y guardá los cambios que quieras enviar antes de solicitar la revisión.",
      });
      return;
    }

    if (hasPendingDrafts) {
      setStatus({ type: "error", message: "Confirmá o eliminá las etapas en edición antes de enviar." });
      return;
    }

    if (confirmedItems.length === 0) {
      setStatus({ type: "error", message: "Agregá al menos una etapa confirmada en tu trayectoria." });
      return;
    }

    const payload = {
      playerId,
      note: note.trim() || null,
      items: confirmedPayloads,
    };

    startTransition(async () => {
      const result = await submitCareerRevision(payload);
      if (!result.success) {
        setStatus({ type: "error", message: result.message });
        return;
      }

      setStatus({ type: "success", message: "Solicitud enviada para revisión del equipo." });
      setNote("");
      if (result.requestId) {
        enqueue(
          reviewNotification.submitted({
            userName: playerName ?? undefined,
            requestId: result.requestId,
            topicLabel: "tu trayectoria",
          }),
        );
      }
      router.refresh();
    });
  };

  const handleReset = () => {
    setItems(baseItems);
    setStatus(DEFAULT_STATUS);
    setNote("");
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Trayectoria profesional</h3>
            <p className="text-sm text-neutral-400">
              Editá tus etapas, proponé nuevos equipos y enviá la solicitud para que nuestro equipo la valide.
            </p>
          </div>
          {requestDescriptor ? (
            <Chip
              size="sm"
              color={
                requestDescriptor.tone === "success"
                  ? "success"
                  : requestDescriptor.tone === "danger"
                  ? "danger"
                  : requestDescriptor.tone === "warning"
                  ? "warning"
                  : "default"
              }
              variant="flat"
            >
              {requestDescriptor.label}
            </Chip>
          ) : null}
        </div>
        {latestRequest ? (
          <p className="text-xs text-neutral-500">
            Última actualización: {formatDate(latestRequest.reviewedAt ?? latestRequest.submittedAt)}
          </p>
        ) : null}
      </header>

      {resolutionDescriptor ? (
        (() => {
          const styles = RESOLUTION_TONE_STYLES[resolutionDescriptor.tone];
          const IconComponent =
            resolutionDescriptor.tone === "success"
              ? CheckCircle2
              : resolutionDescriptor.tone === "danger"
              ? XCircle
              : Info;
          return (
            <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${styles.container}`}>
              <IconComponent className={`mt-0.5 h-5 w-5 shrink-0 ${styles.icon}`} />
              <div className="space-y-1">
                <p className={`text-sm font-semibold ${styles.label}`}>{resolutionDescriptor.label}</p>
                <p className={`text-xs leading-relaxed ${styles.note}`}>{resolutionDescriptor.note}</p>
              </div>
            </div>
          );
        })()
      ) : null}

      {pendingItems.length > 0 ? (
        <section className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-amber-200">Solicitud en revisión</p>
              <p className="text-xs text-amber-100/80">
                Tus cambios quedarán visibles cuando el equipo de Ballers los apruebe.
              </p>
            </div>
            <Chip size="sm" color="warning" variant="flat">
              En revisión
            </Chip>
          </div>
          {pendingNote ? (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/80">
              {pendingNote}
            </p>
          ) : null}
          <ul className="space-y-2">
            {pendingItems.map((stage) => (
              <li
                key={stage.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-neutral-950/70 p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src={stage.team?.crestUrl || "/images/team-default.svg"}
                    width={28}
                    height={28}
                    className="h-7 w-7 shrink-0 object-contain"
                    alt=""
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-white">{stage.team?.name ?? stage.club ?? "Club"}</p>
                      {stage.team?.countryCode || stage.proposedTeam?.countryCode ? (
                        <CountryFlag
                          code={stage.team?.countryCode ?? stage.proposedTeam?.countryCode ?? undefined}
                          size={12}
                          title={
                            stage.proposedTeam?.countryName ??
                            (stage.team?.countryCode ? stage.team.countryCode : undefined)
                          }
                        />
                      ) : null}
                      {stage.proposedTeam ? (
                        <Chip size="sm" variant="flat" color="warning">
                          Equipo propuesto
                        </Chip>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-neutral-400">
                      {(stage.division ?? "División sin definir") + " · "}
                      {formatStagePeriod(stage.startYear, stage.endYear)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {guardMessage ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {guardMessage}
        </p>
      ) : null}

      <CareerEditor
        items={items}
        onChange={handleChange}
        optional={false}
        onRequestCurrentChange={handleRequestCurrentChange}
        readOnly={isLockedByRequest}
      />

      {isLockedByRequest ? (
        <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          <AlertTriangle className="mt-[2px] h-4 w-4 shrink-0" />
          <span>
            Tenés una solicitud de revisión pendiente. Esperá la respuesta del equipo para editar nuevamente tu trayectoria.
          </span>
        </p>
      ) : null}

      {showActionPanel ? (
        <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
          <label className="block space-y-2 text-sm text-neutral-300">
            <span className="font-medium text-neutral-200">Nota para el equipo (opcional)</span>
            <textarea
              value={note}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setNote(event.target.value)}
              rows={3}
              placeholder="Contanos el contexto de los cambios o la temporada a destacar."
              className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-700 disabled:opacity-60"
              disabled={pending || isLockedByRequest}
            />
          </label>
          {status ? (
            <p
              className={`text-sm ${status.type === "error" ? "text-red-400" : "text-emerald-400"}`}
            >
              {status.message}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              variant="light"
              size="sm"
              onPress={handleReset}
              disabled={pending}
            >
              Restablecer cambios
            </Button>
            <Button
              color="primary"
              size="sm"
              onPress={handleSubmit}
              isLoading={pending}
              isDisabled={pending || isLockedByRequest}
            >
              {isLockedByRequest ? "Solicitud en revisión" : "Enviar solicitud"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatStagePeriod(startYear: number | null, endYear: number | null): string {
  const from = startYear ?? "¿?";
  const to = endYear ?? "Actual";
  return `${from} – ${to}`;
}
