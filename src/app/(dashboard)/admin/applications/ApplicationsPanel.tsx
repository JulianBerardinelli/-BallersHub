"use client";

import * as React from "react";
import {
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Button, Chip, Tooltip,
} from "@heroui/react";
import TeamCrestClient from "@/components/teams/TeamCrestClient";

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

export default function ApplicationsPanel({
  initialItems,
  goTeams,
}: {
  initialItems: ApplicationRow[];
  goTeams: () => void;
}) {
  const items = initialItems;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Solicitudes de jugador (pendientes)</h2>
        <p className="text-sm text-neutral-500">
          Revisá la documentación y, si corresponde, aprobá desde la vista actual.
        </p>
      </div>

      <Table aria-label="Solicitudes pendientes" removeWrapper classNames={{ table: "table-fixed w-full" }}>
        <TableHeader>
          <TableColumn className="w-[26%] max-w-0">Jugador</TableColumn>
          <TableColumn className="w-[18%]">Plan</TableColumn>
          <TableColumn className="w-[34%] max-w-0">Equipo</TableColumn>
          <TableColumn className="w-[22%] text-right">Acciones</TableColumn>
        </TableHeader>
        <TableBody emptyContent="No hay solicitudes.">
          {items.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <div className="truncate">{a.full_name ?? "(sin nombre)"}</div>
                <div className="text-xs text-neutral-500">{new Date(a.created_at).toLocaleString("es-AR", { hour12: false })}</div>
              </TableCell>
              <TableCell>
                <Chip size="sm" variant="flat" color={a.plan_requested === "free" ? "default" : a.plan_requested === "pro" ? "primary" : "warning"}>
                  {a.plan_requested}
                </Chip>
              </TableCell>
              <TableCell>
                {a.current_team_id ? (
                  <TeamCrestClient teamId={a.current_team_id} href="/admin" />
                ) : a.proposed_team_name ? (
                  <div className="truncate">
                    Propuso: <b>{a.proposed_team_name}</b>
                    {a.proposed_team_country ? ` · ${a.proposed_team_country}` : ""}
                    <button className="ml-2 text-xs underline" onClick={goTeams}>
                      revisar en Teams
                    </button>
                  </div>
                ) : (
                  <span>—</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  {/* Mantengo tu flujo actual vía form POST a /api/admin/applications/[id]/approve */}
                  <form action={`/api/admin/applications/${a.id}/approve`} method="post">
                    <Button size="sm" color="primary" type="submit">Approve</Button>
                  </form>
                  {a.transfermarkt_url && (
                    <Tooltip content="Transfermarkt">
                      <a className="text-xs underline" href={a.transfermarkt_url} target="_blank" rel="noreferrer">
                        TM
                      </a>
                    </Tooltip>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
