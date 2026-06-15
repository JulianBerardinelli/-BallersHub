"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import FormField from "@/components/dashboard/client/FormField";
import {
  submitCoachCareerRevision,
  cancelCoachCareerRevision,
} from "@/app/actions/coach-career";
import { profileNotification, useNotificationContext } from "@/modules/notifications";

export type CoachCareerStage = {
  id: string;
  originalId: string | null;
  club: string;
  roleTitle: string;
  division: string;
  startYear: number | null;
  endYear: number | null;
};

export type CoachSeasonStat = {
  id: string;
  originalStatId: string | null;
  season: string;
  competition: string;
  team: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
};

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

const newStage = (): CoachCareerStage => ({
  id: crypto.randomUUID(),
  originalId: null,
  club: "",
  roleTitle: "",
  division: "",
  startYear: null,
  endYear: null,
});

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

const numFromInput = (v: string): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 0;
};

export default function CoachCareerManager({
  coachId,
  coachName,
  career,
  stats,
  latestRequest,
}: {
  coachId: string;
  coachName: string;
  career: CoachCareerStage[];
  stats: CoachSeasonStat[];
  latestRequest: CoachCareerRequestSnapshot | null;
}) {
  const router = useRouter();
  const { enqueue } = useNotificationContext();
  const isLocked = latestRequest?.status === "pending";

  const [items, setItems] = React.useState<CoachCareerStage[]>(career);
  const [seasons, setSeasons] = React.useState<CoachSeasonStat[]>(stats);
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  function patchStage(id: string, patch: Partial<CoachCareerStage>) {
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function patchStat(id: string, patch: Partial<CoachSeasonStat>) {
    setSeasons((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function onSubmit() {
    setSaving(true);
    setMsg(null);
    try {
      const cleanItems = items.filter((s) => s.club.trim().length > 0);
      const cleanSeasons = seasons.filter((s) => s.season.trim().length > 0);
      if (cleanItems.length === 0 && cleanSeasons.length === 0) {
        setMsg({ ok: false, text: "Agregá al menos una etapa o una temporada." });
        setSaving(false);
        return;
      }
      const res = await submitCoachCareerRevision({
        coachId,
        note: note || null,
        items: cleanItems.map((s) => ({
          originalId: s.originalId,
          club: s.club,
          roleTitle: s.roleTitle || null,
          division: s.division || null,
          startYear: s.startYear,
          endYear: s.endYear,
        })),
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
          text: "Solicitud enviada. El equipo va a revisar tu trayectoria antes de publicarla.",
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
          {coachName} · los cambios se publican tras la revisión del equipo.
        </p>
      </div>

      {latestRequest?.status === "pending" && (
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
      {latestRequest?.status === "approved" && (
        <Banner tone="success">
          <p className="font-semibold text-bh-success">Tu última solicitud fue aprobada ✓</p>
          {latestRequest.resolutionNote && (
            <p className="text-bh-fg-2">{latestRequest.resolutionNote}</p>
          )}
        </Banner>
      )}
      {latestRequest?.status === "rejected" && (
        <Banner tone="danger">
          <p className="font-semibold text-bh-danger">Tu última solicitud fue rechazada</p>
          {latestRequest.resolutionNote && (
            <p className="text-bh-fg-2">Motivo: {latestRequest.resolutionNote}</p>
          )}
          <p className="text-bh-fg-3">Corregí lo señalado y volvé a enviar.</p>
        </Banner>
      )}

      {/* ───────── Career stages ───────── */}
      <section className="grid gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
        <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          Clubes dirigidos
        </h3>
        {items.length === 0 ? (
          <p className="text-[12px] text-bh-fg-4">Todavía no cargaste etapas de tu trayectoria.</p>
        ) : (
          <div className="grid gap-4">
            {items.map((stage) => (
              <div
                key={stage.id}
                className="grid gap-3 rounded-bh-md border border-white/[0.06] bg-transparent p-4"
              >
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="flat"
                    isDisabled={isLocked}
                    onPress={() => setItems((prev) => prev.filter((s) => s.id !== stage.id))}
                    className="h-7 rounded-bh-md border border-white/[0.08] bg-transparent px-3 text-[12px] text-bh-fg-3 hover:border-bh-danger hover:text-bh-danger"
                  >
                    Quitar
                  </Button>
                </div>
                <div className="grid auto-rows-fr gap-3 grid-cols-1 sm:grid-cols-2">
                  <FormField
                    id={`stage-club-${stage.id}`}
                    isRequired
                    disabled={isLocked}
                    label="Club"
                    placeholder="Ej: Club Atlético River Plate"
                    value={stage.club}
                    onChange={(e) => patchStage(stage.id, { club: e.target.value })}
                  />
                  <FormField
                    id={`stage-role-${stage.id}`}
                    disabled={isLocked}
                    label="Cargo"
                    placeholder="Ej: Director Técnico"
                    value={stage.roleTitle}
                    onChange={(e) => patchStage(stage.id, { roleTitle: e.target.value })}
                  />
                </div>
                <div className="grid auto-rows-fr gap-3 grid-cols-1 sm:grid-cols-3">
                  <FormField
                    id={`stage-division-${stage.id}`}
                    disabled={isLocked}
                    label="División / categoría"
                    placeholder="Ej: Primera División"
                    value={stage.division}
                    onChange={(e) => patchStage(stage.id, { division: e.target.value })}
                  />
                  <FormField
                    id={`stage-start-${stage.id}`}
                    type="number"
                    disabled={isLocked}
                    label="Año inicio"
                    placeholder="2019"
                    value={stage.startYear != null ? String(stage.startYear) : ""}
                    onChange={(e) =>
                      patchStage(stage.id, {
                        startYear: e.target.value ? numFromInput(e.target.value) : null,
                      })
                    }
                  />
                  <FormField
                    id={`stage-end-${stage.id}`}
                    type="number"
                    disabled={isLocked}
                    label="Año fin"
                    placeholder="2022"
                    value={stage.endYear != null ? String(stage.endYear) : ""}
                    onChange={(e) =>
                      patchStage(stage.id, {
                        endYear: e.target.value ? numFromInput(e.target.value) : null,
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        <Button
          variant="flat"
          isDisabled={isLocked}
          onPress={() => setItems((prev) => [...prev, newStage()])}
          className="w-full rounded-bh-md border border-dashed border-white/[0.12] bg-transparent py-2 text-[13px] font-medium text-bh-fg-2 transition-colors duration-150 hover:border-white/[0.24] hover:text-bh-fg-1"
        >
          + Agregar etapa
        </Button>
      </section>

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
                  <NumField
                    id={`stat-matches-${stat.id}`}
                    label="PJ"
                    disabled={isLocked}
                    value={stat.matches}
                    onChange={(n) => patchStat(stat.id, { matches: n })}
                  />
                  <NumField
                    id={`stat-wins-${stat.id}`}
                    label="PG"
                    disabled={isLocked}
                    value={stat.wins}
                    onChange={(n) => patchStat(stat.id, { wins: n })}
                  />
                  <NumField
                    id={`stat-draws-${stat.id}`}
                    label="PE"
                    disabled={isLocked}
                    value={stat.draws}
                    onChange={(n) => patchStat(stat.id, { draws: n })}
                  />
                  <NumField
                    id={`stat-losses-${stat.id}`}
                    label="PP"
                    disabled={isLocked}
                    value={stat.losses}
                    onChange={(n) => patchStat(stat.id, { losses: n })}
                  />
                  <NumField
                    id={`stat-gf-${stat.id}`}
                    label="GF"
                    disabled={isLocked}
                    value={stat.goalsFor}
                    onChange={(n) => patchStat(stat.id, { goalsFor: n })}
                  />
                  <NumField
                    id={`stat-ga-${stat.id}`}
                    label="GC"
                    disabled={isLocked}
                    value={stat.goalsAgainst}
                    onChange={(n) => patchStat(stat.id, { goalsAgainst: n })}
                  />
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
      {!isLocked && (
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
          Enviar a revisión
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
