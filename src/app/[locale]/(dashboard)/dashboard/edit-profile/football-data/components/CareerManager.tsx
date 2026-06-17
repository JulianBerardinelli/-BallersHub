"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Chip } from "@heroui/react";
import { bhButtonClass } from "@/components/ui/BhButton";
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
    container: "border-white/[0.12] bg-bh-surface-1/60",
    label: "text-bh-fg-1",
    note: "text-bh-fg-2",
    icon: "text-bh-fg-2",
  },
} as const;

type ResolutionTone = keyof typeof RESOLUTION_TONE_STYLES;

import { reviewNotification, useNotificationContext } from "@/modules/notifications";
import { ensureEventRecorded } from "@/modules/notifications/utils/eventStore";

export type CareerStage = {
  id: string;
  club: string | null;
  division: string | null;
  division_id?: string | null;
  secondaryDivisionName?: string | null;
  secondaryDivisionId?: string | null;
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
  /**
   * Override the submit action. The admin CRUD injects a service-role variant
   * that writes career_items LIVE (bypassing the revision queue). Default keeps
   * the player's review-queue submit.
   */
  submitAction?: typeof submitCareerRevision;
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
    division_id: stage.division_id ?? null,
    secondary_division: stage.secondaryDivisionName ?? null,
    secondary_division_id: stage.secondaryDivisionId ?? null,
    secondary_division_meta: null,
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

function mapToPayload(
  item: AugmentedCareerItem,
): CareerStageInput & { divisionId?: string | null; secondaryDivisionId?: string | null } {
  return {
    id: item.id,
    originalId: item.originalId ?? null,
    club: item.club,
    division: item.division ?? null,
    divisionId: item.division_id ?? null,
    secondaryDivision: item.secondary_division ?? null,
    secondaryDivisionId: item.secondary_division_id ?? null,
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
  divisionId: string | null;
  secondaryDivision: string | null;
  secondaryDivisionId: string | null;
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

function toComparableStage(
  stage: CareerStageInput & { divisionId?: string | null; secondaryDivisionId?: string | null },
): ComparableStage {
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
    divisionId: stage.divisionId ?? null,
    secondaryDivision: normalizeOptional(stage.secondaryDivision ?? null),
    secondaryDivisionId: stage.secondaryDivisionId ?? null,
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
    a.divisionId === b.divisionId &&
    a.secondaryDivision === b.secondaryDivision &&
    a.secondaryDivisionId === b.secondaryDivisionId &&
    a.startYear === b.startYear &&
    a.endYear === b.endYear &&
    a.teamId === b.teamId &&
    proposedTeamsEqual(a.proposedTeam, b.proposedTeam)
  );
}

type CareerTFn = ReturnType<typeof useTranslations<"dashEditProfile">>;

function formatStatus(t: CareerTFn, status: CareerRequestSnapshot["status"]): { label: string; tone: "default" | "success" | "warning" | "danger" } {
  switch (status) {
    case "approved":
      return { label: t("footballData.career.statusApproved"), tone: "success" };
    case "rejected":
      return { label: t("footballData.career.statusRejected"), tone: "danger" };
    case "cancelled":
      return { label: t("footballData.career.statusCancelled"), tone: "default" };
    default:
      return { label: t("footballData.career.statusPending"), tone: "warning" };
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

export default function CareerManager({
  playerId,
  playerName,
  stages,
  latestRequest,
  submitAction = submitCareerRevision,
}: Props) {
  const t = useTranslations("dashEditProfile");
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
    () => (latestRequest ? formatStatus(t, latestRequest.status) : null),
    [latestRequest, t],
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
        return { label: t("footballData.career.resolutionApprovedLabel"), note, tone: "success" };
      case "rejected":
        return { label: t("footballData.career.resolutionRejectedLabel"), note, tone: "danger" };
      case "cancelled":
        return { label: t("footballData.career.resolutionCancelledLabel"), note, tone: "default" };
      default:
        return null;
    }
  }, [latestRequest, t]);

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
            topicLabel: t("footballData.career.topicLabel"),
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
            topicLabel: t("footballData.career.topicLabel"),
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
          t("footballData.career.guardCloseCurrent"),
        );
        return false;
      }

      setGuardMessage(null);
      return true;
    },
    [items, t],
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
      setStatus({ type: "error", message: t("footballData.career.errorInReview") });
      return;
    }

    if (!hasConfirmedChanges) {
      setStatus({
        type: "error",
        message: t("footballData.career.errorConfirmFirst"),
      });
      return;
    }

    if (hasPendingDrafts) {
      setStatus({ type: "error", message: t("footballData.career.errorPendingDrafts") });
      return;
    }

    if (confirmedItems.length === 0) {
      setStatus({ type: "error", message: t("footballData.career.errorAtLeastOne") });
      return;
    }

    const payload = {
      playerId,
      note: note.trim() || null,
      items: confirmedPayloads,
    };

    startTransition(async () => {
      const result = await submitAction(payload);
      if (!result.success) {
        setStatus({ type: "error", message: result.message });
        return;
      }

      setStatus({ type: "success", message: t("footballData.career.successSubmitted") });
      setNote("");
      if (result.requestId) {
        enqueue(
          reviewNotification.submitted({
            userName: playerName ?? undefined,
            requestId: result.requestId,
            topicLabel: t("footballData.career.topicLabel"),
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
            <h3 className="text-lg font-semibold text-white">{t("footballData.career.heading")}</h3>
            <p className="text-sm text-bh-fg-3">
              {t("footballData.career.subtitle")}
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
          <p className="text-xs text-bh-fg-4">
            {t("footballData.career.lastUpdated", { date: formatDate(latestRequest.reviewedAt ?? latestRequest.submittedAt) })}
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
              <p className="text-sm font-semibold text-amber-200">{t("footballData.career.pendingRequestTitle")}</p>
              <p className="text-xs text-amber-100/80">
                {t("footballData.career.pendingRequestHelp")}
              </p>
            </div>
            <Chip size="sm" color="warning" variant="flat">
              {t("footballData.career.pendingChip")}
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
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-bh-black/70 p-3"
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
                      <p className="truncate text-sm font-semibold text-white">{stage.team?.name ?? stage.club ?? t("footballData.career.clubFallback")}</p>
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
                          {t("footballData.career.proposedTeam")}
                        </Chip>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-bh-fg-3">
                      {(stage.division ?? t("footballData.career.divisionUndefined")) + " · "}
                      {formatStagePeriod(t, stage.startYear, stage.endYear)}
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
            {t("footballData.career.lockedNotice")}
          </span>
        </p>
      ) : null}

      {showActionPanel ? (
        <div className="space-y-4 rounded-lg border border-white/[0.08] bg-bh-surface-1/40 p-4">
          <label className="block space-y-2 text-sm text-bh-fg-2">
            <span className="font-medium text-bh-fg-1">{t("footballData.career.noteLabel")}</span>
            <textarea
              value={note}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setNote(event.target.value)}
              rows={3}
              placeholder={t("footballData.career.notePlaceholder")}
              className="w-full rounded-md border border-white/[0.08] bg-bh-black px-3 py-2 text-sm text-bh-fg-1 placeholder:text-bh-fg-4 focus:outline-none focus:ring-1 focus:ring-bh-lime/30 disabled:opacity-60"
              disabled={pending || isLockedByRequest}
            />
          </label>
          {status ? (
            <p
              className={`text-sm ${status.type === "error" ? "text-bh-danger" : "text-bh-success"}`}
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
              {t("footballData.career.reset")}
            </Button>
            <Button
              size="sm"
              onPress={handleSubmit}
              isLoading={pending}
              isDisabled={pending || isLockedByRequest}
              className={bhButtonClass({ variant: "lime", size: "sm" })}
            >
              {isLockedByRequest ? t("footballData.career.submitInReview") : t("footballData.career.submit")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatStagePeriod(t: CareerTFn, startYear: number | null, endYear: number | null): string {
  const from = startYear ?? "¿?";
  const to = endYear ?? t("footballData.career.currentPeriod");
  return `${from} – ${to}`;
}
