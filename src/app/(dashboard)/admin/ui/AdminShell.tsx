"use client";

import * as React from "react";
import Link from "next/link";
import { Tabs, Tab, Card, CardBody } from "@heroui/react";
import ApplicationsPanel from "../applications/ApplicationsPanel";
import TeamsPanel from "../teams/TeamsPanel";
import type { TeamRow } from "../teams/types";

type ApplicationRow = {
  id: string;
  user_id: string;
  full_name: string | null;
  plan_requested: "free" | "pro" | "pro_plus";
  current_team_id: string | null;
  proposed_team_name: string | null;
  proposed_team_country: string | null;
  created_at: string;
  status: string;
  transfermarkt_url: string | null;
};

export default function AdminShell({
  initialApps,
  initialTeams,
}: {
  initialApps: ApplicationRow[];
  initialTeams: TeamRow[];
}) {
  const [tab, setTab] = React.useState<"applications" | "teams">("applications");

  return (
    <div className="mx-auto max-w-7xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-sm text-neutral-500">
          Gestioná solicitudes de jugadores y equipos. UI con HeroUI (chips, tablas, modales).
        </p>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar (tabs verticales) */}
        <aside className="col-span-12 md:col-span-3 lg:col-span-2">
          <Card className="sticky top-6">
            <CardBody>
              <Tabs
                selectedKey={tab}
                onSelectionChange={(k) => setTab(k as any)}
                aria-label="Admin sections"
                fullWidth
                color="default"
                radius="sm"
                classNames={{
                  tabList: "flex-col items-stretch gap-2",
                  cursor: "w-full",
                }}
                variant="light"
                // vertical: simulado con layout de una columna
              >
                <Tab key="applications" title="Players" />
                <Tab key="teams" title="Teams" />
              </Tabs>
              <div className="pt-4 text-xs text-neutral-500">
                <Link className="underline" href="/dashboard">Volver al Dashboard</Link>
              </div>
            </CardBody>
          </Card>
        </aside>

        {/* Content */}
        <section className="col-span-12 md:col-span-9 lg:col-span-10">
          {tab === "applications" ? (
            <ApplicationsPanel initialItems={initialApps} goTeams={() => setTab("teams")} />
          ) : (
            <TeamsPanel initialItems={initialTeams} />
          )}
        </section>
      </div>
    </div>
  );
}
