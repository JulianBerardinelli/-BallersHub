"use client";

// Agency styles manager — same gating model as the player one. Two
// layouts: `classic` (Free Agency) and `pro` (Pro Agency). Typography is
// no longer editable. Colors and live preview are gated behind Pro.

import { useState } from "react";
import { Button } from "@heroui/react";
import Link from "next/link";
import { AlertTriangle, Check, ExternalLink, Lock } from "lucide-react";

import SectionCard from "@/components/dashboard/client/SectionCard";
import FormField from "@/components/dashboard/client/FormField";
import { updateAgencyThemeSettingsAction } from "@/app/actions/agency-template-settings";
import { useNotificationContext, profileNotification } from "@/modules/notifications";
import { bhButtonClass } from "@/components/ui/BhButton";
import PlanGate from "@/components/dashboard/plan/PlanGate";
import UpgradeCta from "@/components/dashboard/plan/UpgradeCta";
import { usePlanAccess } from "@/components/dashboard/plan/PlanAccessProvider";

type AgencySummary = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
};

type ThemeRecord = {
  layout: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  backgroundColor: string | null;
  typography: string | null;
  heroHeadline: string | null;
  heroTagline: string | null;
};

const TEMPLATE_OPTIONS = [
  {
    id: "classic" as const,
    name: "Free Agency",
    description: "Tarjeta institucional simple con logo, datos y roster.",
    requiresPro: false,
  },
  {
    id: "pro" as const,
    name: "Pro Agency (3D)",
    description: "Hero cinematográfico con parallax, marquee y módulos premium.",
    requiresPro: true,
  },
];

const COLOR_PRESETS = [
  { id: "stealth", label: "Stealth Mono", primary: "#FFFFFF", secondary: "#2A2A2A", accent: "#A3A3A3", background: "#050505", gradient: "from-neutral-700 via-neutral-900 to-black" },
  { id: "premium_gold", label: "Oro Premium", primary: "#F59E0B", secondary: "#78350F", accent: "#FBBF24", background: "#0A0A0A", gradient: "from-amber-500 via-orange-800 to-stone-900" },
  { id: "deep_blue", label: "Corporativo", primary: "#3B82F6", secondary: "#1E3A8A", accent: "#60A5FA", background: "#020617", gradient: "from-blue-500 via-blue-900 to-slate-950" },
  { id: "tropic", label: "Verde Esmeralda", primary: "#10B981", secondary: "#064E3B", accent: "#34D399", background: "#020617", gradient: "from-emerald-500 via-emerald-900 to-slate-950" },
];

type LayoutId = (typeof TEMPLATE_OPTIONS)[number]["id"];

type Props = {
  agency: AgencySummary;
  initialTheme: ThemeRecord | null;
};

export default function AgencyStylesManagerClient({ agency, initialTheme }: Props) {
  const { enqueue } = useNotificationContext();
  const { access } = usePlanAccess();

  const initialLayout: LayoutId = access.isPro
    ? initialTheme?.layout === "pro"
      ? "pro"
      : "classic"
    : "classic";

  const [layout, setLayout] = useState<LayoutId>(initialLayout);
  const [primaryColor, setPrimaryColor] = useState(initialTheme?.primaryColor ?? "#FFFFFF");
  const [secondaryColor, setSecondaryColor] = useState(initialTheme?.secondaryColor ?? "#2A2A2A");
  const [accentColor, setAccentColor] = useState(initialTheme?.accentColor ?? "#10B981");
  const [backgroundColor, setBackgroundColor] = useState(initialTheme?.backgroundColor ?? "#050505");
  const [heroHeadline, setHeroHeadline] = useState(initialTheme?.heroHeadline ?? "");
  const [heroTagline, setHeroTagline] = useState(initialTheme?.heroTagline ?? "");
  const [saving, setSaving] = useState(false);

  const applyColorPreset = (primary: string, secondary: string, accent: string, background: string) => {
    setPrimaryColor(primary);
    setSecondaryColor(secondary);
    setAccentColor(accent);
    setBackgroundColor(background);
  };

  const handleSelectLayout = (id: LayoutId) => {
    if (id === "pro" && !access.isPro) return;
    setLayout(id);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAgencyThemeSettingsAction({
        layout,
        primaryColor,
        secondaryColor,
        accentColor,
        backgroundColor,
        heroHeadline: heroHeadline.trim() || null,
        heroTagline: heroTagline.trim() || null,
      });
      enqueue(
        profileNotification.updated({
          userName: agency.name,
          sectionLabel: "Estilos del portfolio",
          changedFields: access.isPro ? ["Plantilla", "Paleta", "Hero"] : ["Plantilla"],
        }),
      );
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Error al guardar estilos");
    } finally {
      setSaving(false);
    }
  };

  const monogram = agency.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || agency.name.slice(0, 2).toUpperCase();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-8 flex flex-col gap-6">
        {layout === "pro" && !agency.logoUrl && (
          <div className="flex items-start gap-3 rounded-bh-md border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] p-4 text-bh-warning">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Recomendamos cargar tu logo</p>
              <p className="mb-2 mt-1 text-[12px] leading-[1.55] text-bh-warning/80">
                El layout Pro lo muestra como sello en la portada. Si no lo cargás, usamos un monograma.
              </p>
              <Link
                href="/dashboard/agency"
                className="text-[12px] font-bold underline-offset-4 hover:underline"
              >
                Subir logo en la edición de la agencia →
              </Link>
            </div>
          </div>
        )}

        <SectionCard
          title="Plantilla base"
          description="Una plantilla por plan: Free Agency o Pro Agency."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {TEMPLATE_OPTIONS.map((opt) => {
              const selected = layout === opt.id;
              const locked = opt.requiresPro && !access.isPro;
              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelectLayout(opt.id)}
                  className={`relative flex flex-col gap-3 overflow-hidden rounded-bh-lg border p-4 text-sm transition-all ${
                    locked ? "cursor-not-allowed opacity-90" : "cursor-pointer"
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
                    <span className="truncate font-bh-display text-3xl font-black tracking-widest text-bh-fg-1 opacity-25">
                      {opt.id === "pro" ? "AGENCY" : "ROSTER"}
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
                      <p className="font-bh-heading text-base font-semibold text-bh-fg-1">{opt.name}</p>
                      <p className="mt-1 text-[12px] leading-[1.55] text-bh-fg-3">{opt.description}</p>
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
                Activá Pro Agency para usar el layout cinematográfico con módulos premium.
              </p>
              <UpgradeCta feature="templateProLayout" size="sm" />
            </div>
          )}
        </SectionCard>

        <PlanGate feature="templateColors">
          <SectionCard
            title="Paleta de marca"
            description="Aplicá una paleta predefinida o personalizá los colores corporativos."
          >
            <div className="mb-7 grid gap-3 md:grid-cols-4">
              {COLOR_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() =>
                    applyColorPreset(preset.primary, preset.secondary, preset.accent, preset.background)
                  }
                  className="cursor-pointer rounded-bh-lg border border-white/[0.08] bg-bh-surface-1/40 p-4 text-center text-sm text-bh-fg-2 transition-all hover:border-white/[0.18] hover:bg-bh-surface-1/60"
                >
                  <div
                    className={`mx-auto mb-3 h-20 w-full rounded-bh-md bg-gradient-to-br shadow-inner ${preset.gradient}`}
                  />
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
                { id: "bg", label: "Fondo (background)", placeholder: "#050505", value: backgroundColor, setter: setBackgroundColor },
                { id: "pr", label: "Primario", placeholder: "#FFFFFF", value: primaryColor, setter: setPrimaryColor },
                { id: "sc", label: "Secundario", placeholder: "#2A2A2A", value: secondaryColor, setter: setSecondaryColor },
                { id: "ac", label: "Acento (CTA / destellos)", placeholder: "#10B981", value: accentColor, setter: setAccentColor },
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

        {layout === "pro" && access.isPro && (
          <SectionCard
            title="Hero personalizado"
            description="Definí el texto cinematográfico que reemplaza al nombre por defecto."
          >
            <div className="grid gap-4">
              <FormField
                label="Palabra/frase del hero"
                placeholder={agency.name.toUpperCase()}
                value={heroHeadline}
                onChange={(e) => setHeroHeadline(e.target.value)}
                description="Si lo dejás vacío, usamos el nombre de la agencia."
              />
              <FormField
                label="Tagline (sub-hero)"
                placeholder="Representación profesional · Carrera 360°"
                value={heroTagline}
                onChange={(e) => setHeroTagline(e.target.value)}
                description="Aparece debajo del logo / monograma en el hero."
              />
            </div>
          </SectionCard>
        )}

        <div className="flex justify-between items-center pb-12 pt-4 lg:pb-4">
          <Link
            href={`/agency/${agency.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 text-sm text-bh-fg-3 hover:text-bh-fg-1 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Ver portfolio público
          </Link>
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

      <div className="sticky top-24 z-10 lg:col-span-4">
        <PlanGate feature="templateLivePreview">
          <SectionCard title="Live preview" description="Vista rápida del portfolio configurado.">
            <div
              className="relative mx-auto aspect-[9/18] max-w-[280px] overflow-hidden rounded-[2rem] border-8 border-bh-surface-2 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ backgroundColor: backgroundColor }}
            >
              <div className="absolute top-0 left-1/2 z-20 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-bh-surface-2" />

              {layout === "pro" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="absolute w-full top-32 flex justify-center z-0">
                    <span className="text-7xl font-black -tracking-widest" style={{ color: accentColor, opacity: 0.2 }}>
                      {(heroHeadline || agency.name).slice(0, 6).toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute bottom-0 w-[80%] h-[60%] flex flex-col items-center justify-end pb-10 z-10">
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black uppercase tracking-tighter mb-4 backdrop-blur-md"
                      style={{
                        borderColor: accentColor,
                        borderWidth: 2,
                        color: accentColor,
                        background: `linear-gradient(135deg, ${primaryColor}33, ${secondaryColor}66)`,
                      }}
                    >
                      {monogram}
                    </div>
                    <span className="text-[9px] uppercase tracking-[0.3em] text-white/60">
                      {(heroTagline || "Agencia oficial").slice(0, 28)}
                    </span>
                  </div>
                  <div className="absolute w-full top-32 flex justify-center z-20">
                    <span
                      className="text-7xl font-black -tracking-widest"
                      style={{ WebkitTextStroke: `1px ${accentColor}`, color: "transparent" }}
                    >
                      {(heroHeadline || agency.name).slice(0, 6).toUpperCase()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col z-10">
                  <div
                    className="h-32 w-full flex items-end p-4"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}30, ${secondaryColor}90)` }}
                  >
                    <div className="flex items-end gap-3">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-base font-black uppercase tracking-tight"
                        style={{
                          backgroundColor: "#0a0a0a",
                          color: accentColor,
                          border: `1px solid ${accentColor}`,
                        }}
                      >
                        {monogram}
                      </div>
                      <span className="text-xs uppercase tracking-widest text-white/80 font-bold pb-1 truncate">
                        {agency.name}
                      </span>
                    </div>
                  </div>
                  <div className="px-4 pt-4 flex flex-col gap-3">
                    <div className="h-3 w-3/4 rounded bg-white/15" />
                    <div className="h-2 w-1/2 rounded bg-white/10" />
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {[0, 1, 2, 3].map((k) => (
                        <div
                          key={k}
                          className="aspect-[3/4] rounded-md"
                          style={{
                            background: `linear-gradient(180deg, ${primaryColor}40, ${backgroundColor})`,
                            border: `1px solid ${accentColor}30`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="absolute bottom-5 left-0 w-full flex flex-col items-center gap-1 z-20 opacity-50 mix-blend-luminosity">
                <span className="text-[9px] font-bold tracking-widest text-white uppercase opacity-70 border px-2 py-0.5 rounded-full border-white/20">
                  {layout}
                </span>
              </div>
            </div>
          </SectionCard>
        </PlanGate>
      </div>
    </div>
  );
}
