"use client";

// Styles manager — only two layouts now: `free` (editorial dossier, fixed
// for free users) and `pro` (Pro Athlete 3D, only writable by Pro). Color
// pickers and live preview are gated behind the Pro plan via <PlanGate>.
// Typography selection has been removed entirely.

import { useState } from "react";
import { Button } from "@heroui/react";
import Link from "next/link";
import { AlertTriangle, Check, Lock } from "lucide-react";

import SectionCard from "@/components/dashboard/client/SectionCard";
import { updateThemeSettingsAction } from "@/app/actions/template-settings";
import { useNotificationContext, profileNotification } from "@/modules/notifications";
import type { DashboardThemeSettings } from "@/lib/dashboard/client/publishing-state";
import { bhButtonClass } from "@/components/ui/BhButton";
import PlanGate from "@/components/dashboard/plan/PlanGate";
import UpgradeCta from "@/components/dashboard/plan/UpgradeCta";
import { usePlanAccess } from "@/components/dashboard/plan/PlanAccessProvider";

const TEMPLATE_OPTIONS = [
  {
    id: "free" as const,
    name: "Free Editorial",
    description: "Dossier minimalista listo para publicar tu perfil al instante.",
    requiresPro: false,
  },
  {
    id: "pro" as const,
    name: "Pro Athlete (3D)",
    description: "Experiencia premium con motion, parallax y assets pro.",
    requiresPro: true,
  },
];

const COLOR_PRESETS = [
  { id: "neutral", label: "Monocromo", primary: "#FFFFFF", secondary: "#2A2A2A", accent: "#A3A3A3", background: "#050505", gradient: "from-neutral-800 via-neutral-900 to-black" },
  { id: "cyberpunk", label: "Cyberpunk", primary: "#F43F5E", secondary: "#701A75", accent: "#06B6D4", background: "#000000", gradient: "from-rose-600 via-fuchsia-900 to-cyan-900" },
  { id: "club_blue", label: "Azul Eléctrico", primary: "#3B82F6", secondary: "#1E3A8A", accent: "#60A5FA", background: "#020617", gradient: "from-blue-500 via-blue-900 to-slate-950" },
  { id: "vintage_gold", label: "Oro Imperial", primary: "#F59E0B", secondary: "#78350F", accent: "#FDE68A", background: "#1C1917", gradient: "from-amber-500 via-orange-800 to-stone-900" },
];

type LayoutId = (typeof TEMPLATE_OPTIONS)[number]["id"];

export default function StylesManagerClient({
  initialTheme,
  heroUrl,
}: {
  initialTheme: DashboardThemeSettings | null;
  heroUrl?: string | null;
}) {
  const { enqueue } = useNotificationContext();
  const { access } = usePlanAccess();

  // Coerce any legacy layout (futuristic, minimalist, vintage) to the
  // closest valid value. Free users always see "free" selected.
  const initialLayout: LayoutId = access.isPro
    ? initialTheme?.layout === "pro"
      ? "pro"
      : "free"
    : "free";

  const [layout, setLayout] = useState<LayoutId>(initialLayout);
  const [primaryColor, setPrimaryColor] = useState(initialTheme?.primaryColor ?? "#10b981");
  const [secondaryColor, setSecondaryColor] = useState(initialTheme?.secondaryColor ?? "#2A2A2A");
  const [accentColor, setAccentColor] = useState(initialTheme?.accentColor ?? "#34d399");
  const [backgroundColor, setBackgroundColor] = useState(initialTheme?.backgroundColor ?? "#050505");
  const [coverMode] = useState(initialTheme?.coverMode ?? "photo");
  const [saving, setSaving] = useState(false);

  const applyColorPreset = (primary: string, secondary: string, accent: string, background: string) => {
    setPrimaryColor(primary);
    setSecondaryColor(secondary);
    setAccentColor(accent);
    setBackgroundColor(background);
  };

  const handleSelectLayout = (id: LayoutId) => {
    if (id === "pro" && !access.isPro) return; // gated
    setLayout(id);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateThemeSettingsAction({
        layout,
        primaryColor,
        secondaryColor,
        accentColor,
        backgroundColor,
        coverMode,
      });
      enqueue(
        profileNotification.updated({
          userName: "Tu perfil",
          sectionLabel: "Estilos",
          changedFields: access.isPro ? ["Diseño base", "Colores de marca"] : ["Diseño base"],
        }),
      );
    } catch (e) {
      console.error(e);
      alert("Error al guardar estilos");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-8 flex flex-col gap-6">

        {layout === "pro" && !heroUrl && (
          <div className="flex items-start gap-3 rounded-bh-md border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] p-4 text-bh-warning">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Falta el hero asset</p>
              <p className="mb-2 mt-1 text-[12px] leading-[1.55] text-bh-warning/80">
                Para usar la plantilla Pro Athlete necesitás subir tu recorte en la
                sección multimedia.
              </p>
              <Link
                href="/dashboard/edit-profile/multimedia"
                className="text-[12px] font-bold underline-offset-4 hover:underline"
              >
                Subir ahora en multimedia →
              </Link>
            </div>
          </div>
        )}

        <SectionCard title="Diseño base" description="Una plantilla por plan: Free editorial o Pro Athlete.">
          <div className="grid gap-4 md:grid-cols-2">
            {TEMPLATE_OPTIONS.map((opt) => {
              const selected = layout === opt.id;
              const locked = opt.requiresPro && !access.isPro;
              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelectLayout(opt.id)}
                  className={`relative flex flex-col gap-3 overflow-hidden rounded-bh-lg border p-4 text-sm transition-all ${
                    locked
                      ? "cursor-not-allowed border-white/[0.08] bg-bh-surface-1/40 opacity-90"
                      : "cursor-pointer"
                  } ${
                    selected
                      ? "border-[rgba(204,255,0,0.30)] bg-[rgba(204,255,0,0.05)] shadow-[0_0_24px_rgba(204,255,0,0.10)]"
                      : "border-white/[0.08] bg-bh-surface-1/40 hover:border-white/[0.18]"
                  }`}
                >
                  {opt.requiresPro && (
                    <div className="absolute -right-6 top-3 rotate-45 bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 py-0.5 text-[10px] font-bold text-white">
                      PRO
                    </div>
                  )}
                  <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-bh-md border border-dashed border-white/[0.08] bg-gradient-to-br from-bh-surface-2 to-bh-surface-1">
                    <span className="truncate font-bh-display text-3xl font-black italic tracking-widest text-bh-fg-1 opacity-25">
                      {opt.id === "pro" ? "PRO" : "FREE"}
                    </span>
                    {locked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-bh-black/55">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.10] bg-bh-black/85 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-1">
                          <Lock size={10} /> Solo Pro
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bh-heading text-base font-semibold text-bh-fg-1">
                        {opt.name}
                      </p>
                      <p className="mt-1 text-[12px] leading-[1.55] text-bh-fg-3">
                        {opt.description}
                      </p>
                    </div>
                    {selected && !locked && (
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bh-lime/15 text-bh-lime">
                        <Check size={12} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!access.isPro && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-bh-md border border-bh-lime/20 bg-bh-lime/5 px-4 py-3">
              <p className="text-[12.5px] leading-[1.55] text-bh-fg-2">
                Activá Pro para usar Pro Athlete con motion, parallax y assets premium.
              </p>
              <UpgradeCta feature="templateProLayout" size="sm" />
            </div>
          )}
        </SectionCard>

        <PlanGate feature="templateColors">
          <SectionCard title="Colores de marca" description="Elegí una paleta preestablecida o definí los colores manualmente.">
            <div className="mb-7 grid gap-3 md:grid-cols-4">
              {COLOR_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() =>
                    applyColorPreset(preset.primary, preset.secondary, preset.accent, preset.background)
                  }
                  className="cursor-pointer rounded-bh-lg border border-white/[0.08] bg-bh-surface-1/40 p-4 text-center text-sm text-bh-fg-2 transition-all hover:border-white/[0.18] hover:bg-bh-surface-1/60"
                >
                  <div className={`mx-auto mb-3 h-20 w-full rounded-bh-md bg-gradient-to-br shadow-inner ${preset.gradient}`} />
                  <p className="font-bh-heading text-[13px] font-semibold tracking-wide text-bh-fg-1">
                    {preset.label}
                  </p>
                  <p className="mt-1 font-bh-display text-[10px] font-bold uppercase tracking-[0.14em] text-bh-fg-4">
                    Preset
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                { id: "bg", label: "Color de fondo (background)", placeholder: "#050505", value: backgroundColor, setter: setBackgroundColor },
                { id: "pr", label: "Color primario (luces principales)", placeholder: "#10B981", value: primaryColor, setter: setPrimaryColor },
                { id: "sc", label: "Color secundario (sombras / gradientes)", placeholder: "#2A2A2A", value: secondaryColor, setter: setSecondaryColor },
                { id: "ac", label: "Color de acento (textos destacados)", placeholder: "#34D399", value: accentColor, setter: setAccentColor },
              ].map((field) => (
                <label key={field.id} className="space-y-1.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2">
                    {field.label}
                  </span>
                  <div className="flex h-12 items-center gap-2 rounded-bh-md border border-white/[0.08] bg-bh-surface-1 px-2 transition-colors duration-150 hover:border-white/[0.18] focus-within:border-bh-lime focus-within:ring-1 focus-within:ring-bh-lime/30">
                    <div className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-bh-md border border-white/[0.12] shadow-sm">
                      <input
                        type="color"
                        value={field.value}
                        onChange={(e) => field.setter(e.target.value)}
                        className="absolute -left-[10px] -top-[10px] h-20 w-20 cursor-pointer opacity-0"
                      />
                      <div
                        className="pointer-events-none h-full w-full"
                        style={{ backgroundColor: field.value }}
                      />
                    </div>
                    <input
                      type="text"
                      value={field.value}
                      placeholder={field.placeholder}
                      onChange={(e) => field.setter(e.target.value)}
                      className="w-full bg-transparent font-bh-mono text-sm font-medium uppercase tracking-widest text-bh-fg-1 placeholder:text-bh-fg-4 focus:outline-none"
                    />
                  </div>
                </label>
              ))}
            </div>
          </SectionCard>
        </PlanGate>

        <div className="flex justify-end pb-12 pt-4 lg:pb-4">
          <Button
            size="lg"
            onPress={handleSave}
            isLoading={saving}
            className={bhButtonClass({ variant: "lime", size: "lg" })}
          >
            Guardar diseño
          </Button>
        </div>
      </div>

      {/* Live preview — only for Pro */}
      <div className="sticky top-24 z-10 lg:col-span-4">
        <PlanGate feature="templateLivePreview">
          <SectionCard title="Live preview" description="Una vista veloz adaptada al dispositivo.">
            <div
              className="relative mx-auto aspect-[9/18] max-w-[280px] overflow-hidden rounded-[2rem] border-8 border-bh-surface-2 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="absolute top-0 left-1/2 z-20 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-bh-surface-2" />

              {layout === "pro" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="absolute w-full top-32 flex justify-center z-0">
                    <span className="text-8xl font-black -tracking-widest" style={{ color: accentColor, opacity: 0.2 }}>SAHIN</span>
                  </div>
                  <div className="absolute bottom-0 w-[80%] h-[70%] border-t-2 border-l-2 gap-0 border-white/10 rounded-t-[100px] z-10 bg-black/40 backdrop-blur-sm" />
                  <div className="absolute w-full top-32 flex justify-center z-20">
                    <span className="text-8xl font-black -tracking-widest" style={{ WebkitTextStroke: `1px ${accentColor}`, color: 'transparent' }}>SAHIN</span>
                  </div>
                </div>
              ) : (
                <div className="absolute top-0 left-0 w-full h-[45%] flex flex-col items-center justify-end pb-8 bg-black/40 z-10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <div className="w-20 h-20 bg-neutral-200 rounded-full border-[3px] shadow-xl mb-4 transition-all duration-500" style={{ borderColor: accentColor }} />
                  <div className="h-5 w-3/4 max-w-[180px] mb-2 bg-white/20 rounded-md backdrop-blur-md" />
                  <div className="h-3 w-1/2 max-w-[120px] bg-white/10 rounded backdrop-blur-md" />
                </div>
              )}

              {layout !== "pro" && (
                <div className="absolute top-[52%] w-full px-5 flex flex-col gap-4 z-10 transition-all duration-500">
                  <div className="h-10 w-full rounded bg-white/5 backdrop-blur-md border border-white/10 flex items-center px-4" style={{ borderLeftWidth: 3, borderLeftColor: accentColor }} />
                  <div className="h-20 w-full rounded-xl bg-white/5 backdrop-blur-md border border-white/10 shadow-lg" />
                </div>
              )}

              <div className="absolute bottom-5 left-0 w-full flex flex-col items-center gap-1 z-20 opacity-50 mix-blend-luminosity">
                <span className="text-[9px] font-bold tracking-widest text-white uppercase opacity-70 border px-2 py-0.5 rounded-full border-white/20">{layout}</span>
              </div>
            </div>
          </SectionCard>
        </PlanGate>
      </div>
    </div>
  );
}
