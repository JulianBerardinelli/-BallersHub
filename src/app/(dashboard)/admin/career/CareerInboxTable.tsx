// src/app/(dashboard)/admin/career/CareerInboxTable.tsx
"use client";

import * as React from "react";
import { Button, Card, CardBody, Chip } from "@heroui/react";
import type { Group } from "./page";

async function post(url: string, body?: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

export default function CareerInbox({ groups }: { groups: Group[] }) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function acceptAll(applicationId: string) {
    try {
      setErr(null);
      setBusy(applicationId);
      await post(`/api/admin/career/applications/${applicationId}/approve`);
      // recargar para refrescar lista
      window.location.reload();
    } catch (e: any) {
      setErr(e?.message ?? "Error inesperado");
    } finally {
      setBusy(null);
    }
  }

  if (!groups.length) {
    return <p className="text-sm text-neutral-500">No hay trayectorias pendientes.</p>;
  }

  return (
    <div className="grid gap-4">
      {err && <p className="text-sm text-red-500">{err}</p>}

      {groups.map((g) => (
        <Card key={g.application_id} shadow="sm" radius="lg">
          <CardBody className="p-4 grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {g.applicant?.full_name ?? "(sin nombre)"}
                </div>
                {g.applicant?.transfermarkt_url && (
                  <a
                    className="text-xs underline text-neutral-400"
                    href={g.applicant.transfermarkt_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Transfermarkt
                  </a>
                )}
              </div>
              <Button
                color="primary"
                size="sm"
                onPress={() => acceptAll(g.application_id)}
                isLoading={busy === g.application_id}
              >
                Aceptar trayectoria
              </Button>
            </div>

            <ul className="text-sm grid gap-1">
              {g.items.map((it) => (
                <li key={it.id} className="flex items-center gap-2">
                  <Chip size="sm" variant="flat">{it.start_year ?? "—"}–{it.end_year ?? "…"}</Chip>
                  <span className="truncate">{it.club}</span>
                  <span className="text-neutral-500">· {it.division ?? "—"}</span>
                  {it.team_id ? (
                    <Chip size="sm" color="success" variant="flat">existing</Chip>
                  ) : (
                    <Chip size="sm" color="warning" variant="flat">nuevo</Chip>
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
