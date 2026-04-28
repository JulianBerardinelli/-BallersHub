"use client";

import * as React from "react";
import { Button, Chip, Tabs, Tab, Tooltip } from "@heroui/react";

const MAP: Record<"ARQ"|"DEF"|"MID"|"DEL", { label: string; subs: string[] }> = {
  ARQ: { label: "Arquero", subs: ["Arquero"] },
  DEF: { label: "Defensor", subs: ["Central", "Lateral derecho", "Lateral izquierdo", "Carrilero"] },
  MID: { label: "Mediocampista", subs: ["Mediocentro", "Pivote", "Interior", "Volante derecho", "Volante izquierdo", "Mediapunta"] },
  DEL: { label: "Delantero", subs: ["Centrodelantero", "Extremo derecho", "Extremo izquierdo", "Segundo delantero", "Mediapunta"] },
};

const MAX_SUBS_COUNT = Math.max(...Object.values(MAP).map(m => m.subs.length));

export type PositionPickerValue = {
  role: "ARQ" | "DEF" | "MID" | "DEL";
  subs: string[]; // máx 2
};

export default function PositionPicker({
  defaultRole = "DEL",
  defaultSubs = [],
  maxSubs = 2,
  onChange,
}: {
  defaultRole?: PositionPickerValue["role"];
  defaultSubs?: string[];
  maxSubs?: number;
  onChange: (value: PositionPickerValue) => void;
}) {
  const [role, setRole] = React.useState<PositionPickerValue["role"]>(defaultRole);
  const [subs, setSubs] = React.useState<string[]>(defaultSubs.slice(0, maxSubs));

  React.useEffect(() => {
    onChange({ role, subs });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, subs]);

  function toggle(sub: string) {
    setSubs((prev) => {
      if (prev.includes(sub)) return prev.filter((s) => s !== sub);
      if (prev.length >= maxSubs) return prev;
      return [...prev, sub];
    });
  }

  const cfg = MAP[role];
  const placeholders = Array.from({ length: Math.max(0, MAX_SUBS_COUNT - cfg.subs.length) });

  return (
    <div className="grid gap-4">
      <Tabs
        aria-label="Posición"
        selectedKey={role}
        onSelectionChange={(k) => setRole(k as any)}
        variant="underlined"
        classNames={{
          tabList: "gap-6 p-0 border-b border-white/[0.06]",
          tab: "px-0 h-9 data-[hover-unselected=true]:opacity-100",
          tabContent:
            "text-[12px] font-semibold uppercase tracking-[0.08em] text-bh-fg-3 group-data-[selected=true]:text-bh-fg-1",
          cursor: "bg-bh-lime",
        }}
      >
        {Object.entries(MAP).map(([k, v]) => <Tab key={k} title={v.label} />)}
      </Tabs>

      {/* GRID ESTABLE */}
      <div className="grid min-h-[104px] grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {cfg.subs.map((sub) => {
          const isActive = subs.includes(sub);
          return (
            <button
              key={sub}
              type="button"
              onClick={() => toggle(sub)}
              className={
                isActive
                  ? "rounded-bh-md border border-[rgba(204,255,0,0.22)] bg-[rgba(204,255,0,0.10)] px-3 py-2 text-[12px] font-medium text-bh-lime transition-colors"
                  : "rounded-bh-md border border-white/[0.08] bg-bh-surface-1 px-3 py-2 text-[12px] font-medium text-bh-fg-2 transition-colors hover:border-white/[0.18] hover:bg-white/[0.04] hover:text-bh-fg-1"
              }
            >
              {sub}
            </button>
          );
        })}
        {placeholders.map((_, i) => (
          <span key={`ph-${i}`} className="invisible h-9 sm:h-10" />
        ))}
      </div>

      {/* Chips */}
      <div className="flex min-h-10 flex-wrap gap-2">
        {subs.map((s) => (
          <Chip
            key={s}
            variant="flat"
            onClose={() => toggle(s)}
            classNames={{
              base: "border border-[rgba(204,255,0,0.22)] bg-[rgba(204,255,0,0.10)] text-bh-lime",
              content: "text-[12px]",
              closeButton: "text-bh-lime hover:opacity-70",
            }}
          >
            {MAP[role].label}: {s}
          </Chip>
        ))}
        {subs.length === 0 && (
          <Tooltip content={`Elegí hasta ${maxSubs} subposiciones`}>
            <span className="text-[12px] text-bh-fg-4">Sin subposiciones elegidas</span>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
