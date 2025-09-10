// src/app/(dashboard)/admin/career/CareerInboxTable.tsx
"use client";

import * as React from "react";
import { Avatar, Button, Card, CardBody, Chip } from "@heroui/react";
import CountryFlag from "@/components/common/CountryFlag";
import { Globe, Instagram, Link as LinkIcon } from "lucide-react";
import type { Group } from "./page";
import TeamCrest from "@/components/teams/TeamCrest";

async function post(url: string, body?: unknown) {
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
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error inesperado");
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
              <div className="flex items-center gap-2 min-w-0">
                <p className="font-medium truncate">
                  {g.applicant?.full_name ?? "(sin nombre)"}
                </p>
                {g.applicant?.nationality_codes.map((c) => (
                  <CountryFlag key={c} code={c} size={14} />
                ))}
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const links: string[] = [];
                  if (g.applicant?.transfermarkt_url) links.push(g.applicant.transfermarkt_url);
                  if (g.applicant?.external_profile_url) links.push(g.applicant.external_profile_url);
                  if (
                    g.applicant?.social_url &&
                    g.applicant.social_url !== g.applicant.external_profile_url
                  ) {
                    links.push(g.applicant.social_url);
                  }
                  return links.map((u, i) => {
                    const low = u.toLowerCase();
                    let Icon = LinkIcon;
                    if (low.includes("instagram.com")) Icon = Instagram;
                    else if (low.includes("transfermarkt") || low.includes("besoccer")) Icon = Globe;
                    return (
                      <a
                        key={i}
                        href={u}
                        target="_blank"
                        rel="noreferrer"
                        className="text-default-500 hover:text-default-700"
                      >
                        <Icon size={16} />
                      </a>
                    );
                  });
                })()}
                <Button
                  color="primary"
                  size="sm"
                  onPress={() => acceptAll(g.application_id)}
                  isLoading={busy === g.application_id}
                >
                  Aceptar trayectoria
                </Button>
              </div>
            </div>

            <ul className="text-sm grid gap-1">
              {g.items.map((it) => (
                <li key={it.id} className="flex items-center gap-2 min-w-0">
                  <TeamCrest
                    src={it.crest_url || "/images/team-default.svg"}
                    name={it.team_name}
                    size={28}
                    className="shrink-0"
                  />
                  <span className="truncate">{it.team_name}</span>
                  <span className="text-neutral-500">· {it.division ?? "—"}</span>
                  {it.country_code && <CountryFlag code={it.country_code} size={12} />}
                  <Chip size="sm" variant="flat">
                    {it.start_year ?? "—"}–{it.end_year ?? "…"}
                  </Chip>
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