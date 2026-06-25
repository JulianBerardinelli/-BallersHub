"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Textarea } from "@heroui/react";

export type DiffStage = {
  club: string;
  roleTitle: string | null;
  division: string | null;
  startYear: number | null;
  endYear: number | null;
};

export type DiffStat = {
  season: string;
  competition: string | null;
  team: string | null;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
};

export type CoachRevisionRequest = {
  id: string;
  coachName: string;
  slug: string | null;
  submittedAt: string | null;
  note: string | null;
  before: { career: DiffStage[]; stats: DiffStat[] };
  after: { career: DiffStage[]; stats: DiffStat[] };
};

const stageLine = (s: DiffStage) =>
  `${s.club} — ${s.roleTitle || "DT"} · ${s.division || "—"} · ${s.startYear ?? "?"}–${s.endYear ?? "actual"}`;

const statLine = (s: DiffStat) =>
  `${s.season} · ${s.team || "—"}${s.competition ? ` (${s.competition})` : ""} · PJ ${s.matches} · ${s.wins}G/${s.draws}E/${s.losses}P · GF ${s.goalsFor}/GC ${s.goalsAgainst}`;

export default function CoachCareerRevisionsPanel({
  requests,
}: {
  requests: CoachRevisionRequest[];
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(requests);
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function resolve(id: string, action: "approve" | "reject") {
    setBusy(id + action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/coach-career-revisions/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolutionNote: notes[id]?.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setItems((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-bh-display text-xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          Revisiones de trayectoria — DTs
        </h2>
        <p className="text-sm text-bh-fg-3">
          Compará el estado actual (Antes) con lo propuesto (Después). Al aprobar se reemplaza la
          trayectoria y las estadísticas publicadas del entrenador.
        </p>
      </div>

      {error && <p className="text-sm text-bh-danger">{error}</p>}

      {items.length === 0 ? (
        <p className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6 text-sm text-bh-fg-4">
          No hay revisiones pendientes.
        </p>
      ) : (
        items.map((req) => (
          <article
            key={req.id}
            className="space-y-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5"
          >
            <header className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
                  {req.coachName}
                </p>
                {req.slug && (
                  <Link
                    href={`/staff/${req.slug}`}
                    target="_blank"
                    className="font-bh-mono text-[11px] text-bh-fg-4 hover:text-bh-lime"
                  >
                    /coach/{req.slug}
                  </Link>
                )}
              </div>
              {req.submittedAt && (
                <span className="font-bh-mono text-[11px] text-bh-fg-4">
                  {new Date(req.submittedAt).toLocaleDateString("es-AR")}
                </span>
              )}
            </header>

            {req.note && (
              <p className="rounded-bh-md border border-white/[0.06] bg-bh-surface-2 p-3 text-[12px] text-bh-fg-2">
                <span className="font-semibold text-bh-fg-3">Nota del DT: </span>
                {req.note}
              </p>
            )}

            <DiffBlock
              title="Trayectoria"
              before={req.before.career.map(stageLine)}
              after={req.after.career.map(stageLine)}
            />
            <DiffBlock
              title="Estadísticas por temporada"
              before={req.before.stats.map(statLine)}
              after={req.after.stats.map(statLine)}
            />

            <Textarea
              label="Nota para el DT (opcional)"
              placeholder="Detalles de la resolución."
              value={notes[req.id] ?? ""}
              onValueChange={(v) => setNotes((p) => ({ ...p, [req.id]: v }))}
              classNames={{ inputWrapper: "bg-bh-surface-2 border border-white/[0.08]" }}
            />

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="flat"
                isLoading={busy === req.id + "reject"}
                isDisabled={!!busy}
                onPress={() => resolve(req.id, "reject")}
                className="rounded-bh-md border border-white/[0.08] bg-transparent px-4 py-2 text-[13px] text-bh-fg-2 hover:border-bh-danger hover:text-bh-danger"
              >
                Rechazar
              </Button>
              <Button
                isLoading={busy === req.id + "approve"}
                isDisabled={!!busy}
                onPress={() => resolve(req.id, "approve")}
                className="rounded-bh-md bg-bh-lime px-5 py-2 text-[13px] font-semibold text-bh-black hover:bg-[#d8ff26]"
              >
                Aprobar y publicar
              </Button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}

// Side-by-side before/after with add/remove tinting. A line present on one side
// but not the other is highlighted (removed = red on the left, added = green on
// the right); identical lines stay neutral.
function DiffBlock({
  title,
  before,
  after,
}: {
  title: string;
  before: string[];
  after: string[];
}) {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);

  return (
    <div className="space-y-2">
      <p className="font-bh-display text-[11px] font-bold uppercase tracking-[0.12em] text-bh-fg-4">
        {title}
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <DiffColumn label="Antes" lines={before} otherSet={afterSet} tone="remove" />
        <DiffColumn label="Después" lines={after} otherSet={beforeSet} tone="add" />
      </div>
    </div>
  );
}

function DiffColumn({
  label,
  lines,
  otherSet,
  tone,
}: {
  label: string;
  lines: string[];
  otherSet: Set<string>;
  tone: "add" | "remove";
}) {
  const changedCls =
    tone === "add"
      ? "border-bh-success/30 bg-bh-success/5 text-bh-fg-1"
      : "border-bh-danger/30 bg-bh-danger/5 text-bh-fg-2 line-through decoration-bh-danger/40";
  return (
    <div className="rounded-bh-md border border-white/[0.06] bg-transparent p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-bh-fg-4">
        {label}
      </p>
      {lines.length === 0 ? (
        <p className="text-[12px] text-bh-fg-4">—</p>
      ) : (
        <ul className="space-y-1.5">
          {lines.map((line, i) => {
            const changed = !otherSet.has(line);
            return (
              <li
                key={`${line}-${i}`}
                className={`rounded-bh-sm border px-2.5 py-1.5 text-[12px] leading-[1.4] ${
                  changed ? changedCls : "border-transparent text-bh-fg-3"
                }`}
              >
                {line}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
