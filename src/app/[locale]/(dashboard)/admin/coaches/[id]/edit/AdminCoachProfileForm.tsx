"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { adminUpdateCoachProfile } from "@/app/actions/admin-coach";

export type AdminCoachData = {
  id: string;
  slug: string | null;
  fullName: string;
  roleTitle: string;
  currentClub: string;
  bio: string;
  playingStyle: string;
  methodologyAnalysis: string;
  careerObjectives: string;
  preferredFormations: string;
  status: "draft" | "pending_review" | "approved" | "rejected";
  visibility: "public" | "private";
};

const LABEL = "mb-1.5 block font-body text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3";
const INPUT =
  "w-full rounded-bh-md border border-white/[0.10] bg-bh-surface-2 px-3 py-2 text-[14px] text-bh-fg-1 outline-none focus:border-bh-lime/50";

export default function AdminCoachProfileForm({ coach }: { coach: AdminCoachData }) {
  const router = useRouter();
  const [form, setForm] = React.useState<AdminCoachData>(coach);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  const set = (p: Partial<AdminCoachData>) => setForm((f) => ({ ...f, ...p }));

  async function onSave() {
    setSaving(true);
    setMsg(null);
    const res = await adminUpdateCoachProfile({
      coachId: coach.id,
      fullName: form.fullName,
      roleTitle: form.roleTitle || null,
      currentClub: form.currentClub || null,
      bio: form.bio || null,
      playingStyle: form.playingStyle || null,
      methodologyAnalysis: form.methodologyAnalysis || null,
      careerObjectives: form.careerObjectives || null,
      preferredFormations: form.preferredFormations
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      status: form.status,
      visibility: form.visibility,
    });
    setSaving(false);
    if (res.success) {
      setMsg({ ok: true, text: "Cambios guardados." });
      router.refresh();
    } else {
      setMsg({ ok: false, text: res.message ?? "No se pudo guardar." });
    }
  }

  return (
    <div className="space-y-5 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL}>Nombre completo</label>
          <input className={INPUT} value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} />
        </div>
        <div>
          <label className={LABEL}>Cargo</label>
          <input
            className={INPUT}
            value={form.roleTitle}
            placeholder="Director Técnico"
            onChange={(e) => set({ roleTitle: e.target.value })}
          />
        </div>
        <div>
          <label className={LABEL}>Club actual</label>
          <input className={INPUT} value={form.currentClub} onChange={(e) => set({ currentClub: e.target.value })} />
        </div>
        <div>
          <label className={LABEL}>Formaciones (separadas por coma)</label>
          <input
            className={INPUT}
            value={form.preferredFormations}
            placeholder="4-3-3, 4-4-2"
            onChange={(e) => set({ preferredFormations: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className={LABEL}>Biografía</label>
        <textarea className={`${INPUT} min-h-[120px]`} value={form.bio} onChange={(e) => set({ bio: e.target.value })} />
      </div>
      <div>
        <label className={LABEL}>Ideas de juego</label>
        <textarea
          className={`${INPUT} min-h-[100px]`}
          value={form.playingStyle}
          onChange={(e) => set({ playingStyle: e.target.value })}
        />
      </div>
      <div>
        <label className={LABEL}>Análisis metodológico (Pro)</label>
        <textarea
          className={`${INPUT} min-h-[100px]`}
          value={form.methodologyAnalysis}
          onChange={(e) => set({ methodologyAnalysis: e.target.value })}
        />
      </div>
      <div>
        <label className={LABEL}>Objetivos</label>
        <textarea
          className={`${INPUT} min-h-[80px]`}
          value={form.careerObjectives}
          onChange={(e) => set({ careerObjectives: e.target.value })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL}>Estado</label>
          <select
            className={INPUT}
            value={form.status}
            onChange={(e) => set({ status: e.target.value as AdminCoachData["status"] })}
          >
            <option value="approved">Aprobado</option>
            <option value="pending_review">En revisión</option>
            <option value="rejected">Rechazado</option>
            <option value="draft">Borrador</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Visibilidad</label>
          <select
            className={INPUT}
            value={form.visibility}
            onChange={(e) => set({ visibility: e.target.value as AdminCoachData["visibility"] })}
          >
            <option value="public">Pública</option>
            <option value="private">Privada</option>
          </select>
        </div>
      </div>

      {msg && (
        <p className={`text-[13px] ${msg.ok ? "text-bh-success" : "text-bh-danger"}`}>{msg.text}</p>
      )}

      <div className="flex justify-end">
        <Button
          onPress={onSave}
          isLoading={saving}
          isDisabled={saving || form.fullName.trim().length < 2}
          className="rounded-bh-md bg-bh-lime px-6 py-2 text-[13px] font-semibold text-bh-black hover:bg-[#d8ff26]"
        >
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
