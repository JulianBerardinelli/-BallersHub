"use client";

import { ReactNode } from "react";
import { Button, Select, SelectItem } from "@heroui/react";

export type AdminInboxFilterProps = "all" | "approved" | "rejected";

interface AdminInboxLayoutProps {
  title: string;
  description?: string;
  activeTab: "pending" | "history";
  onTabChange: (tab: "pending" | "history") => void;
  pendingCount?: number;
  historyCount?: number;
  statusFilter?: AdminInboxFilterProps;
  onFilterChange?: (filter: AdminInboxFilterProps) => void;
  children: ReactNode;
}

export default function AdminInboxLayout({
  title,
  description,
  activeTab,
  onTabChange,
  pendingCount = 0,
  historyCount = 0,
  statusFilter = "all",
  onFilterChange,
  children,
}: AdminInboxLayoutProps) {
  return (
    <div>
      <header className="mb-2">
        <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
        {description && <p className="text-neutral-400 mt-1">{description}</p>}
      </header>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-content3 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={activeTab === "pending" ? "solid" : "light"}
            color={activeTab === "pending" ? "primary" : "default"}
            onPress={() => onTabChange("pending")}
          >
            Pendientes ({pendingCount})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "history" ? "solid" : "light"}
            color={activeTab === "history" ? "default" : "default"}
            onPress={() => onTabChange("history")}
          >
            Historial ({historyCount})
          </Button>
        </div>

        {onFilterChange && (
          <div className={`w-full sm:w-48 ${activeTab === "pending" ? "hidden sm:block sm:invisible sm:pointer-events-none" : ""}`}>
            <Select
              size="sm"
              label="Filtrar por estado"
              variant="faded"
              selectedKeys={[statusFilter]}
              onChange={(e) => {
                if (e.target.value) {
                  onFilterChange(e.target.value as AdminInboxFilterProps);
                }
              }}
            >
              <SelectItem key="all">
                Todos
              </SelectItem>
              <SelectItem key="approved">
                Aceptados
              </SelectItem>
              <SelectItem key="rejected">
                Rechazados
              </SelectItem>
            </Select>
          </div>
        )}
      </div>

      <div className="pt-2">
        {children}
      </div>
    </div>
  );
}
