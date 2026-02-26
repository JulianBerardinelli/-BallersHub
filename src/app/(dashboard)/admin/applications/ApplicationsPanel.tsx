"use client";

import * as React from "react";
import ApplicationCard from "./ApplicationCard";

// Fallback type for the pending player application
export type PlayerApplication = {
  id: string;
  user_id: string;
  created_at: string;
  full_name: string | null;
  plan_requested: "free" | "pro" | "pro_plus";
  current_team_id: string | null;
  current_club: string | null;
  proposed_team_name: string | null;
  proposed_team_country: string | null;
  status: string;
  transfermarkt_url: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  birth_date: string | null;
  nationality: string[] | null;
  positions: string[] | null;
  id_doc_url: string | null;
  selfie_url: string | null;
  notes: string | null;
};

export default function ApplicationsPanel({
  initialItems,
  countryMap,
}: {
  initialItems: PlayerApplication[];
  countryMap: Record<string, string>;
}) {
  const [items, setItems] = React.useState<PlayerApplication[]>(initialItems);

  const handleAction = React.useCallback(
    (id: string, action: "approved" | "rejected") => {
      // Remover optimísticamente de la UI si se aprobó o rechazó.
      setItems((prev) => prev.filter((app) => app.id !== id));
    },
    []
  );

  if (items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900/50">
        <p className="text-neutral-500">No hay solicitudes pendientes.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {items.map((app) => (
        <ApplicationCard
          key={app.id}
          application={app}
          countryMap={countryMap}
          onAction={(action) => handleAction(app.id, action)}
        />
      ))}
    </div>
  );
}
