"use client";

import * as React from "react";

export default function StepHeader({
  activeStep,
  maxStepUnlocked,
}: {
  activeStep: 1 | 2 | 3;
  maxStepUnlocked: 1 | 2 | 3;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
          Jugador · Paso {activeStep} de 3
        </span>
        <h1 className="font-bh-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          Alta de <span className="text-bh-lime">jugador</span>
        </h1>
      </div>

      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { n: 1, title: "Datos principales", sub: "Tu información personal" },
          { n: 2, title: "Datos futbolísticos", sub: "Club y trayectoria" },
          { n: 3, title: "Verificación", sub: "Documentos (KYC)" },
        ].map((s) => {
          const isActive = activeStep === (s.n as 1 | 2 | 3);
          const isLocked = maxStepUnlocked < (s.n as 1 | 2 | 3);
          const isDone = (s.n as 1 | 2 | 3) < activeStep;
          return (
            <li
              key={s.n}
              aria-current={isActive ? "step" : undefined}
              className={[
                "rounded-bh-lg border p-4 transition-colors",
                isActive
                  ? "border-[rgba(204,255,0,0.22)] bg-[rgba(204,255,0,0.05)]"
                  : isDone
                    ? "border-white/[0.08] bg-bh-surface-1"
                    : "border-white/[0.06] bg-transparent",
                isLocked ? "opacity-50" : "",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-bh-lime text-bh-black"
                      : isDone
                        ? "bg-bh-success text-bh-black"
                        : "bg-white/[0.08] text-bh-fg-3"
                  }`}
                >
                  {isDone ? "✓" : s.n}
                </span>
                <span
                  className={`font-bh-heading text-[13px] font-semibold ${
                    isActive ? "text-bh-fg-1" : "text-bh-fg-2"
                  }`}
                >
                  {s.title}
                </span>
              </div>
              <div className="mt-1 pl-7 text-[11px] text-bh-fg-3">{s.sub}</div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
