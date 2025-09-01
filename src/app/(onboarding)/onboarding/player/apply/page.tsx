"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import StepHeader from "./StepHeader";
import Step1Personal from "./Step1Personal";

export default function PlayerApplyPage() {
  const router = useRouter();

  // auth (email)
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
  }, []);

  const [activeStep, setActiveStep] = React.useState<1 | 2 | 3>(1);
  const [maxStepUnlocked, setMaxStepUnlocked] = React.useState<1 | 2 | 3>(1);

  return (
    <div className="mx-auto w-full max-w-3xl p-6 sm:p-8 space-y-6">
      <StepHeader activeStep={activeStep} maxStepUnlocked={maxStepUnlocked} />

      {activeStep === 1 && (
        <Step1Personal
          userEmail={userEmail}
          onBack={() => router.push("/onboarding/player/plan")}
          onNext={(data) => {
            // acá podés guardar borrador si querés
            // console.log("STEP1 data", data);
            setActiveStep(2);
            setMaxStepUnlocked((prev) => (prev < 2 ? 2 : prev));
          }}
        />
      )}

      {activeStep === 2 && (
        <div className="opacity-90">
          {/* Próxima iteración: TeamPicker + Trayectoria + links */}
        </div>
      )}
    </div>
  );
}
