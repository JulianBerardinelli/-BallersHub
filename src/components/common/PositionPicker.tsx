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
    <div className="grid gap-3">
      <Tabs
        aria-label="Posición"
        selectedKey={role}
        onSelectionChange={(k) => setRole(k as any)}
        variant="underlined"
        classNames={{ tabContent: "text-sm font-medium" }}
      >
        {Object.entries(MAP).map(([k, v]) => <Tab key={k} title={v.label} />)}
      </Tabs>

      {/* GRID ESTABLE: mismas columnas siempre + placeholders invisibles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 min-h-[104px]">
        {cfg.subs.map((sub) => {
          const isActive = subs.includes(sub);
          return (
            <Button
              key={sub}
              size="sm"
              variant={isActive ? "solid" : "flat"}
              color={isActive ? "primary" : "default"}
              onPress={() => toggle(sub)}
            >
              {sub}
            </Button>
          );
        })}
        {placeholders.map((_, i) => (
          <span key={`ph-${i}`} className="invisible h-9 sm:h-10" />
        ))}
      </div>

      {/* Chips con min-height para que no salte el layout */}
      <div className="flex flex-wrap gap-2 min-h-10">
        {subs.map((s) => (
          <Chip key={s} variant="flat" color="primary" onClose={() => toggle(s)}>
            {MAP[role].label}: {s}
          </Chip>
        ))}
        {subs.length === 0 && (
          <Tooltip content={`Elegí hasta ${maxSubs} subposiciones`}>
            <span className="text-sm text-foreground-500">Sin subposiciones elegidas</span>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
