"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Form, Button } from "@heroui/react";
import TeamPickerCombo, { type TeamPickerValue } from "@/components/teams/TeamPickerCombo";
import FormField from "@/components/dashboard/client/FormField";
import CareerEditor, { type CareerItemInput } from "@/components/career/CareerEditor";

// Licencia declarada por el staff: { title, issuer, year }. Es coach-only (no
// tiene análogo en el flujo de players) → se mantiene tal cual.
export type CoachLicenseDraft = {
  id: string;
  title: string;
  issuer: string;
  year: number | null;
};

export type Step2Data = {
  freeAgent: boolean;
  team: TeamPickerValue;
  // Trayectoria profesional (etapas): reusa el shape compartido de players
  // (`CareerItemInput` = RowDraft) para que team_id / proposed / roles /
  // division_id / experience_kind fluyan al submit (que ya los consume).
  career: CareerItemInput[];
  licenses: CoachLicenseDraft[];
  transfermarkt?: string | null;
  externalProfile?: string | null;
};

const URL_RE = /^https?:\/\/[^ "]+$/i;
const newLicense = (): CoachLicenseDraft => ({
  id: crypto.randomUUID(),
  title: "",
  issuer: "",
  year: null,
});

export default function Step2Career({
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
  const t = useTranslations("onboarding");

  const [freeAgent, setFreeAgent] = React.useState<boolean>(!!defaultValue?.freeAgent);
  const [team, setTeam] = React.useState<TeamPickerValue>(defaultValue?.team ?? null);
  const [career, setCareer] = React.useState<CareerItemInput[]>(defaultValue?.career ?? []);
  const [licenses, setLicenses] = React.useState<CoachLicenseDraft[]>(defaultValue?.licenses ?? []);
  const [tm, setTm] = React.useState(defaultValue?.transfermarkt ?? "");
  const [ext, setExt] = React.useState(defaultValue?.externalProfile ?? "");

  const [touched, setTouched] = React.useState<{ team?: boolean; tm?: boolean; ext?: boolean }>({});

  // ───────────────── VALIDACIONES ─────────────────
  const teamInvalid =
    !!touched.team &&
    !freeAgent &&
    !(team && (team.mode === "approved" || team.mode === "new"));

  const tmInvalid = !!touched.tm && !!tm && !URL_RE.test(tm);
  const extInvalid = !!touched.ext && !!ext && !URL_RE.test(ext);

  // ───────────────── editores de licencias ─────────────────
  function patchLicense(id: string, patch: Partial<CoachLicenseDraft>) {
    setLicenses((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function removeLicense(id: string) {
    setLicenses((prev) => prev.filter((l) => l.id !== id));
  }

  function handleNext() {
    setTouched((prev) => ({ ...prev, team: true, tm: true, ext: true }));

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

    // Descartamos etapas/licencias vacías antes de enviar.
    const cleanCareer = career.filter((s) => (s.club ?? "").trim().length > 0);
    const cleanLicenses = licenses.filter((l) => l.title.trim().length > 0);

    onNext({
      freeAgent,
      team: teamOut,
      career: cleanCareer,
      licenses: cleanLicenses,
      transfermarkt: tm?.trim() || null,
      externalProfile: ext?.trim() || null,
    });
  }

  return (
    <div className="space-y-6">
      <Form className="grid gap-6">
        {/* Club / equipo actual + agente libre */}
        <div className="grid gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
          <TeamPickerCombo
            applicationId={applicationId}
            defaultValue={team}
            isFreeAgent={freeAgent}
            onFreeAgentChange={(v) => {
              setFreeAgent(v);
              setTouched((prev) => ({ ...prev, team: true }));
            }}
            onChange={(v) => setTeam(v)}
            isInvalid={teamInvalid}
            errorMessage={t("coachApply.step2.teamError")}
          />
        </div>

        {/* Trayectoria profesional: reusa el CareerEditor de players con el
            selector de "tipo de experiencia" (club / trabajo / proyecto) + roles
            estructurados por etapa. Overlaps permitidos (warning no-bloqueante).
            Sin el "Cargo" libre por etapa (legacy, ya cubierto por roles[]). */}
        <CareerEditor
          items={career}
          onChange={setCareer}
          optional
          showCurrentToggle={false}
          showRoles
          showExperienceKind
          allowOverlap
          onRequestRemoveCurrent={() => setTeam(null)}
        />

        {/* Licencias declaradas */}
        <div className="grid gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
          <div>
            <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
              {t("coachApply.step2.licensesTitle")}{" "}
              <span className="text-bh-fg-4">{t("coachApply.step2.optional")}</span>
            </h3>
            <p className="mt-1 text-[12px] text-bh-fg-3">{t("coachApply.step2.licensesSubtitle")}</p>
          </div>

          {licenses.length === 0 ? (
            <p className="text-[12px] text-bh-fg-4">{t("coachApply.step2.licensesEmpty")}</p>
          ) : (
            <div className="grid gap-4">
              {licenses.map((lic) => (
                <div
                  key={lic.id}
                  className="grid gap-3 rounded-bh-md border border-white/[0.06] bg-transparent p-4"
                >
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="flat"
                      onPress={() => removeLicense(lic.id)}
                      className="h-7 rounded-bh-md border border-white/[0.08] bg-transparent px-3 text-[12px] text-bh-fg-3 hover:border-bh-danger hover:text-bh-danger"
                    >
                      {t("coachApply.step2.removeLicense")}
                    </Button>
                  </div>
                  <div className="grid auto-rows-fr gap-3 grid-cols-1 sm:grid-cols-3">
                    <FormField
                      id={`lic-title-${lic.id}`}
                      isRequired
                      label={t("coachApply.step2.licenseTitle")}
                      placeholder={t("coachApply.step2.licenseTitlePlaceholder")}
                      value={lic.title}
                      onChange={(e) => patchLicense(lic.id, { title: e.target.value })}
                    />
                    <FormField
                      id={`lic-issuer-${lic.id}`}
                      label={t("coachApply.step2.licenseIssuer")}
                      placeholder={t("coachApply.step2.licenseIssuerPlaceholder")}
                      value={lic.issuer}
                      onChange={(e) => patchLicense(lic.id, { issuer: e.target.value })}
                    />
                    <FormField
                      id={`lic-year-${lic.id}`}
                      type="number"
                      label={t("coachApply.step2.licenseYear")}
                      placeholder={t("coachApply.step2.licenseYearPlaceholder")}
                      value={lic.year != null ? String(lic.year) : ""}
                      onChange={(e) =>
                        patchLicense(lic.id, {
                          year: e.target.value ? Number(e.target.value) : null,
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
            onPress={() => setLicenses((prev) => [...prev, newLicense()])}
            className="w-full rounded-bh-md border border-dashed border-white/[0.12] bg-transparent py-2 text-[13px] font-medium text-bh-fg-2 transition-colors duration-150 hover:border-white/[0.24] hover:text-bh-fg-1"
          >
            {t("coachApply.step2.addLicense")}
          </Button>
        </div>

        {/* Perfiles externos */}
        <div className="grid gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
          <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
            {t("coachApply.step2.externalProfiles")}{" "}
            <span className="text-bh-fg-4">{t("coachApply.step2.optional")}</span>
          </h3>
          <div className="grid auto-rows-fr gap-3 grid-cols-1 sm:grid-cols-2">
            <FormField
              id="bh-tm"
              label={t("coachApply.step2.transfermarktLabel")}
              placeholder={t("coachApply.step2.transfermarktPlaceholder")}
              value={tm}
              onChange={(e) => setTm(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, tm: true }))}
              isInvalid={tmInvalid}
              errorMessage={t("coachApply.step2.urlError")}
            />
            <FormField
              id="bh-ext"
              label={t("coachApply.step2.externalLabel")}
              placeholder={t("coachApply.step2.externalPlaceholder")}
              value={ext}
              onChange={(e) => setExt(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, ext: true }))}
              isInvalid={extInvalid}
              errorMessage={t("coachApply.step2.urlError")}
            />
          </div>
        </div>

        <div className="flex justify-between">
          <Button
            variant="flat"
            onPress={onBack}
            className="rounded-bh-md border border-bh-fg-4 bg-transparent px-5 py-2 text-[13px] font-medium text-bh-fg-2 transition-colors duration-150 hover:border-bh-fg-3 hover:bg-white/[0.06] hover:text-bh-fg-1"
          >
            {t("coachApply.step2.back")}
          </Button>
          <Button
            onPress={handleNext}
            className="rounded-bh-md bg-bh-lime px-5 py-2 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
          >
            {t("coachApply.step2.next")}
          </Button>
        </div>
      </Form>
    </div>
  );
}
