"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Controller, useForm, type UseFormSetError } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Autocomplete, AutocompleteItem, Button } from "@heroui/react";
import { bhButtonClass } from "@/components/ui/BhButton";
import Image from "next/image";

import type { DashboardSeasonStat } from "@/lib/dashboard/client/publishing-state";
import { seasonStatMutationSchema, type SeasonStatMutationInput, type CareerRevisionSubmissionInput } from "../schemas";
import { submitCareerRevision, deleteSeasonStat } from "../actions";
import TeamCrest from "@/components/teams/TeamCrest";
import FormField from "@/components/dashboard/client/FormField";
import type { CareerRequestSnapshot } from "./CareerManager";

type FormValues = {
  id?: string;
  season: string;
  competition: string;
  team: string;
  matches: string;
  starts: string;
  minutes: string;
  goals: string;
  assists: string;
  yellowCards: string;
  redCards: string;
  careerItemId: string;
};

type StatusState = { type: "success" | "error"; message: string } | null;

// `period` is locale-STABLE (canonical es): it's auto-written into the form's
// `season` field on selection and persisted in DB, so it can't vary by editor
// UI locale. `periodLabel` is for display only and is localized.
type CareerOption = { id: string; label: string; club: string | null; period: string; periodLabel: string; crestUrl: string | null };
type StageOption = CareerOption & { hasExistingStats: boolean };

type Props = {
  playerId: string;
  stats: DashboardSeasonStat[];
  careerOptions: CareerOption[];
  latestRequest?: CareerRequestSnapshot | null;
};

const defaultValues: FormValues = {
  id: undefined,
  season: "",
  competition: "",
  team: "",
  matches: "",
  starts: "",
  minutes: "",
  goals: "",
  assists: "",
  yellowCards: "",
  redCards: "",
  careerItemId: "",
};

type StatsTFn = ReturnType<typeof useTranslations<"dashEditProfile">>;

const formatStageLabel = (t: StatsTFn, option: Pick<CareerOption, "club" | "periodLabel">) => {
  const club = option.club && option.club.trim().length > 0 ? option.club : t("footballData.seasonStats.clubUndefined");
  return `${club} · ${option.periodLabel}`;
};

type AugmentedStat = {
  id: string;
  season: string;
  matches: number | null;
  starts: number | null;
  goals: number | null;
  assists: number | null;
  minutes: number | null;
  yellowCards: number | null;
  redCards: number | null;
  competition: string | null;
  team: string | null;
  careerItemId: string | null;
  crestUrl?: string | null; // For display
  isDraft?: boolean;
  originalStatId?: string | null;
};

export default function SeasonStatsManager({ playerId, stats, careerOptions, latestRequest }: Props) {
  const t = useTranslations("dashEditProfile");
  const router = useRouter();
  const [status, setStatus] = useState<StatusState>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const lastAutoTeamRef = useRef<string | null>(null);
  const lastAutoSeasonRef = useRef<string | null>(null);
  const lastSelectedStageIdRef = useRef<string | null>(null);
  const skipStageAutofillRef = useRef(false);
  const [careerInputValue, setCareerInputValue] = useState("");

  const baseItems = useMemo<AugmentedStat[]>(() => {
    const items: AugmentedStat[] = stats.map((s) => ({
      id: s.id,
      season: s.season,
      matches: s.matches,
      starts: s.starts ?? null,
      goals: s.goals,
      assists: s.assists,
      minutes: s.minutes,
      yellowCards: s.yellowCards,
      redCards: s.redCards,
      competition: s.competition,
      team: s.team,
      careerItemId: s.careerItemId,
      crestUrl: s.crestUrl,
      isDraft: false,
    }));
    return items;
  }, [stats]);

  const [items, setItems] = useState<AugmentedStat[]>(baseItems);
  const [submissionStatus, setSubmissionStatus] = useState<StatusState>(null);
  const [submissionNote, setSubmissionNote] = useState("");
  const draftsCount = items.filter((i) => i.isDraft).length;
  
  // Resincronizar base items solo si el dashboard principal recarga data fresca, evitando perder drafts si items no cambió estructuralmente por afuera
  useEffect(() => {
    setItems((current) => {
      const drafts = current.filter((i) => i.isDraft);
      return [...baseItems, ...drafts];
    });
  }, [baseItems]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
    getValues,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues,
  });

  const optionMap = useMemo(() => new Map(careerOptions.map((option) => [option.id, option])), [careerOptions]);
  const watchCareerItemId = watch("careerItemId");
  const watchSeason = watch("season");
  const watchCompetition = watch("competition");
  const watchId = watch("id");

  const editingStat = useMemo(
    () => (watchId ? stats.find((stat) => stat.id === watchId) ?? null : null),
    [stats, watchId],
  );

  const selectedStage = watchCareerItemId ? optionMap.get(watchCareerItemId) ?? null : null;

  const stageOptions: StageOption[] = useMemo(() => {
    return careerOptions.map((option) => ({
      ...option,
      hasExistingStats: items.some((stat) => {
        if (editingStat && stat.id === editingStat.id) return false;
        return stat.careerItemId === option.id;
      }),
    }));
  }, [careerOptions, items, editingStat]);

  useEffect(() => {
    if (selectedStage) {
      setCareerInputValue(formatStageLabel(t, selectedStage));
    } else if (!watchCareerItemId) {
      setCareerInputValue("");
    }
  }, [selectedStage, watchCareerItemId, t]);

  useEffect(() => {
    if (!watchSeason || watchSeason.trim().length === 0) {
      clearErrors("season");
      return;
    }

    const hasDuplicate = items.some(
      (stat) => stat.season === watchSeason && stat.competition === watchCompetition && stat.id !== watchId
    );
    if (hasDuplicate) {
      setError("season", {
        type: "manual",
        message: t("footballData.seasonStats.duplicateSeasonField"),
      });
      setError("competition", {
        type: "manual",
        message: t("footballData.seasonStats.duplicateCompetitionField"),
      });
    } else {
      clearErrors(["season", "competition"]);
    }
  }, [watchSeason, watchCompetition, watchId, items, setError, clearErrors, t]);

  useEffect(() => {
    if (!watchCareerItemId) {
      lastAutoTeamRef.current = null;
      lastAutoSeasonRef.current = null;
      lastSelectedStageIdRef.current = null;
      skipStageAutofillRef.current = false;
      if (getValues("season")) {
        setValue("season", "", { shouldDirty: true });
      }
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
    const club = option.club ?? "";
    const currentTeam = getValues("team");
    if (
      stageChanged ||
      !currentTeam ||
      currentTeam.trim().length === 0 ||
      currentTeam === lastAutoTeamRef.current
    ) {
      if (club) {
        setValue("team", club, { shouldDirty: true });
        lastAutoTeamRef.current = club;
      }
    }

    const currentSeason = getValues("season");
    if (stageChanged || !currentSeason || currentSeason === lastAutoSeasonRef.current) {
      setValue("season", option.period, { shouldDirty: true });
      lastAutoSeasonRef.current = option.period;
    }

    lastSelectedStageIdRef.current = option.id;
  }, [getValues, optionMap, setValue, watchCareerItemId]);

  const onSubmit = handleSubmit((values) => {
    const parsed = seasonStatMutationSchema.safeParse({
      ...values,
      playerId,
    });

    if (!parsed.success) {
      reflectValidationErrors(parsed.error, setError, setStatus, t("common.reviewFormData"));
      return;
    }

    const duplicateSeason = items.some(
      (stat) => stat.season === parsed.data.season && stat.competition === parsed.data.competition && stat.id !== parsed.data.id
    );
    if (duplicateSeason) {
      setError("season", {
        type: "manual",
        message: t("footballData.seasonStats.duplicateSeasonRegisteredField"),
      });
      setStatus({ type: "error", message: t("footballData.seasonStats.duplicateSeasonStatus") });
      return;
    }

    const isDraft = !parsed.data.id || parsed.data.id.startsWith("draft-");
    const newId = parsed.data.id || `draft-${crypto.randomUUID()}`;

    const newStat: AugmentedStat = {
      id: newId,
      originalStatId: isDraft ? null : newId,
      season: parsed.data.season,
      matches: parsed.data.matches ?? null,
      starts: parsed.data.starts ?? null,
      goals: parsed.data.goals ?? null,
      assists: parsed.data.assists ?? null,
      minutes: parsed.data.minutes ?? null,
      yellowCards: parsed.data.yellowCards ?? null,
      redCards: parsed.data.redCards ?? null,
      competition: parsed.data.competition ?? null,
      team: parsed.data.team ?? null,
      careerItemId: parsed.data.careerItemId ?? null,
      crestUrl: selectedStage?.crestUrl ?? null,
      isDraft: true,
    };

    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === newId);
      if (idx >= 0) {
        const _prev = [...prev];
        _prev[idx] = newStat;
        return _prev;
      }
      return [...prev, newStat];
    });

    setStatus({ type: "success", message: values.id ? t("footballData.seasonStats.draftSavedEditing") : t("footballData.seasonStats.draftAdded") });
    setEditingId(null);
    reset(defaultValues);
    lastAutoTeamRef.current = null;
    lastAutoSeasonRef.current = null;
    lastSelectedStageIdRef.current = null;
    skipStageAutofillRef.current = false;
    setCareerInputValue("");
  });

  const startEditing = (stat: AugmentedStat) => {
    setEditingId(stat.id);
    reset({
      id: stat.id,
      season: stat.season,
      competition: stat.competition ?? "",
      team: stat.team ?? "",
      matches: stat.matches?.toString() ?? "",
      starts: stat.starts?.toString() ?? "",
      minutes: stat.minutes?.toString() ?? "",
      goals: stat.goals?.toString() ?? "",
      assists: stat.assists?.toString() ?? "",
      yellowCards: stat.yellowCards?.toString() ?? "",
      redCards: stat.redCards?.toString() ?? "",
      careerItemId: stat.careerItemId ?? "",
    });
    setStatus(null);
    skipStageAutofillRef.current = true;
    lastSelectedStageIdRef.current = stat.careerItemId ?? null;
    lastAutoSeasonRef.current = stat.season;
    lastAutoTeamRef.current = stat.team ?? null;
    if (stat.careerItemId) {
      const option = optionMap.get(stat.careerItemId);
      if (option) {
        setCareerInputValue(formatStageLabel(t, option));
      }
    } else {
      setCareerInputValue("");
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    reset(defaultValues);
    setStatus(null);
    lastAutoTeamRef.current = null;
    lastAutoSeasonRef.current = null;
    lastSelectedStageIdRef.current = null;
    skipStageAutofillRef.current = false;
    setCareerInputValue("");
  };

  const handleDelete = (stat: AugmentedStat) => {
    const confirmed = window.confirm(t("footballData.seasonStats.confirmDeleteSeason", { season: stat.season }));
    if (!confirmed) return;

    if (stat.isDraft) {
      setItems((prev) => prev.filter((i) => i.id !== stat.id));
      setStatus({ type: "success", message: t("footballData.seasonStats.draftDiscarded") });
      if (editingId === stat.id) {
        cancelEditing();
      }
      return;
    }

    startTransition(async () => {
      const result = await deleteSeasonStat({ id: stat.id, playerId });
      if (!result.success) {
        setStatus({ type: "error", message: result.message });
        return;
      }
      setStatus({ type: "success", message: t("footballData.seasonStats.deletedPermanently") });
      router.refresh();
      if (editingId === stat.id) {
        cancelEditing();
      }
    });
  };

  const handleSubmitRevision = () => {
    if (draftsCount === 0) return;

    startTransition(async () => {
      setSubmissionStatus(null);
      const input: CareerRevisionSubmissionInput = {
        playerId,
        note: submissionNote.trim() || null,
        items: [], // Enviar stats sin modificar la parte de items de trayectoria
        stats: items
          .filter((i) => i.isDraft)
          .map((i) => ({
            id: i.id.startsWith("draft-") ? undefined : i.id,
            playerId,
            season: i.season,
            matches: i.matches,
            starts: i.starts,
            goals: i.goals,
            assists: i.assists,
            minutes: i.minutes,
            yellowCards: i.yellowCards,
            redCards: i.redCards,
            competition: i.competition,
            team: i.team,
            careerItemId: i.careerItemId,
          })),
      };

      const result = await submitCareerRevision(input);
      if (!result.success) {
        setSubmissionStatus({ type: "error", message: result.message });
        return;
      }
      setSubmissionStatus({ type: "success", message: t("footballData.seasonStats.successSubmitted") });
      setItems(baseItems); // Limpiar drafts locales
      setSubmissionNote("");
      router.refresh();
    });
  };

  const hasPendingOverallParams = latestRequest && latestRequest.status === "pending";

  return (
    <div className="space-y-6">
      {hasPendingOverallParams ? (
        <div className="rounded-lg border border-amber-900/60 bg-amber-950/40 p-4 mb-6">
          <p className="text-sm font-medium text-amber-500">
            {t("footballData.seasonStats.pendingReviewNotice")}
          </p>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/[0.06] text-sm text-bh-fg-2">
            <thead className="bg-bh-surface-1/60 text-xs uppercase tracking-wide text-bh-fg-4">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  {t("footballData.seasonStats.colSeason")}
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  {t("footballData.seasonStats.colCompetition")}
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  {t("footballData.seasonStats.colTeam")}
                </th>
                <th scope="col" className="px-4 py-3 text-center font-medium">
                  {t("footballData.seasonStats.colMatches")}
                </th>
                <th scope="col" className="px-4 py-3 text-center font-medium">
                  {t("footballData.seasonStats.colStarts")}
                </th>
                <th scope="col" className="px-4 py-3 text-center font-medium">
                  {t("footballData.seasonStats.colGoals")}
                </th>
                <th scope="col" className="px-4 py-3 text-center font-medium">
                  {t("footballData.seasonStats.colAssists")}
                </th>
                <th scope="col" className="px-4 py-3 text-center font-medium">
                  {t("footballData.seasonStats.colMinutes")}
                </th>
                <th scope="col" className="px-4 py-3 text-center font-medium">
                  {t("footballData.seasonStats.colYellow")}
                </th>
                <th scope="col" className="px-4 py-3 text-center font-medium">
                  {t("footballData.seasonStats.colRed")}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  {t("footballData.seasonStats.colActions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {items.map((stat) => {
                const linkedStage = stat.careerItemId ? optionMap.get(stat.careerItemId) : null;
                const crest = stat.crestUrl ?? linkedStage?.crestUrl ?? "/images/team-default.svg";
                const periodLabel = linkedStage?.periodLabel ?? stat.season;
                const isDraftRow = stat.isDraft;

                return (
                  <tr key={stat.id} className={`transition-colors ${isDraftRow ? "bg-emerald-950/20" : "bg-bh-surface-1/40"}`}>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Image src={crest} alt="" className="h-7 w-7 shrink-0 object-contain" width={28} height={28} />
                        <div className="min-w-0">
                          <span className="block text-sm font-semibold text-white">
                            {periodLabel}
                            {isDraftRow && <span className="ml-2 text-[10px] uppercase tracking-wider text-emerald-500 font-bold bg-emerald-950 px-1.5 py-0.5 rounded">{t("footballData.seasonStats.rowNew")}</span>}
                          </span>
                          {linkedStage ? (
                            <span className="block text-[11px] text-bh-fg-4 truncate">{linkedStage.label}</span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{stat.competition ?? t("footballData.seasonStats.competitionPending")}</td>
                    <td className="whitespace-nowrap px-4 py-3">{stat.team ?? t("footballData.seasonStats.teamUndefined")}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">{formatNumericStat(stat.matches)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">{formatNumericStat(stat.starts)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">{formatNumericStat(stat.goals)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">{formatNumericStat(stat.assists)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">{formatNumericStat(stat.minutes)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">{formatNumericStat(stat.yellowCards)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">{formatNumericStat(stat.redCards)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          type="button"
                          className="rounded-md border border-white/[0.08] px-3 py-1 font-medium text-bh-fg-2 transition hover:border-white/[0.12] hover:text-white"
                          onClick={() => startEditing(stat)}
                          disabled={pending || !!hasPendingOverallParams}
                        >
                          {t("common.edit")}
                        </button>
                        <button
                          type="button"
                          className={`rounded-md border px-3 py-1 font-medium transition ${
                            isDraftRow
                              ? "border-emerald-900/60 text-bh-success hover:border-emerald-700 hover:text-emerald-300"
                              : "border-red-900/60 text-bh-danger hover:border-red-700 hover:text-red-300"
                          }`}
                          onClick={() => handleDelete(stat)}
                          disabled={pending || !!hasPendingOverallParams}
                        >
                          {isDraftRow ? t("footballData.seasonStats.remove") : t("common.delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-white/[0.08] bg-bh-surface-1/40 p-6 text-sm text-bh-fg-3">
          {t("footballData.seasonStats.emptyState")}
        </div>
      )}

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1.5 text-sm text-bh-fg-2 md:col-span-2">
            <span className="font-medium text-bh-fg-1">{t("footballData.seasonStats.careerStageLabel")}</span>
            <Controller
              control={control}
              name="careerItemId"
              render={({ field }) => (
                <Autocomplete
                  aria-label={t("footballData.seasonStats.careerStageLabel")}
                  placeholder={t("footballData.seasonStats.careerStagePlaceholder")}
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
                      lastAutoTeamRef.current = null;
                      skipStageAutofillRef.current = false;
                    }
                    setCareerInputValue(option ? formatStageLabel(t, option) : "");
                  }}
                  onBlur={field.onBlur}
                  isDisabled={pending}
                  allowsCustomValue={false}
                  variant="flat"
                  radius="sm"
                  className="w-full text-sm"
                  classNames={{
                    base: "w-full",
                    listbox: "bg-bh-black text-bh-fg-1",
                    listboxWrapper: "bg-bh-black border border-white/[0.08] rounded-md",
                    popoverContent: "bg-bh-black border border-white/[0.08] rounded-md",
                  }}
                  inputProps={{
                    classNames: {
                      inputWrapper:
                        "rounded-md border border-white/[0.08] bg-bh-black px-0 data-[hover=true]:border-white/[0.12] transition focus-within:border-primary/40",
                      innerWrapper: "px-0",
                      input: "px-3 py-2 text-sm text-bh-fg-1 placeholder:text-bh-fg-4",
                      helperWrapper: "hidden",
                    },
                  }}
                  startContent={
                    selectedStage ? (
                      <TeamCrest
                        src={selectedStage.crestUrl}
                        name={selectedStage.club ?? t("footballData.seasonStats.clubFallback")}
                        size={24}
                        className="rounded-sm bg-bh-surface-1/60"
                      />
                    ) : null
                  }
                  items={stageOptions}
                >
                  {(item: StageOption) => (
                    <AutocompleteItem
                      key={item.id}
                      textValue={formatStageLabel(t, item)}
                      startContent={
                        <TeamCrest
                          src={item.crestUrl}
                          name={item.club ?? t("footballData.seasonStats.clubFallback")}
                          size={24}
                          className="rounded-sm bg-bh-surface-1/60"
                        />
                      }
                      className={item.hasExistingStats ? "opacity-50" : ""}
                    >
                      <div className="flex flex-col gap-1 py-1">
                        <span className="font-medium">{item.club ?? t("footballData.seasonStats.clubUndefined")}</span>
                        <span className="text-xs text-bh-fg-3">{item.periodLabel}</span>
                        {item.hasExistingStats && (
                          <span className="text-[10px] uppercase tracking-wider text-primary">
                            {t("footballData.seasonStats.hasExistingStats")}
                          </span>
                        )}
                      </div>
                    </AutocompleteItem>
                  )}
                </Autocomplete>
              )}
            />
            {errors.careerItemId ? <FieldError message={errors.careerItemId.message} /> : null}
          </label>
          <FormField
            {...register("season")}
            id="season"
            label={t("footballData.seasonStats.seasonLabel")}
            placeholder={t("footballData.seasonStats.seasonPlaceholder")}
            disabled={pending}
            errorMessage={errors.season?.message}
          />
          <FormField
            {...register("competition")}
            id="competition"
            label={t("footballData.seasonStats.competitionLabel")}
            placeholder={t("footballData.seasonStats.competitionPlaceholder")}
            disabled={pending}
            errorMessage={errors.competition?.message}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            {...register("team")}
            id="team"
            label={t("footballData.seasonStats.teamLabel")}
            placeholder={t("footballData.seasonStats.teamPlaceholder")}
            disabled={pending}
            errorMessage={errors.team?.message}
          />
          <div className="grid grid-cols-4 gap-4">
            {([
              { name: "matches", label: t("footballData.seasonStats.fieldMatches") },
              { name: "starts", label: t("footballData.seasonStats.fieldStarts") },
              { name: "goals", label: t("footballData.seasonStats.fieldGoals") },
              { name: "assists", label: t("footballData.seasonStats.fieldAssists") },
            ] as const).map((field) => (
              <FormField
                key={field.name}
                {...register(field.name)}
                id={field.name}
                type="number"
                min={0}
                label={field.label}
                disabled={pending}
                errorMessage={errors[field.name]?.message}
              />
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            {...register("minutes")}
            id="minutes"
            type="number"
            min={0}
            label={t("footballData.seasonStats.minutesLabel")}
            disabled={pending}
            errorMessage={errors.minutes?.message}
          />
          <FormField
            {...register("yellowCards")}
            id="yellowCards"
            type="number"
            min={0}
            label={t("footballData.seasonStats.yellowCardsLabel")}
            disabled={pending || !!hasPendingOverallParams}
            errorMessage={errors.yellowCards?.message}
          />
          <FormField
            {...register("redCards")}
            id="redCards"
            type="number"
            min={0}
            label={t("footballData.seasonStats.redCardsLabel")}
            disabled={pending || !!hasPendingOverallParams}
            errorMessage={errors.redCards?.message}
          />
        </div>

        {status ? <FormStatus status={status} /> : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex items-center rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending || !!hasPendingOverallParams}
          >
            {pending ? t("common.saving") : editingId ? t("footballData.seasonStats.updateDraft") : t("footballData.seasonStats.addSeason")}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={cancelEditing}
              className="inline-flex items-center rounded-md border border-white/[0.08] px-4 py-2 text-sm font-semibold text-bh-fg-2 transition hover:border-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={pending || !!hasPendingOverallParams}
            >
              {t("common.cancelEditing")}
            </button>
          ) : null}
        </div>
      </form>

      {draftsCount > 0 && !hasPendingOverallParams ? (
        <div className="rounded-lg border border-primary/40 bg-bh-surface-1/40 p-5 mt-8 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-2">{t("footballData.seasonStats.submitPanelTitle")}</h3>
          <p className="text-sm text-bh-fg-2 mb-4">
            {draftsCount === 1
              ? t("footballData.seasonStats.submitPanelLeadOne", { count: draftsCount })
              : t("footballData.seasonStats.submitPanelLeadOther", { count: draftsCount })}
          </p>
          <textarea
            className="w-full rounded-md border border-white/[0.08] bg-bh-black px-3 py-2 text-sm text-bh-fg-1 placeholder:text-bh-fg-4 focus:outline-none focus:ring-1 focus:ring-bh-lime/30 mb-4"
            rows={3}
            placeholder={t("footballData.seasonStats.submitNotePlaceholder")}
            value={submissionNote}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSubmissionNote(e.target.value)}
            disabled={pending}
          />
          {submissionStatus ? <div className="mb-4"><FormStatus status={submissionStatus} /></div> : null}
          <Button
            onPress={handleSubmitRevision}
            isLoading={pending}
            isDisabled={pending}
            className={bhButtonClass({ variant: "lime", size: "md", className: "w-full" })}
          >
            {pending ? t("footballData.seasonStats.sending") : t("footballData.seasonStats.submitToQa")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function reflectValidationErrors(
  error: z.ZodError<SeasonStatMutationInput>,
  setError: UseFormSetError<FormValues>,
  setStatus: (status: StatusState) => void,
  reviewMessage: string,
) {
  const fieldErrors = error.flatten().fieldErrors;
  const visibleMessages: string[] = [];
  (Object.entries(fieldErrors) as Array<[keyof SeasonStatMutationInput, string[] | undefined]>).forEach(
    ([field, messages]) => {
      if (!messages || messages.length === 0) return;
      if (field === "playerId" || field === "id") return;
      setError(field as keyof FormValues, { type: "manual", message: messages[0] });
      visibleMessages.push(messages[0]);
    },
  );
  setStatus({
    type: "error",
    message: visibleMessages.length > 0 ? visibleMessages.join(" · ") : reviewMessage,
  });
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-bh-danger">{message}</p>;
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
