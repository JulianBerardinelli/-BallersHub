"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import FormField from "@/components/dashboard/client/FormField";
import CareerEditor, { type CareerItemInput } from "@/components/career/CareerEditor";
import {
  submitCoachCareerRevision,
  cancelCoachCareerRevision,
} from "@/app/actions/coach-career";
import { profileNotification, useNotificationContext } from "@/modules/notifications";
import type { CoachEditorStage, CoachEditorStat } from "@/lib/coach/career-data";

// Rich stage/stat shapes are owned by the shared loader so the dashboard + admin
// pages feed identical data into this reused editor.
export type CoachCareerStage = CoachEditorStage;
export type CoachSeasonStat = CoachEditorStat;

export type CoachCareerRequestSnapshot = {
  id: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  submittedAt: string | null;
  reviewedAt: string | null;
  note: string | null;
  resolutionNote: string | null;
  pendingStageCount: number;
  pendingStatCount: number;
};

type AugmentedCareerItem = CareerItemInput & { originalId?: string | null };

// coach stage → the shared CareerEditor's controlled row. An open-ended stage
// (no end year) is the "current" club; existing rows load confirmed (collapsed).
function toEditorItem(stage: CoachEditorStage): AugmentedCareerItem {
  // "Current" = an ongoing stage (real start, no end). A fully-undated legacy
  // row (no start AND no end) is NOT current — keep it a plain manual stage so
  // it doesn't lock the end field nor seed current_club from a dateless row.
  const isCurrent = stage.endYear === null && stage.startYear !== null;
  return {
    id: stage.id,
    originalId: stage.originalId,
    club: stage.team?.name ?? stage.club ?? "",
    role_title: stage.roleTitle ?? null,
    division: stage.division ?? null,
    division_id: stage.divisionId ?? null,
    secondary_division: stage.secondaryDivision ?? null,
    secondary_division_id: stage.secondaryDivisionId ?? null,
    secondary_division_meta: null,
    start_year: stage.startYear,
    end_year: stage.endYear,
    team_id: stage.team?.id ?? null,
    team_meta: stage.team
      ? { slug: null, country_code: stage.team.countryCode, crest_url: stage.team.crestUrl }
      : null,
    proposed: null,
    confirmed: true,
    lockEnd: isCurrent,
    source: isCurrent ? "current" : "manual",
  };
}

function mapItemToPayload(item: AugmentedCareerItem) {
  return {
    originalId: item.originalId ?? null,
    club: item.club,
    roleTitle: item.role_title ?? null,
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
          countryCode: item.proposed.country?.code ?? null,
          countryName: item.proposed.country?.name ?? null,
          transfermarktUrl: item.proposed.tmUrl ?? null,
        }
      : null,
  };
}

const newStat = (): CoachSeasonStat => ({
  id: crypto.randomUUID(),
  originalStatId: null,
  season: "",
  competition: "",
  team: "",
  matches: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
});

export default function CoachCareerManager({
  coachId,
  coachName,
  career,
  stats,
  latestRequest,
  submitAction = submitCoachCareerRevision,
  liveMode = false,
}: {
  coachId: string;
  coachName: string;
  career: CoachCareerStage[];
  stats: CoachSeasonStat[];
  latestRequest: CoachCareerRequestSnapshot | null;
  /** Submit action — defaults to the moderated revision flow. Admin injects a
   *  service-role live-write with the same input shape. */
  submitAction?: typeof submitCoachCareerRevision;
  /** Admin live mode: no revision lockout/banners/note, writes apply directly. */
  liveMode?: boolean;
}) {
  const router = useRouter();
  const { enqueue } = useNotificationContext();
  const isLocked = !liveMode && latestRequest?.status === "pending";

  const [items, setItems] = React.useState<AugmentedCareerItem[]>(() => career.map(toEditorItem));
  const [seasons, setSeasons] = React.useState<CoachSeasonStat[]>(stats);
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  function patchStat(id: string, patch: Partial<CoachSeasonStat>) {
    setSeasons((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function onSubmit() {
    setSaving(true);
    setMsg(null);
    try {
      // Block submit while a stage is still open (unconfirmed) with content.
      const openDraft = items.find(
        (i) => !i.confirmed && (i.club.trim().length > 0 || i.start_year != null),
      );
      if (openDraft) {
        setMsg({ ok: false, text: "Confirmá las etapas abiertas antes de guardar." });
        setSaving(false);
        return;
      }

      const cleanItems = items.filter((i) => i.confirmed && i.club.trim().length > 0);
      const cleanSeasons = seasons.filter((s) => s.season.trim().length > 0);
      if (cleanItems.length === 0 && cleanSeasons.length === 0) {
        setMsg({ ok: false, text: "Agregá al menos una etapa o una temporada." });
        setSaving(false);
        return;
      }

      const res = await submitAction({
        coachId,
        note: note || null,
        items: cleanItems.map(mapItemToPayload),
        stats: cleanSeasons.map((s) => ({
          originalStatId: s.originalStatId,
          season: s.season,
          competition: s.competition || null,
          team: s.team || null,
          matches: s.matches,
          wins: s.wins,
          draws: s.draws,
          losses: s.losses,
          goalsFor: s.goalsFor,
          goalsAgainst: s.goalsAgainst,
        })),
      });
      if (res.success) {
        setMsg({
          ok: true,
          text: liveMode
            ? "Trayectoria actualizada. Se reflejó en la página pública."
            : "Solicitud enviada. El equipo va a revisar tu trayectoria antes de publicarla.",
        });
        enqueue(
          profileNotification.updated({
            sectionLabel: "Trayectoria del entrenador",
            changedFields: [],
          }),
        );
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.message ?? "No se pudo enviar." });
      }
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Error inesperado." });
    } finally {
      setSaving(false);
    }
  }

  async function onCancel() {
    if (!latestRequest) return;
    setSaving(true);
    const res = await cancelCoachCareerRevision(latestRequest.id);
    setSaving(false);
    if (res.success) {
      setMsg({ ok: true, text: "Solicitud cancelada. Ya podés editar de nuevo." });
      router.refresh();
    } else {
      setMsg({ ok: false, text: res.message ?? "No se pudo cancelar." });
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-bh-display text-xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          Trayectoria y estadísticas
        </h2>
        <p className="text-sm text-bh-fg-3">
          {coachName} ·{" "}
          {liveMode
            ? "edición directa: los cambios se publican al instante."
            : "los cambios se publican tras la revisión del equipo."}
        </p>
      </div>

      {!liveMode && latestRequest?.status === "pending" && (
        <Banner tone="warning">
          <p className="font-semibold text-bh-warning">Solicitud en revisión</p>
          <p className="text-bh-fg-2">
            Enviaste {latestRequest.pendingStageCount} etapa(s) y {latestRequest.pendingStatCount}{" "}
            temporada(s). El editor está bloqueado hasta que el equipo responda.
          </p>
          {latestRequest.note && <p className="text-bh-fg-3">Tu nota: {latestRequest.note}</p>}
          <div className="pt-1">
            <Button
              size="sm"
              variant="flat"
              isDisabled={saving}
              onPress={onCancel}
              className="h-7 rounded-bh-md border border-white/[0.08] bg-transparent px-3 text-[12px] text-bh-fg-3 hover:border-bh-danger hover:text-bh-danger"
            >
              Cancelar solicitud
            </Button>
          </div>
        </Banner>
      )}
      {!liveMode && latestRequest?.status === "approved" && (
        <Banner tone="success">
          <p className="font-semibold text-bh-success">Tu última solicitud fue aprobada ✓</p>
          {latestRequest.resolutionNote && (
            <p className="text-bh-fg-2">{latestRequest.resolutionNote}</p>
          )}
        </Banner>
      )}
      {!liveMode && latestRequest?.status === "rejected" && (
        <Banner tone="danger">
          <p className="font-semibold text-bh-danger">Tu última solicitud fue rechazada</p>
          {latestRequest.resolutionNote && (
            <p className="text-bh-fg-2">Motivo: {latestRequest.resolutionNote}</p>
          )}
          <p className="text-bh-fg-3">Corregí lo señalado y volvé a enviar.</p>
        </Banner>
      )}

      {/* ───────── Career stages (shared rich editor) ───────── */}
      <CareerEditor
        items={items}
        onChange={(rows) => setItems(rows as AugmentedCareerItem[])}
        optional={false}
        showRole
        readOnly={isLocked}
      />

      {/* ───────── Season stats ───────── */}
      <section className="grid gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
        <div>
          <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
            Estadísticas por temporada
          </h3>
          <p className="mt-1 text-[12px] text-bh-fg-3">
            Partidos dirigidos, resultados y goles. Los porcentajes se calculan automáticamente en tu
            página.
          </p>
        </div>
        {seasons.length === 0 ? (
          <p className="text-[12px] text-bh-fg-4">Todavía no cargaste temporadas.</p>
        ) : (
          <div className="grid gap-4">
            {seasons.map((stat) => (
              <div
                key={stat.id}
                className="grid gap-3 rounded-bh-md border border-white/[0.06] bg-transparent p-4"
              >
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="flat"
                    isDisabled={isLocked}
                    onPress={() => setSeasons((prev) => prev.filter((s) => s.id !== stat.id))}
                    className="h-7 rounded-bh-md border border-white/[0.08] bg-transparent px-3 text-[12px] text-bh-fg-3 hover:border-bh-danger hover:text-bh-danger"
                  >
                    Quitar
                  </Button>
                </div>
                <div className="grid auto-rows-fr gap-3 grid-cols-1 sm:grid-cols-3">
                  <FormField
                    id={`stat-season-${stat.id}`}
                    isRequired
                    disabled={isLocked}
                    label="Temporada"
                    placeholder="2023/24"
                    value={stat.season}
                    onChange={(e) => patchStat(stat.id, { season: e.target.value })}
                  />
                  <FormField
                    id={`stat-team-${stat.id}`}
                    disabled={isLocked}
                    label="Equipo"
                    placeholder="Ej: River Plate"
                    value={stat.team}
                    onChange={(e) => patchStat(stat.id, { team: e.target.value })}
                  />
                  <FormField
                    id={`stat-comp-${stat.id}`}
                    disabled={isLocked}
                    label="Competición"
                    placeholder="Liga Profesional"
                    value={stat.competition}
                    onChange={(e) => patchStat(stat.id, { competition: e.target.value })}
                  />
                </div>
                <div className="grid auto-rows-fr gap-3 grid-cols-3 sm:grid-cols-6">
                  <NumField id={`stat-matches-${stat.id}`} label="PJ" disabled={isLocked} value={stat.matches} onChange={(n) => patchStat(stat.id, { matches: n })} />
                  <NumField id={`stat-wins-${stat.id}`} label="PG" disabled={isLocked} value={stat.wins} onChange={(n) => patchStat(stat.id, { wins: n })} />
                  <NumField id={`stat-draws-${stat.id}`} label="PE" disabled={isLocked} value={stat.draws} onChange={(n) => patchStat(stat.id, { draws: n })} />
                  <NumField id={`stat-losses-${stat.id}`} label="PP" disabled={isLocked} value={stat.losses} onChange={(n) => patchStat(stat.id, { losses: n })} />
                  <NumField id={`stat-gf-${stat.id}`} label="GF" disabled={isLocked} value={stat.goalsFor} onChange={(n) => patchStat(stat.id, { goalsFor: n })} />
                  <NumField id={`stat-ga-${stat.id}`} label="GC" disabled={isLocked} value={stat.goalsAgainst} onChange={(n) => patchStat(stat.id, { goalsAgainst: n })} />
                </div>
              </div>
            ))}
          </div>
        )}
        <Button
          variant="flat"
          isDisabled={isLocked}
          onPress={() => setSeasons((prev) => [...prev, newStat()])}
          className="w-full rounded-bh-md border border-dashed border-white/[0.12] bg-transparent py-2 text-[13px] font-medium text-bh-fg-2 transition-colors duration-150 hover:border-white/[0.24] hover:text-bh-fg-1"
        >
          + Agregar temporada
        </Button>
      </section>

      {/* ───────── Note + submit ───────── */}
      {!isLocked && !liveMode && (
        <section className="grid gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
          <FormField
            id="coach-career-note"
            as="textarea"
            rows={3}
            label="Nota para el revisor (opcional)"
            placeholder="Contexto o links que ayuden a verificar los datos."
            value={note}
            onValueChange={setNote}
          />
        </section>
      )}

      {msg && (
        <p className={`text-sm ${msg.ok ? "text-bh-success" : "text-bh-danger"}`}>{msg.text}</p>
      )}

      <div className="flex justify-end">
        <Button
          onPress={onSubmit}
          isLoading={saving}
          isDisabled={saving || isLocked}
          className="rounded-bh-md bg-bh-lime px-6 py-2 text-[13px] font-semibold text-bh-black hover:bg-[#d8ff26]"
        >
          {liveMode ? "Guardar trayectoria" : "Enviar a revisión"}
        </Button>
      </div>
    </div>
  );
}

function NumField({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  disabled: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <FormField
      id={id}
      type="number"
      label={label}
      disabled={disabled}
      value={String(value)}
      onChange={(e) => {
        const n = Number(e.target.value);
        onChange(Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 0);
      }}
    />
  );
}

type BannerTone = "warning" | "success" | "danger";
function Banner({ tone, children }: { tone: BannerTone; children: React.ReactNode }) {
  const tones: Record<BannerTone, string> = {
    warning: "border-bh-warning/25 bg-bh-warning/5",
    success: "border-bh-success/25 bg-bh-success/5",
    danger: "border-bh-danger/25 bg-bh-danger/5",
  };
  return (
    <div className={`space-y-1 rounded-bh-md border p-4 text-[13px] ${tones[tone]}`}>{children}</div>
  );
}
