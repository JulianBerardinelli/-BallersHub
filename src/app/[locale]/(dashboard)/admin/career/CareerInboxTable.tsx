// src/app/(dashboard)/admin/career/CareerInboxTable.tsx
"use client";

import * as React from "react";
import { Button, Chip } from "@heroui/react";
import CountryFlag from "@/components/common/CountryFlag";
import { Globe, Instagram, Link as LinkIcon } from "lucide-react";
import type { CareerRow } from "./types";
import TeamCrest from "@/components/teams/TeamCrest";

import { bhChip } from "@/lib/ui/heroui-brand";

export type Group = {
  application_id: string;
  applicant: {
    full_name: string | null;
    nationality_codes: string[];
    transfermarkt_url: string | null;
    external_profile_url: string | null;
    social_url: string | null;
  } | null;
  items: CareerRow["items"];
};

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
      window.location.reload();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setBusy(null);
    }
  }

  if (!groups.length) {
    return (
      <div className="rounded-bh-lg border border-dashed border-white/[0.08] bg-bh-surface-1/40 py-12 text-center text-sm text-bh-fg-4">
        No hay trayectorias pendientes.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {err && (
        <div className="rounded-bh-md border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] p-3 text-sm text-bh-danger">
          {err}
        </div>
      )}

      {groups.map((g) => (
        <article
          key={g.application_id}
          className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5"
        >
          <header className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate font-bh-display text-base font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
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
                      className="text-bh-fg-3 transition-colors hover:text-bh-lime"
                    >
                      <Icon size={16} />
                    </a>
                  );
                });
              })()}
              <Button
                size="sm"
                onPress={() => acceptAll(g.application_id)}
                isLoading={busy === g.application_id}
                className="rounded-bh-md bg-bh-lime px-4 py-1.5 text-[12px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
              >
                Aceptar trayectoria
              </Button>
            </div>
          </header>

          <ul className="mt-4 grid gap-2 text-sm">
            {g.items.map((it) => (
              <li
                key={it.id}
                className="flex min-w-0 items-center gap-2 rounded-bh-md border border-white/[0.06] bg-bh-surface-2/40 px-3 py-2"
              >
                <TeamCrest
                  src={it.crest_url || "/images/team-default.svg"}
                  name={it.team_name}
                  size={28}
                  className="shrink-0"
                />
                <span className="truncate text-bh-fg-1">{it.team_name}</span>
                <span className="text-bh-fg-4">· {it.division ?? "—"}</span>
                {it.country_code && <CountryFlag code={it.country_code} size={12} />}
                <Chip size="sm" variant="flat" classNames={bhChip("neutral")}>
                  {it.start_year ?? "—"}–{it.end_year ?? "…"}
                </Chip>
                {it.team_id ? (
                  <Chip size="sm" variant="flat" classNames={bhChip("success")}>
                    existing
                  </Chip>
                ) : (
                  <Chip size="sm" variant="flat" classNames={bhChip("warning")}>
                    nuevo
                  </Chip>
                )}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
