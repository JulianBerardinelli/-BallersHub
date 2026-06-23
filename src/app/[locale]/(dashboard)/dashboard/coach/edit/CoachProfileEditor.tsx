"use client";

import * as React from "react";
import Image from "next/image";
import { Button, Textarea } from "@heroui/react";
import FormField from "@/components/dashboard/client/FormField";
import { updateCoachProfile, type CoachProfileInput } from "@/app/actions/coach-profile";
import { profileNotification, useNotificationContext } from "@/modules/notifications";
import { usePlanAccess } from "@/components/dashboard/plan/PlanAccessProvider";
import AvatarUploader from "@/components/dashboard/AvatarUploader";

const textareaClasses = { inputWrapper: "bg-bh-surface-2 border border-white/[0.08]" };

export default function CoachProfileEditor({
  initial,
  action = updateCoachProfile,
  imageUploadUrl,
}: {
  initial: CoachProfileInput & {
    fullName: string;
    avatarUrl: string | null;
    heroUrl: string | null;
  };
  /** Save action — defaults to the owner's. Admin injects a service-role one. */
  action?: (input: CoachProfileInput) => Promise<{ success: boolean; error?: string }>;
  /** Override the image-upload endpoint (admin edits another coach). */
  imageUploadUrl?: string;
}) {
  const { enqueue } = useNotificationContext();
  const { access } = usePlanAccess();
  const [primaryColor, setPrimaryColor] = React.useState(initial.theme?.primaryColor ?? "");
  const [accentColor, setAccentColor] = React.useState(initial.theme?.accentColor ?? "");
  const [backgroundColor, setBackgroundColor] = React.useState(
    initial.theme?.backgroundColor ?? "",
  );
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
      const res = await action({
        roleTitle: roleTitle || null,
        bio: bio || null,
        careerObjectives: careerObjectives || null,
        playingStyle: playingStyle || null,
        methodologyAnalysis: methodology || null,
        preferredFormations: formations
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
        theme: {
          primaryColor: primaryColor || null,
          accentColor: accentColor || null,
          backgroundColor: backgroundColor || null,
        },
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

      {/* Avatar + asset Pro (hero) */}
      <div className="grid gap-5 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
        <h3 className="font-bh-display text-sm font-bold uppercase tracking-[0.04em] text-bh-fg-2">
          Imagen de perfil
        </h3>
        <div>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-bh-fg-4">
            Avatar
          </p>
          <div className="flex items-center gap-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-full border border-white/[0.12] bg-bh-surface-2">
              {initial.avatarUrl ? (
                <Image
                  src={initial.avatarUrl}
                  alt="Avatar"
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex size-full items-center justify-center text-center text-[10px] text-bh-fg-4">
                  Sin avatar
                </div>
              )}
            </div>
            <AvatarUploader
              playerId=""
              currentAvatarUrl={initial.avatarUrl}
              uploadUrl={imageUploadUrl ?? "/api/coach/profile-image/upload"}
              assetType="avatar"
            />
          </div>
          <p className="mt-2 text-[11px] text-bh-fg-4">
            El asset Pro (hero) se gestiona ahora desde <strong className="text-bh-fg-3">Multimedia</strong>.
          </p>
        </div>
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

      {access.isPro && (
        <div className="grid gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
          <div className="space-y-1">
            <h3 className="font-bh-display text-base font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
              Apariencia
            </h3>
            <p className="text-[12px] text-bh-fg-3">
              Colores de tu página pública premium. Dejá un campo vacío para usar el color de la marca.
            </p>
          </div>
          <ColorRow label="Color de acento" value={accentColor} onChange={setAccentColor} fallback="#ccff00" />
          <ColorRow label="Color primario" value={primaryColor} onChange={setPrimaryColor} fallback="#ccff00" />
          <ColorRow label="Fondo" value={backgroundColor} onChange={setBackgroundColor} fallback="#050505" />
        </div>
      )}

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

function ColorRow({
  label,
  value,
  onChange,
  fallback,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  fallback: string;
}) {
  const swatch = /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
  return (
    <div className="flex items-end gap-3">
      <input
        type="color"
        aria-label={label}
        value={swatch}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-12 shrink-0 cursor-pointer rounded-bh-sm border border-white/[0.08] bg-transparent"
      />
      <div className="flex-1">
        <FormField
          id={`coach-color-${label}`}
          label={label}
          placeholder={fallback}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="pb-2 text-[11px] text-bh-fg-4 hover:text-bh-fg-2"
        >
          Reset
        </button>
      ) : null}
    </div>
  );
}
