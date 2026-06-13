"use client";

// Dev-only QA harness for the mobile dock. Switches between the four contexts
// with mock data so we can compare against the handoff without real auth. Only
// ONE dock renders at a time (they all portal to body / fixed-position, so
// rendering several would overlap).

import { useState } from "react";

import { PublicDock, DashboardDock, type DockUser } from "@/components/layout/mobile-nav";
import { buildClientDashboardNavigation } from "@/app/[locale]/(dashboard)/dashboard/navigation";

const noop = async () => {};

const MOCK_USER: DockUser = {
  name: "Juan Benítez",
  initials: "JB",
  handle: "@juanbenitez",
  plan: "Pro",
  isPro: true,
  avatarUrl: null,
};

type Mode = "guest" | "free" | "pro" | "dashboard";

const MODES: { id: Mode; label: string }[] = [
  { id: "guest", label: "Público · invitado" },
  { id: "free", label: "Público · Free" },
  { id: "pro", label: "Público · Pro" },
  { id: "dashboard", label: "Dashboard · jugador" },
];

export function NavPreviewClient() {
  const [mode, setMode] = useState<Mode>("guest");
  const playerSections = buildClientDashboardNavigation({}, false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`rounded-bh-pill border px-4 py-2 text-[13px] font-semibold transition-colors ${
              mode === m.id
                ? "border-bh-lime/40 bg-bh-lime/[0.10] text-bh-lime"
                : "border-white/[0.12] text-bh-fg-2 hover:bg-white/[0.06] hover:text-bh-fg-1"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="text-sm leading-relaxed text-bh-fg-3">
        Redimensioná la ventana por debajo de <strong className="text-bh-fg-1">768px</strong>{" "}
        (móvil) para ver el dock. Comparalo contra{" "}
        <code className="text-bh-fg-2">Mobile Nav Redesign v2.html</code>. Datos de demo.
      </p>

      {mode === "guest" && (
        <PublicDock user={null} isPro={false} publicHref={null} onSignOut={noop} />
      )}
      {mode === "free" && (
        <PublicDock
          user={{ ...MOCK_USER, plan: "Free", isPro: false }}
          isPro={false}
          publicHref="/juanbenitez"
          onSignOut={noop}
        />
      )}
      {mode === "pro" && (
        <PublicDock user={MOCK_USER} isPro publicHref="/juanbenitez" onSignOut={noop} />
      )}
      {mode === "dashboard" && (
        <DashboardDock sections={playerSections} isPro={false} onSignOut={noop} />
      )}
    </div>
  );
}
