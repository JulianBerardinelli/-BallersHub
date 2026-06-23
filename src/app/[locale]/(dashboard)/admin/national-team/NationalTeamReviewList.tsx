"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";

import CountryFlag from "@/components/common/CountryFlag";
import { bhButtonClass } from "@/components/ui/BhButton";
import {
  NT_AGE_CATEGORY_LABELS,
  NT_PARTICIPATION_LABELS,
} from "@/lib/dashboard/national-team";
import type {
  NationalTeamAgeCategory,
  NationalTeamParticipation,
} from "@/db/schema/nationalTeams";

export type PendingStint = {
  id: string;
  countryCode: string | null;
  teamName: string | null;
  ageCategory: NationalTeamAgeCategory;
  participation: NationalTeamParticipation;
  startYear: number | null;
  endYear: number | null;
  description: string | null;
  highlights: string[] | null;
  caps: number | null;
  goals: number | null;
  assists: number | null;
  minutes: number | null;
  referenceUrl: string | null;
  createdAt: string | null;
  playerName: string | null;
  playerSlug: string | null;
  playerGender: string | null;
};

export default function NationalTeamReviewList({ items }: { items: PendingStint[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const act = (id: string, action: "approve" | "reject") => {
    setError(null);
    setActingId(id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/national-team/${id}/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolutionNote: notes[id] ?? null }),
        });
        if (!res.ok) {
          const d = (await res.json().catch(() => ({}))) as { error?: string };
          setError(d.error || "No se pudo procesar la solicitud.");
          return;
        }
        router.refresh();
      } finally {
        setActingId(null);
      }
    });
  };

  if (items.length === 0) {
    return <p className="text-sm text-neutral-400">No hay solicitudes pendientes. 🎉</p>;
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {items.map((s) => {
        const stats = (
          [
            ["PJ", s.caps],
            ["Goles", s.goals],
            ["Asist.", s.assists],
            ["Min.", s.minutes],
          ] as const
        ).filter(([, v]) => v != null);
        const period =
          s.startYear || s.endYear ? `${s.startYear ?? "?"}–${s.endYear ?? "Actual"}` : null;
        const busy = pending && actingId === s.id;

        return (
          <div key={s.id} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="text-sm text-white/60">
                  {s.playerSlug ? (
                    <Link
                      href={`/${s.playerSlug}`}
                      target="_blank"
                      className="font-semibold text-white hover:text-bh-lime"
                    >
                      {s.playerName ?? "Jugador"}
                    </Link>
                  ) : (
                    <span className="font-semibold text-white">{s.playerName ?? "Jugador"}</span>
                  )}
                  {s.playerGender === "female" ? (
                    <span className="ml-2 text-xs text-white/40">(Femenino)</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {s.countryCode ? <CountryFlag code={s.countryCode} size={18} /> : null}
                  <span className="font-medium text-white">Selección {s.teamName ?? ""}</span>
                  <span className="rounded-full bg-bh-lime/10 px-2 py-0.5 text-[11px] font-medium text-bh-lime">
                    {NT_AGE_CATEGORY_LABELS[s.ageCategory]}
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
                    {NT_PARTICIPATION_LABELS[s.participation]}
                  </span>
                  {period ? <span className="text-xs text-white/60">{period}</span> : null}
                </div>
              </div>
              {s.referenceUrl ? (
                <a
                  href={s.referenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-bh-lime hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Ver fuente
                </a>
              ) : (
                <span className="text-xs text-amber-300/80">Sin fuente de respaldo</span>
              )}
            </div>

            {s.description ? <p className="text-sm text-white/70">{s.description}</p> : null}

            {s.highlights && s.highlights.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {s.highlights.map((h) => (
                  <span
                    key={h}
                    className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/70"
                  >
                    {h}
                  </span>
                ))}
              </div>
            ) : null}

            {stats.length > 0 ? (
              <div className="flex flex-wrap gap-3 text-xs text-white/60">
                {stats.map(([lbl, v]) => (
                  <span key={lbl}>
                    <span className="font-semibold text-white">{v}</span> {lbl}
                  </span>
                ))}
              </div>
            ) : null}

            <textarea
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-bh-lime/50 focus:outline-none"
              rows={2}
              placeholder="Nota / motivo (opcional al aprobar, recomendado al rechazar)…"
              value={notes[s.id] ?? ""}
              onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))}
            />

            <div className="flex gap-2">
              <button
                type="button"
                className={bhButtonClass({ variant: "lime", size: "sm" })}
                onClick={() => act(s.id, "approve")}
                disabled={busy}
              >
                <CheckCircle2 className="h-4 w-4" /> Aprobar
              </button>
              <button
                type="button"
                className={bhButtonClass({ variant: "danger-soft", size: "sm" })}
                onClick={() => act(s.id, "reject")}
                disabled={busy}
              >
                <XCircle className="h-4 w-4" /> Rechazar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
