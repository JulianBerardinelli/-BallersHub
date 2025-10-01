"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { useRouter } from "next/navigation";

import CareerEditor, { type CareerItemInput } from "@/components/career/CareerEditor";
import CountryFlag from "@/components/common/CountryFlag";
import type { CareerStageInput } from "../schemas";
import { submitCareerRevision } from "../actions";

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
  items: CareerRequestStage[];
};

type StatusState = { type: "success" | "error"; message: string } | null;

type Props = {
  playerId: string;
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
    originalId: item.originalId ?? item.id,
    club: item.club,
    division: item.division ?? null,
    startYear: item.start_year ?? null,
    endYear: item.end_year ?? null,
    teamId: item.team_id ?? null,
    proposedTeam: item.proposed
      ? {
          name: item.club,
          countryCode: item.proposed.country?.code ?? null,
          countryName: item.proposed.country?.name ?? null,
          transfermarktUrl: item.proposed.tmUrl ?? null,
        }
      : null,
  };
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

export default function CareerManager({ playerId, stages, latestRequest }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusState>(DEFAULT_STATUS);
  const [note, setNote] = useState<string>("");
  const [pending, startTransition] = useTransition();

  const baseItems = useMemo<AugmentedCareerItem[]>(() => stages.map(toEditorItem), [stages]);
  const baseIds = useMemo(() => new Set(baseItems.map((item) => item.id)), [baseItems]);
  const baseOriginalMap = useMemo(() => new Map(baseItems.map((item) => [item.id, item.originalId ?? null])), [baseItems]);
  const [items, setItems] = useState<AugmentedCareerItem[]>(baseItems);
  const requestDescriptor = useMemo(
    () => (latestRequest ? formatStatus(latestRequest.status) : null),
    [latestRequest],
  );
  const pendingItems = latestRequest?.status === "pending" ? latestRequest.items : [];
  const pendingNote = latestRequest?.status === "pending" ? latestRequest.note : null;

  useEffect(() => {
    setItems(baseItems);
    setStatus(DEFAULT_STATUS);
    setNote("");
  }, [baseItems]);

  const handleChange = (next: CareerItemInput[]) => {
    setItems((prev) => {
      let normalized = next.map((item) => {
        const previous = prev.find((p) => p.id === item.id);
        const fallbackOriginal = baseOriginalMap.get(item.id) ?? null;
        return {
          ...item,
          originalId: previous?.originalId ?? fallbackOriginal ?? null,
        } as AugmentedCareerItem;
      });

      const prevCurrentId = prev.find((p) => p.source === "current")?.id ?? null;
      const newlyCurrent = normalized.find((item) => {
        if (item.source !== "current") return false;
        const prevMatch = prev.find((p) => p.id === item.id);
        return !prevMatch || prevMatch.source !== "current";
      });
      const currentCandidate = newlyCurrent ?? normalized.find((item) => item.source === "current") ?? null;
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

        const currentStage = normalized.find((item) => item.id === currentId) ?? null;
        if (currentStage && prevCurrentId && prevCurrentId !== currentId) {
          const closingYear = currentStage.start_year ?? null;
          normalized = normalized.map((item) => {
            if (item.id !== prevCurrentId) return item;
            return {
              ...item,
              source: "manual",
              lockEnd: false,
              end_year: closingYear,
            };
          });
        }

        normalized = normalized.filter((item) => {
          if (item.id === currentId) return true;
          if (item.team_id || item.team_meta || item.proposed) return true;
          const label = item.club?.trim().toLowerCase() ?? "";
          if (!label) return true;
          return !["libre", "jugador libre", "free agent", "agente libre", "sin club"].includes(label);
        });
      }

      return normalized;
    });
  };

  const confirmedItems = useMemo(() => items.filter((item) => item.confirmed), [items]);
  const hasPendingDrafts = useMemo(() => items.some((item) => !item.confirmed), [items]);
  const isLockedByRequest = latestRequest?.status === "pending";
  const hasConfirmedNewStages = useMemo(
    () => confirmedItems.some((item) => !baseIds.has(item.id)),
    [confirmedItems, baseIds],
  );
  const showActionPanel = hasConfirmedNewStages && !isLockedByRequest;

  useEffect(() => {
    if (!hasConfirmedNewStages) {
      setStatus(DEFAULT_STATUS);
      setNote("");
    }
  }, [hasConfirmedNewStages]);

  const handleSubmit = () => {
    if (isLockedByRequest) {
      setStatus({ type: "error", message: "Ya tenés una solicitud en revisión. Esperá la respuesta del equipo." });
      return;
    }

    if (!hasConfirmedNewStages) {
      setStatus({ type: "error", message: "Agregá una nueva etapa confirmada para enviar la solicitud." });
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
      items: confirmedItems.map(mapToPayload),
    };

    startTransition(async () => {
      const result = await submitCareerRevision(payload);
      if (!result.success) {
        setStatus({ type: "error", message: result.message });
        return;
      }

      setStatus({ type: "success", message: "Solicitud enviada para revisión del equipo." });
      setNote("");
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

      <CareerEditor items={items} onChange={handleChange} optional={false} />

      {showActionPanel ? (
        <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
          <label className="block space-y-2 text-sm text-neutral-300">
            <span className="font-medium text-neutral-200">Nota para el equipo (opcional)</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
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
