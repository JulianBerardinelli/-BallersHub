"use client";

import * as React from "react";
import { Inbox } from "lucide-react";

import ApplicationCard from "./ApplicationCard";
import AdminInboxLayout, { AdminInboxFilterProps } from "@/components/admin/AdminInboxLayout";
import BhEmptyState from "@/components/ui/BhEmptyState";

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
  const [activeTab, setActiveTab] = React.useState<"pending" | "history">("pending");
  const [statusFilter, setStatusFilter] = React.useState<AdminInboxFilterProps>("all");

  const pendingItems = items.filter((a) => a.status === "pending");
  const historyItems = items.filter((a) => a.status !== "pending");

  const displayedItems = activeTab === "pending"
    ? pendingItems
    : historyItems.filter((a) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "approved" && a.status === "approved") return true;
        if (statusFilter === "rejected" && a.status === "rejected") return true;
        return false;
      });

  const handleAction = React.useCallback(
    (id: string, action: "approved" | "rejected") => {
      // Optimistically update the status
      setItems((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: action } : app))
      );
    },
    []
  );

  return (
    <AdminInboxLayout
      title="Bandeja de Entrada: Onboarding"
      description="Revisá y aprobá las nuevas solicitudes de creación de perfiles."
      activeTab={activeTab}
      onTabChange={setActiveTab}
      pendingCount={pendingItems.length}
      historyCount={historyItems.length}
      statusFilter={statusFilter}
      onFilterChange={setStatusFilter}
    >
      {displayedItems.length === 0 ? (
        <BhEmptyState
          icon={<Inbox className="h-5 w-5" />}
          title={activeTab === "pending" ? "Bandeja vacía" : "Sin historial"}
          description={
            activeTab === "pending"
              ? "No hay solicitudes pendientes."
              : "No hay historial para mostrar."
          }
        />
      ) : (
        <div className="grid gap-6">
          {displayedItems.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              countryMap={countryMap}
              onAction={(action) => handleAction(app.id, action)}
            />
          ))}
        </div>
      )}
    </AdminInboxLayout>
  );
}
