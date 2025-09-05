"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import StepHeader from "./StepHeader";
import Step1Personal from "./Step1Personal";
import Step2Football, { type Step2Data } from "./Step2Football";
import Step3Verify, { type Step1Data as S1 } from "./Step3Verify";

export default function PlayerApplyPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
  }, []);

  const [activeStep, setActiveStep] = React.useState<1 | 2 | 3>(1);
  const [maxStepUnlocked, setMaxStepUnlocked] = React.useState<1 | 2 | 3>(1);

  const [s1, setS1] = React.useState<S1 | null>(null);
  const [s2, setS2] = React.useState<Step2Data | null>(null);

  return (
    <div className="mx-auto w-full max-w-3xl p-6 sm:p-8 space-y-6">
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
          applicationId={undefined}
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
          onSent={() => {
            // éxito → llevamos al dashboard o a una pantalla de confirmación
            router.replace("/dashboard?applied=1");
          }}
        />
      )}
    </div>
  );
}
