"use client";

import { ReactNode } from "react";
import { Select, SelectItem } from "@heroui/react";

import BhButton from "@/components/ui/BhButton";
import { bhSelectClassNames } from "@/lib/ui/heroui-brand";

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
      <header className="mb-4 space-y-1">
        <h2 className="font-bh-display text-xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1 md:text-2xl">
          {title}
        </h2>
        {description && (
          <p className="text-sm leading-[1.55] text-bh-fg-3">{description}</p>
        )}
      </header>

      <div className="mb-5 flex flex-col justify-between gap-4 border-b border-white/[0.06] pb-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <BhButton
            size="sm"
            variant={activeTab === "pending" ? "lime" : "ghost"}
            onClick={() => onTabChange("pending")}
          >
            Pendientes ({pendingCount})
          </BhButton>
          <BhButton
            size="sm"
            variant={activeTab === "history" ? "outline" : "ghost"}
            onClick={() => onTabChange("history")}
          >
            Historial ({historyCount})
          </BhButton>
        </div>

        {onFilterChange && (
          <div
            className={`w-full sm:w-52 ${
              activeTab === "pending"
                ? "hidden sm:invisible sm:pointer-events-none sm:block"
                : ""
            }`}
          >
            <Select
              size="sm"
              label="Filtrar por estado"
              variant="flat"
              selectedKeys={[statusFilter]}
              onChange={(e) => {
                if (e.target.value) {
                  onFilterChange(e.target.value as AdminInboxFilterProps);
                }
              }}
              classNames={bhSelectClassNames}
            >
              <SelectItem key="all">Todos</SelectItem>
              <SelectItem key="approved">Aceptados</SelectItem>
              <SelectItem key="rejected">Rechazados</SelectItem>
            </Select>
          </div>
        )}
      </div>

      <div className="pt-2">{children}</div>
    </div>
  );
}
