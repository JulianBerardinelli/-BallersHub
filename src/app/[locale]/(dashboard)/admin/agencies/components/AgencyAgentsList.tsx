"use client";

import * as React from "react";
import { User, Chip } from "@heroui/react";
import { Mail } from "lucide-react";
import { bhChip } from "@/lib/ui/heroui-brand";
import type { AgencyAgentRow } from "../types";

export default function AgencyAgentsList({
  agents,
  agencyName,
}: {
  agents: AgencyAgentRow[];
  agencyName: string;
}) {
  if (agents.length === 0) {
    return (
      <div className="rounded-bh-md border border-dashed border-white/[0.08] bg-bh-surface-2/30 px-4 py-3">
        <p className="text-[12px] text-bh-fg-3">
          Aún no hay agentes registrados para{" "}
          <span className="font-medium text-bh-fg-2">{agencyName}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-bh-md border border-white/[0.06] bg-bh-surface-2/40">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2.5">
        <p className="font-bh-display text-[10px] font-bold uppercase tracking-[0.1em] text-bh-fg-4">
          Agentes registrados
        </p>
        <Chip size="sm" variant="flat" classNames={bhChip("blue")}>
          {agents.length} {agents.length === 1 ? "agente" : "agentes"}
        </Chip>
      </div>
      <ul className="divide-y divide-white/[0.04]">
        {agents.map((agent) => (
          <li
            key={agent.user_profile_id}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <User
              avatarProps={{
                radius: "lg",
                src: agent.avatar_url ?? undefined,
                size: "sm",
                name: agent.full_name ?? undefined,
              }}
              description={
                <span className="text-[11px] text-bh-fg-4">
                  Se unió{" "}
                  {new Date(agent.joined_at).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              }
              name={
                <span className="text-[13px] text-bh-fg-1">
                  {agent.full_name ?? "Agente sin nombre"}
                </span>
              }
            />
            {agent.contact_email ? (
              <a
                href={`mailto:${agent.contact_email}`}
                className="inline-flex items-center gap-1.5 rounded-bh-md border border-white/[0.08] px-2.5 py-1 text-[11px] text-bh-fg-3 transition-colors hover:border-white/[0.18] hover:text-bh-fg-1"
              >
                <Mail size={12} />
                <span className="hidden sm:inline">{agent.contact_email}</span>
                <span className="sm:hidden">Email</span>
              </a>
            ) : (
              <span className="text-[11px] text-bh-fg-4">Sin email</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
