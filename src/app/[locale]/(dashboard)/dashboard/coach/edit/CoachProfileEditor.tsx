"use client";

import * as React from "react";
import { Button, Textarea } from "@heroui/react";
import FormField from "@/components/dashboard/client/FormField";
import { updateCoachProfile, type CoachProfileInput } from "@/app/actions/coach-profile";
import { profileNotification, useNotificationContext } from "@/modules/notifications";

const textareaClasses = { inputWrapper: "bg-bh-surface-2 border border-white/[0.08]" };

export default function CoachProfileEditor({
  initial,
}: {
  initial: CoachProfileInput & { fullName: string };
}) {
  const { enqueue } = useNotificationContext();
  const [roleTitle, setRoleTitle] = React.useState(initial.roleTitle ?? "");
  const [bio, setBio] = React.useState(initial.bio ?? "");
  const [careerObjectives, setCareerObjectives] = React.useState(initial.careerObjectives ?? "");
  const [playingStyle, setPlayingStyle] = React.useState(initial.playingStyle ?? "");
  const [methodology, setMethodology] = React.useState(initial.methodologyAnalysis ?? "");
  const [formations, setFormations] = React.useState((initial.preferredFormations ?? []).join(", "));
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  async function onSave() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await updateCoachProfile({
        roleTitle: roleTitle || null,
        bio: bio || null,
        careerObjectives: careerObjectives || null,
        playingStyle: playingStyle || null,
        methodologyAnalysis: methodology || null,
        preferredFormations: formations
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      });
      if (res.success) {
        setMsg({ ok: true, text: "Cambios guardados. Tu página pública se actualizó." });
        enqueue(
          profileNotification.updated({
            sectionLabel: "Perfil del entrenador",
            changedFields: [],
          }),
        );
      } else {
        setMsg({ ok: false, text: res.error ?? "No se pudo guardar." });
      }
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Error inesperado." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-bh-display text-xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          Datos del perfil
        </h2>
        <p className="text-sm text-bh-fg-3">
          {initial.fullName} · estos campos se publican en tu página pública.
        </p>
      </div>

      <div className="grid gap-5 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
        <FormField
          id="coach-role"
          label="Cargo"
          placeholder="Ej: Director Técnico"
          value={roleTitle}
          onChange={(e) => setRoleTitle(e.target.value)}
        />

        <Textarea
          label="Biografía"
          minRows={4}
          value={bio}
          onValueChange={setBio}
          placeholder="Tu recorrido, filosofía y momentos clave como entrenador."
          classNames={textareaClasses}
        />

        <Textarea
          label="Ideas de juego"
          minRows={4}
          value={playingStyle}
          onValueChange={setPlayingStyle}
          placeholder="Cómo te gusta que jueguen tus equipos: presión, salida, transiciones…"
          classNames={textareaClasses}
        />

        <FormField
          id="coach-formations"
          label="Formaciones preferidas"
          placeholder="4-3-3, 3-5-2, 4-2-3-1"
          value={formations}
          onChange={(e) => setFormations(e.target.value)}
        />
        <p className="-mt-3 text-[11px] text-bh-fg-4">Separá los módulos con comas.</p>

        <Textarea
          label="Análisis metodológico (Pro)"
          minRows={4}
          value={methodology}
          onValueChange={setMethodology}
          placeholder="Tu metodología de trabajo: planificación, microciclos, modelo de juego."
          classNames={textareaClasses}
        />
        <p className="-mt-3 text-[11px] text-bh-fg-4">
          Se muestra en tu página pública solo con plan Pro.
        </p>

        <Textarea
          label="Objetivos"
          minRows={3}
          value={careerObjectives}
          onValueChange={setCareerObjectives}
          placeholder="A dónde querés llegar como entrenador."
          classNames={textareaClasses}
        />
      </div>

      {msg && (
        <p className={`text-sm ${msg.ok ? "text-bh-success" : "text-bh-danger"}`}>{msg.text}</p>
      )}

      <div className="flex justify-end">
        <Button
          onPress={onSave}
          isLoading={saving}
          isDisabled={saving}
          className="rounded-bh-md bg-bh-lime px-6 py-2 text-[13px] font-semibold text-bh-black hover:bg-[#d8ff26]"
        >
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
