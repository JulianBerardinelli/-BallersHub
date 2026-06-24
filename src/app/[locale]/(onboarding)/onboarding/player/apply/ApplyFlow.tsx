"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import StepHeader from "./StepHeader";
import Step1Personal from "./Step1Personal";
import Step2Football, { type Step2Data } from "./Step2Football";
import Step2bNationalTeam, { type NationalTeamApplyItem } from "./Step2bNationalTeam";
import Step3Verify, { type Step1Data as S1 } from "./Step3Verify";

export default function PlayerApplyFlow({
  applicationId,
  userEmail,
}: {
  applicationId?: string | null;
  // Resolved server-side from the route page (RSC) — used to be
  // re-fetched here via `supabase.auth.getUser()` in a useEffect,
  // which (a) duplicated work, (b) pulled @supabase/ssr into the
  // client bundle for this route, (c) caused a flash of empty email
  // on initial render.
  userEmail: string | null;
}) {
  const router = useRouter();

  const [activeStep, setActiveStep] = React.useState<1 | 2 | 3 | 4>(1);
  const [maxStepUnlocked, setMaxStepUnlocked] = React.useState<1 | 2 | 3 | 4>(1);

  const [s1, setS1] = React.useState<S1 | null>(null);
  const [s2, setS2] = React.useState<Step2Data | null>(null);
  const [s2b, setS2b] = React.useState<NationalTeamApplyItem[]>([]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-6 sm:p-8">
      <StepHeader activeStep={activeStep} maxStepUnlocked={maxStepUnlocked} />

      {activeStep === 1 && (
        <Step1Personal
          userEmail={userEmail}
          onBack={() => router.push("/onboarding/player/plan")}
          onNext={(data) => {
            setS1(data);
            setActiveStep(2);
            setMaxStepUnlocked((p) => (p < 2 ? 2 : p));
          }}
        />
      )}

      {activeStep === 2 && (
        <Step2Football
          applicationId={applicationId ?? undefined}
          defaultValue={s2 ?? undefined}
          onBack={() => setActiveStep(1)}
          onNext={(data) => {
            setS2(data);
            setActiveStep(3);
            setMaxStepUnlocked((p) => (p < 3 ? 3 : p));
          }}
        />
      )}

      {activeStep === 3 && s1 && (
        <Step2bNationalTeam
          defaultValue={s2b}
          onBack={() => setActiveStep(2)}
          onNext={(data) => {
            setS2b(data);
            setActiveStep(4);
            setMaxStepUnlocked((p) => (p < 4 ? 4 : p));
          }}
        />
      )}

      {activeStep === 4 && s1 && s2 && (
        <Step3Verify
          step1={s1}
          step2={s2}
          nationalTeam={s2b}
          onBack={() => setActiveStep(3)}
          onSent={(_applicationId) => {
            router.replace("/dashboard?applied=1");
          }}
        />
      )}
    </div>
  );
}
