"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import StepHeader from "./StepHeader";
import Step1Identity, { type Step1Data as S1 } from "./Step1Identity";
import Step2Career, { type Step2Data } from "./Step2Career";
import Step3Verify from "./Step3Verify";

export default function CoachApplyFlow({
  userEmail,
}: {
  // Resolved server-side from the route page (RSC) — same rationale as the
  // player flow: avoid pulling @supabase/ssr into the client bundle and a
  // flash of empty email on initial render.
  userEmail: string | null;
}) {
  const router = useRouter();

  const [activeStep, setActiveStep] = React.useState<1 | 2 | 3>(1);
  const [maxStepUnlocked, setMaxStepUnlocked] = React.useState<1 | 2 | 3>(1);

  const [s1, setS1] = React.useState<S1 | null>(null);
  const [s2, setS2] = React.useState<Step2Data | null>(null);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-6 sm:p-8">
      <StepHeader activeStep={activeStep} maxStepUnlocked={maxStepUnlocked} />

      {activeStep === 1 && (
        <Step1Identity
          userEmail={userEmail}
          defaultValue={s1 ?? undefined}
          onBack={() => router.push("/onboarding/start")}
          onNext={(data) => {
            setS1(data);
            setActiveStep(2);
            setMaxStepUnlocked((p) => (p < 2 ? 2 : p));
          }}
        />
      )}

      {activeStep === 2 && (
        <Step2Career
          // El picker NO recibe applicationId a propósito: TeamPickerCombo
          // dispara el RPC player-only `request_team_from_application` (apunta a
          // player_applications) que fallaría con un id de coach. El team
          // propuesto lo resuelve la submit API (proposed_team_*) +
          // materialize_coach_career_from_application al aprobar.
          defaultValue={s2 ?? undefined}
          onBack={() => setActiveStep(1)}
          onNext={(data) => {
            setS2(data);
            setActiveStep(3);
            setMaxStepUnlocked((p) => (p < 3 ? 3 : p));
          }}
        />
      )}

      {activeStep === 3 && s1 && s2 && (
        <Step3Verify
          step1={s1}
          step2={s2}
          onBack={() => setActiveStep(2)}
          onSent={(_applicationId) => {
            router.replace("/dashboard?applied=1");
          }}
        />
      )}
    </div>
  );
}
