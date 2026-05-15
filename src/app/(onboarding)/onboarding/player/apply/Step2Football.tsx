"use client";

import * as React from "react";
import { Form, Button } from "@heroui/react";
import TeamPickerCombo, { type TeamPickerValue } from "@/components/teams/TeamPickerCombo";
import CareerEditor, { type CareerItemInput } from "@/components/career/CareerEditor";
import FormField from "@/components/dashboard/client/FormField";

export type Step2Data = {
  freeAgent: boolean;
  team: TeamPickerValue;
  career: CareerItemInput[];
  transfermarkt?: string | null;
  besoccer?: string | null;
  social?: string | null;
};

const URL_RE = /^https?:\/\/[^ "]+$/i;

export default function Step2Football({
  applicationId,
  defaultValue,
  onBack,
  onNext,
}: {
  applicationId?: string;
  defaultValue?: Partial<Step2Data>;
  onBack: () => void;
  onNext: (data: Step2Data) => void;
}) {
  const [freeAgent, setFreeAgent] = React.useState<boolean>(!!defaultValue?.freeAgent);
  const [team, setTeam] = React.useState<TeamPickerValue>(defaultValue?.team ?? null);
  const [career, setCareer] = React.useState<CareerItemInput[]>(defaultValue?.career ?? []);
  const [tm, setTm] = React.useState(defaultValue?.transfermarkt ?? "");
  const [bs, setBs] = React.useState(defaultValue?.besoccer ?? "");
  const [sc, setSc] = React.useState(defaultValue?.social ?? "");

  const [touched, setTouched] = React.useState<{ team?: boolean; tm?: boolean; bs?: boolean; sc?: boolean }>({});

  // Mantener referencia a la fila ligada al “Club actual”
  const currentRowIdRef = React.useRef<string | null>(null);

  // 🔁 Sincroniza SIEMPRE la fila de trayectoria con el “Club actual”
  React.useEffect(() => {
    setCareer((prev) => {
      let rows = [...prev];

      const hasCurrentTeam = !!team && team.mode !== "free";

      // 1) Si NO hay club actual, eliminamos cualquier fila marcada como source:"current"
      if (!hasCurrentTeam) {
        rows = rows.filter((r) => r.source !== "current");
        currentRowIdRef.current = null;
        return rows;
      }

      // 2) Construimos/actualizamos la fila "current"
      const base: CareerItemInput = {
        id: currentRowIdRef.current ?? crypto.randomUUID(),
        club: team!.mode === "approved" ? team!.teamName : team!.name,
        division: null,
        start_year: rows.find((r) => r.id === currentRowIdRef.current)?.start_year ?? null, // conserva lo escrito
        end_year: null, // “Actual”
        team_id: team!.mode === "approved" ? team!.teamId : null,
        team_meta:
          team!.mode === "approved"
            ? {
              slug: undefined,
              country_code: team!.countryCode ?? null,
              // 👇 crest real del picker (nuevo en TeamPickerCombo)
              crest_url: (team as any).teamCrest ?? undefined,
            }
            : null,
        proposed:
          team!.mode === "new"
            ? {
              country: team!.countryCode
                ? { code: team!.countryCode, name: team!.country ?? team!.countryCode }
                : null,
              tmUrl: team!.tmUrl ?? null,
            }
            : null,
        confirmed: rows.find((r) => r.id === currentRowIdRef.current)?.confirmed ?? false,
        lockEnd: true,     // Hasta = Actual (bloqueado)
        lockDelete: true,  // no se puede borrar si existe “Club actual”
        source: "current",
      };

      const id = base.id;
      const idx = rows.findIndex((r) => r.id === id);

      if (idx === -1) {
        currentRowIdRef.current = id;
        return [base, ...rows];
      } else {
        rows[idx] = { ...rows[idx], ...base };
        currentRowIdRef.current = id;
        return rows;
      }
    });
    // Dependencias: cualquier cambio relevante del picker
  }, [
    freeAgent,
    // ‘team’ puede ser null, free, approved o new
    (team && team.mode) || null,
    (team && (team as any).teamId) || null,
    (team && (team as any).teamName) || null,
    (team && (team as any).name) || null,
    (team && (team as any).country) || null,
    (team && (team as any).countryCode) || null,
    (team && (team as any).tmUrl) || null,
    (team && (team as any).teamCrest) || null,
  ]);

  // ───────────────── VALIDACIONES ─────────────────
  const teamInvalid =
    !!touched.team &&
    !freeAgent &&
    !(team && (team.mode === "approved" || team.mode === "new"));

  const tmInvalid = !!touched.tm && !!tm && !URL_RE.test(tm);
  const bsInvalid = !!touched.bs && !!bs && !URL_RE.test(bs);
  const scInvalid = !!touched.sc && !!sc && !URL_RE.test(sc);

  function handleNext() {
    setTouched((t) => ({ ...t, team: true, tm: true, bs: true, sc: true }));

    const isTeamOk = freeAgent || (team && (team.mode === "approved" || team.mode === "new"));
    if (!isTeamOk) return;

    let teamOut: TeamPickerValue | null = null;

    if (freeAgent) {
      teamOut = { mode: "free" };
    } else if (team?.mode === "approved") {
      teamOut = {
        mode: "approved",
        teamId: team.teamId,
        teamName: team.teamName,
        country: team.country ?? null,
        countryCode: team.countryCode ?? null,
        // Nota: si querés persistir crest en otra tabla, podés llevar (team as any).teamCrest
      };
    } else if (team?.mode === "new") {
      teamOut = {
        mode: "new",
        name: team.name,
        country: team.country ?? null,
        countryCode: team.countryCode ?? null,
        tmUrl: team.tmUrl ?? null,
      };
    }

    onNext({
      freeAgent,
      team: teamOut,
      career,
      transfermarkt: tm?.trim() || null,
      besoccer: bs?.trim() || null,
      social: sc?.trim() || null,
    });
  }

  return (
    <div className="space-y-6">
      <Form className="grid gap-6">
        <div className="grid gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
          <TeamPickerCombo
            applicationId={applicationId}
            defaultValue={team}
            isFreeAgent={freeAgent}
            onFreeAgentChange={(v) => {
              setFreeAgent(v);
              setTouched((t) => ({ ...t, team: true }));
            }}
            onChange={(v) => {
              setTeam(v);
            }}
            isInvalid={teamInvalid}
            errorMessage="Seleccioná un club o marcá que sos jugador libre."
          />
        </div>

        <CareerEditor
          items={career}
          onChange={setCareer}
          optional
          onRequestRemoveCurrent={() => {
            setTeam(null);
          }}
          showCurrentToggle={false}
        />

        <div className="grid gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
          <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
            Perfiles externos <span className="text-bh-fg-4">(opcional)</span>
          </h3>
          <div className="grid auto-rows-fr gap-3 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            <FormField
              id="bh-tm"
              label="Transfermarkt"
              placeholder="https://www.transfermarkt.com/..."
              value={tm}
              onChange={(e) => setTm(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, tm: true }))}
              isInvalid={tmInvalid}
              errorMessage="Ingresá una URL válida (https://...)."
            />
            <FormField
              id="bh-bs"
              label="BeSoccer"
              placeholder="https://es.besoccer.com/..."
              value={bs}
              onChange={(e) => setBs(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, bs: true }))}
              isInvalid={bsInvalid}
              errorMessage="Ingresá una URL válida (https://...)."
            />
            <FormField
              id="bh-sc"
              label="Red social"
              placeholder="https://www.instagram.com/tuusuario"
              value={sc}
              onChange={(e) => setSc(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, sc: true }))}
              isInvalid={scInvalid}
              errorMessage="Ingresá una URL válida (https://...)."
            />
          </div>
        </div>

        <div className="flex justify-between">
          <Button
            variant="flat"
            onPress={onBack}
            className="rounded-bh-md border border-bh-fg-4 bg-transparent px-5 py-2 text-[13px] font-medium text-bh-fg-2 transition-colors duration-150 hover:border-bh-fg-3 hover:bg-white/[0.06] hover:text-bh-fg-1"
          >
            Volver
          </Button>
          <Button
            onPress={handleNext}
            className="rounded-bh-md bg-bh-lime px-5 py-2 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
          >
            Ir a verificación
          </Button>
        </div>
      </Form>
    </div>
  );
}
