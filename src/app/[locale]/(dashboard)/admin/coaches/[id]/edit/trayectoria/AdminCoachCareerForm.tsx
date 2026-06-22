"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { adminReplaceCoachCareer } from "@/app/actions/admin-coach";

export type CareerStage = {
  club: string;
  roleTitle: string;
  division: string;
  startYear: number | null;
  endYear: number | null;
};
export type SeasonStat = {
  season: string;
  team: string;
  competition: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
};

const INPUT =
  "w-full rounded-bh-md border border-white/[0.10] bg-bh-surface-2 px-2.5 py-1.5 text-[13px] text-bh-fg-1 outline-none focus:border-bh-lime/50";
const SM = "w-full rounded-bh-md border border-white/[0.10] bg-bh-surface-2 px-2 py-1.5 text-center text-[13px] text-bh-fg-1 outline-none focus:border-bh-lime/50";

const blankStage = (): CareerStage => ({ club: "", roleTitle: "", division: "", startYear: null, endYear: null });
const blankStat = (): SeasonStat => ({
  season: "", team: "", competition: "", matches: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0,
});

export default function AdminCoachCareerForm({
  coachId,
  initialItems,
  initialStats,
}: {
  coachId: string;
  initialItems: CareerStage[];
  initialStats: SeasonStat[];
}) {
  const router = useRouter();
  const [items, setItems] = React.useState<CareerStage[]>(initialItems);
  const [stats, setStats] = React.useState<SeasonStat[]>(initialStats);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  const patchItem = (i: number, p: Partial<CareerStage>) =>
    setItems((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
  const patchStat = (i: number, p: Partial<SeasonStat>) =>
    setStats((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
  const numOrNull = (v: string) => (v.trim() ? Number(v) : null);

  async function onSave() {
    setSaving(true);
    setMsg(null);
    const res = await adminReplaceCoachCareer({
      coachId,
      items: items
        .filter((s) => s.club.trim())
        .map((s) => ({
          club: s.club,
          roleTitle: s.roleTitle || null,
          division: s.division || null,
          startYear: s.startYear,
          endYear: s.endYear,
        })),
      stats: stats
        .filter((s) => s.season.trim())
        .map((s) => ({
          season: s.season,
          team: s.team || null,
          competition: s.competition || null,
          matches: s.matches,
          wins: s.wins,
          draws: s.draws,
          losses: s.losses,
          goalsFor: s.goalsFor,
          goalsAgainst: s.goalsAgainst,
        })),
    });
    setSaving(false);
    if (res.success) {
      setMsg({ ok: true, text: "Trayectoria actualizada." });
      router.refresh();
    } else {
      setMsg({ ok: false, text: res.message ?? "No se pudo guardar." });
    }
  }

  return (
    <div className="space-y-8">
      {/* Etapas */}
      <section className="space-y-3 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
        <h2 className="font-bh-display text-sm font-bold uppercase tracking-[0.06em] text-bh-fg-1">
          Etapas (clubes dirigidos)
        </h2>
        {items.map((it, i) => (
          <div key={i} className="grid items-end gap-2 sm:grid-cols-[1.4fr_1fr_1fr_70px_70px_auto]">
            <input className={INPUT} placeholder="Club" value={it.club} onChange={(e) => patchItem(i, { club: e.target.value })} />
            <input className={INPUT} placeholder="Cargo" value={it.roleTitle} onChange={(e) => patchItem(i, { roleTitle: e.target.value })} />
            <input className={INPUT} placeholder="División" value={it.division} onChange={(e) => patchItem(i, { division: e.target.value })} />
            <input className={SM} placeholder="Desde" value={it.startYear ?? ""} onChange={(e) => patchItem(i, { startYear: numOrNull(e.target.value) })} />
            <input className={SM} placeholder="Hasta" value={it.endYear ?? ""} onChange={(e) => patchItem(i, { endYear: numOrNull(e.target.value) })} />
            <button type="button" onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))} className="px-2 text-[18px] text-bh-fg-4 hover:text-bh-danger">×</button>
          </div>
        ))}
        <Button variant="flat" onPress={() => setItems((p) => [...p, blankStage()])} className="w-full rounded-bh-md border border-dashed border-white/[0.12] bg-transparent py-2 text-[13px] text-bh-fg-2">
          + Agregar etapa
        </Button>
      </section>

      {/* Estadísticas */}
      <section className="space-y-3 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
        <h2 className="font-bh-display text-sm font-bold uppercase tracking-[0.06em] text-bh-fg-1">
          Estadísticas por temporada
        </h2>
        <div className="hidden grid-cols-[1.2fr_1fr_repeat(6,52px)_auto] gap-2 px-1 text-[10px] uppercase tracking-[0.1em] text-bh-fg-4 sm:grid">
          <span>Temporada</span><span>Equipo</span><span className="text-center">PJ</span><span className="text-center">G</span><span className="text-center">E</span><span className="text-center">P</span><span className="text-center">GF</span><span className="text-center">GC</span><span />
        </div>
        {stats.map((s, i) => (
          <div key={i} className="grid items-end gap-2 sm:grid-cols-[1.2fr_1fr_repeat(6,52px)_auto]">
            <input className={INPUT} placeholder="2023/24" value={s.season} onChange={(e) => patchStat(i, { season: e.target.value })} />
            <input className={INPUT} placeholder="Equipo" value={s.team} onChange={(e) => patchStat(i, { team: e.target.value })} />
            {(["matches", "wins", "draws", "losses", "goalsFor", "goalsAgainst"] as const).map((k) => (
              <input key={k} className={SM} value={s[k]} onChange={(e) => patchStat(i, { [k]: Number(e.target.value) || 0 })} />
            ))}
            <button type="button" onClick={() => setStats((p) => p.filter((_, idx) => idx !== i))} className="px-2 text-[18px] text-bh-fg-4 hover:text-bh-danger">×</button>
          </div>
        ))}
        <Button variant="flat" onPress={() => setStats((p) => [...p, blankStat()])} className="w-full rounded-bh-md border border-dashed border-white/[0.12] bg-transparent py-2 text-[13px] text-bh-fg-2">
          + Agregar temporada
        </Button>
      </section>

      {msg && <p className={`text-[13px] ${msg.ok ? "text-bh-success" : "text-bh-danger"}`}>{msg.text}</p>}

      <div className="flex justify-end">
        <Button onPress={onSave} isLoading={saving} isDisabled={saving} className="rounded-bh-md bg-bh-lime px-6 py-2 text-[13px] font-semibold text-bh-black hover:bg-[#d8ff26]">
          Guardar trayectoria
        </Button>
      </div>
    </div>
  );
}
