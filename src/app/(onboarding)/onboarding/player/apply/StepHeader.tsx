"use client";

import * as React from "react";
import { Progress } from "@heroui/react";

export default function StepHeader({
  activeStep,
  maxStepUnlocked,
}: {
  activeStep: 1 | 2 | 3;
  maxStepUnlocked: 1 | 2 | 3;
}) {
  const progress = activeStep === 1 ? 33 : activeStep === 2 ? 66 : 100;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Alta de jugador</h1>

      <ol className="grid grid-cols-3 gap-2 text-sm">
        {[
          { n: 1, title: "Datos principales", sub: "Tu información personal" },
          { n: 2, title: "Datos futbolísticos", sub: "Club y trayectoria" },
          { n: 3, title: "Verificación", sub: "Documentos (KYC)" },
        ].map((s) => {
          const isActive = activeStep === (s.n as 1 | 2 | 3);
          const isLocked = maxStepUnlocked < (s.n as 1 | 2 | 3);
          return (
            <li
              key={s.n}
              aria-current={isActive ? "step" : undefined}
              className={[
                "rounded-xl border p-3",
                isActive ? "bg-content2" : "",
                isLocked ? "opacity-60" : "",
              ].join(" ")}
            >
              <div className="font-medium">{s.n}. {s.title}</div>
              <div className="text-foreground-500">{s.sub}</div>
            </li>
          );
        })}
      </ol>

      <Progress aria-label="Progreso" value={progress} />
    </div>
  );
}
