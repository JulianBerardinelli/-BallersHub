"use client";

import { useState, useEffect } from "react";
import { Button } from "@heroui/react";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { updateThemeSettingsAction } from "@/app/actions/template-settings";
import { useNotificationContext, profileNotification } from "@/modules/notifications";
import type { DashboardThemeSettings } from "@/lib/dashboard/client/publishing-state";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

import { bhButtonClass } from "@/components/ui/BhButton";

const TEMPLATE_OPTIONS = [
  { id: "pro", name: "Pro Athlete (3D)", description: "Experiencia premium parallax. Requiere recortar una foto tuya en .png." },
  { id: "futuristic", name: "Futurista", description: "Colores de neón, cajas dark-glassmorphism y estilo vanguardista." },
  { id: "minimalist", name: "Minimalista", description: "Bordes invisibles, fondo limpio y foco absoluto en los datos." },
  { id: "vintage", name: "Aesthetic Vintage", description: "Elegancia pura, tonos cálidos, tipografía serifa tipo revista." }
];

const COLOR_PRESETS = [
  { id: "neutral", label: "Monocromo", primary: "#FFFFFF", secondary: "#2A2A2A", accent: "#A3A3A3", background: "#050505", gradient: "from-neutral-800 via-neutral-900 to-black" },
  { id: "cyberpunk", label: "Cyberpunk", primary: "#F43F5E", secondary: "#701A75", accent: "#06B6D4", background: "#000000", gradient: "from-rose-600 via-fuchsia-900 to-cyan-900" },
  { id: "club_blue", label: "Azul Eléctrico", primary: "#3B82F6", secondary: "#1E3A8A", accent: "#60A5FA", background: "#020617", gradient: "from-blue-500 via-blue-900 to-slate-950" },
  { id: "vintage_gold", label: "Oro Imperial", primary: "#F59E0B", secondary: "#78350F", accent: "#FDE68A", background: "#1C1917", gradient: "from-amber-500 via-orange-800 to-stone-900" }
];

const TYPOGRAFIA_PRESETS: Record<string, { id: string; label: string }[]> = {
  pro: [
    { id: "bebas", label: "Bebas Neue (Heavy)" },
    { id: "anton", label: "Anton (Impact)" },
    { id: "syncopate", label: "Syncopate (Wide)" }
  ],
  futuristic: [
    { id: "syncopate", label: "Syncopate + Roboto Mono" },
    { id: "michroma", label: "Michroma + Inter" }
  ],
  minimalist: [
    { id: "inter", label: "Inter (Classic Sans)" },
    { id: "satoshi", label: "Satoshi + Geist" }
  ],
  vintage: [
    { id: "playfair", label: "Playfair Display" },
    { id: "lora", label: "Lora + Lato" }
  ]
};

export default function StylesManagerClient({ initialTheme, heroUrl }: { initialTheme: DashboardThemeSettings | null, heroUrl?: string | null }) {
  const { enqueue } = useNotificationContext();
  const [layout, setLayout] = useState(initialTheme?.layout ?? "futuristic");
  
  const [primaryColor, setPrimaryColor] = useState(initialTheme?.primaryColor ?? "#10b981");
  const [secondaryColor, setSecondaryColor] = useState(initialTheme?.secondaryColor ?? "#2A2A2A");
  const [accentColor, setAccentColor] = useState(initialTheme?.accentColor ?? "#34d399");
  const [backgroundColor, setBackgroundColor] = useState(initialTheme?.backgroundColor ?? "#050505");
  
  const [typography, setTypography] = useState(initialTheme?.typography ?? "syncopate");
  const [coverMode] = useState(initialTheme?.coverMode ?? "photo");
  const [saving, setSaving] = useState(false);

  // Auto-ajustar tipografía si cambia el layout y la tipografía previa no pertenece a ese set
  useEffect(() => {
    const validTypos = TYPOGRAFIA_PRESETS[layout] || TYPOGRAFIA_PRESETS["futuristic"];
    if (!validTypos.find(t => t.id === typography)) {
      setTypography(validTypos[0].id);
    }
  }, [layout, typography]);

  const applyColorPreset = (primary: string, secondary: string, accent: string, background: string) => {
    setPrimaryColor(primary);
    setSecondaryColor(secondary);
    setAccentColor(accent);
    setBackgroundColor(background);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateThemeSettingsAction({ layout, primaryColor, secondaryColor, accentColor, backgroundColor, typography, coverMode });
      enqueue(profileNotification.updated({ userName: "Tu perfil", sectionLabel: "Estilos", changedFields: ["Diseño base", "Colores de marca", "Tipografía"] }));
    } catch (e) {
      console.error(e);
      alert("Error al guardar estilos");
    } finally {
      setSaving(false);
    }
  };

  const fontsForLayout = TYPOGRAFIA_PRESETS[layout] || TYPOGRAFIA_PRESETS["futuristic"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Columna Izquierda: Configuración */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        
        {layout === "pro" && !heroUrl && (
          <div className="flex items-start gap-3 rounded-bh-md border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] p-4 text-bh-warning">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Falta el hero asset</p>
              <p className="mb-2 mt-1 text-[12px] leading-[1.55] text-bh-warning/80">
                Para usar esta plantilla necesitás subir tu recorte en la
                sección multimedia. Si se publica así, el sistema volverá al
                modo Minimalista hasta que lo cargues.
              </p>
              <Link
                href="/dashboard/edit-profile/multimedia"
                className="text-[12px] font-bold underline-offset-4 hover:underline"
              >
                Subir ahora en multimedia &rarr;
              </Link>
            </div>
          </div>
        )}

        <SectionCard title="Diseño base" description="Elegí la estructura y vibra general de tu perfil público.">
          <div className="grid gap-4 md:grid-cols-2">
            {TEMPLATE_OPTIONS.map((opt) => (
              <div
                key={opt.id}
                onClick={() => setLayout(opt.id)}
                className={`relative flex cursor-pointer flex-col gap-3 overflow-hidden rounded-bh-lg border p-4 text-sm transition-all ${
                  layout === opt.id
                    ? "border-[rgba(204,255,0,0.30)] bg-[rgba(204,255,0,0.05)] shadow-[0_0_24px_rgba(204,255,0,0.10)]"
                    : "border-white/[0.08] bg-bh-surface-1/40 opacity-80 hover:border-white/[0.18] hover:opacity-100"
                }`}
              >
                {opt.id === "pro" && (
                  <div className="absolute -right-6 top-3 rotate-45 bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 py-0.5 text-[10px] font-bold text-white">
                    PREMIUM
                  </div>
                )}
                <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-bh-md border border-dashed border-white/[0.08] bg-gradient-to-br from-bh-surface-2 to-bh-surface-1">
                  {opt.id === "pro" ? (
                    <span className="truncate font-bh-display text-4xl font-black italic tracking-widest text-bh-fg-1 opacity-20">
                      PRO
                    </span>
                  ) : null}
                </div>
                <div>
                  <p className="font-bh-heading text-base font-semibold text-bh-fg-1">
                    {opt.name}
                  </p>
                  <p className="mt-1 text-[12px] leading-[1.55] text-bh-fg-3">
                    {opt.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Colores de marca" description="Elegí una paleta preestablecida o definí manualmente los colores de tu identidad.">
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

        <SectionCard title="Tipografía" description="Seleccioná un par tipográfico que se adapte al estilo que elegiste.">
          <div className="grid gap-3 md:grid-cols-2">
            {fontsForLayout.map((font) => (
              <div
                key={font.id}
                onClick={() => setTypography(font.id)}
                className={`cursor-pointer rounded-bh-md border p-4 text-sm transition-all ${
                  typography === font.id
                    ? "border-[rgba(204,255,0,0.30)] bg-[rgba(204,255,0,0.05)]"
                    : "border-white/[0.08] bg-bh-surface-1/40 hover:border-white/[0.18]"
                }`}
              >
                <p className="font-bh-heading text-base font-bold text-bh-fg-1">
                  {font.label}
                </p>
                <p className="mt-1 text-[11px] text-bh-fg-3">
                  Familia ideal para estilo {TEMPLATE_OPTIONS.find((l) => l.id === layout)?.name}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

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

      {/* Columna Derecha: Vista Previa Flotante */}
      <div className="sticky top-24 z-10 lg:col-span-4">
        <SectionCard title="Live preview" description="Una vista veloz adaptada al dispositivo.">
           <div className="relative mx-auto aspect-[9/18] max-w-[280px] overflow-hidden rounded-[2rem] border-8 border-bh-surface-2 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]" style={{ backgroundColor: primaryColor }}>
             {/* Mini Notch falso */}
             <div className="absolute top-0 left-1/2 z-20 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-bh-surface-2" />
             
             {layout === "pro" ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 {/* Sólido Fondo */}
                 <div className="absolute w-full top-32 flex justify-center z-0">
                    <span className="text-8xl font-black -tracking-widest" style={{ color: accentColor, opacity: 0.2 }}>SAHIN</span>
                 </div>
                 {/* Jugador Falso (Silueta Cutout) */}
                 <div className="absolute bottom-0 w-[80%] h-[70%] border-t-2 border-l-2 gap-0 border-white/10 rounded-t-[100px] z-10 bg-black/40 backdrop-blur-sm" />
                 {/* Stroke Falso */}
                 <div className="absolute w-full top-32 flex justify-center z-20">
                    <span className="text-8xl font-black -tracking-widest" style={{ WebkitTextStroke: `1px ${accentColor}`, color: 'transparent' }}>SAHIN</span>
                 </div>
               </div>
             ) : (
             <div className="absolute top-0 left-0 w-full h-[45%] flex flex-col items-center justify-end pb-8 bg-black/40 z-10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
               
               {/* Avatar */}
               <div className="w-20 h-20 bg-neutral-200 rounded-full border-[3px] shadow-xl mb-4 transition-all duration-500" style={{ borderColor: accentColor }} />
               <div className="h-5 w-3/4 max-w-[180px] mb-2 bg-white/20 rounded-md backdrop-blur-md" />
               <div className="h-3 w-1/2 max-w-[120px] bg-white/10 rounded backdrop-blur-md" />
               
               {/* Controles del layout */}
               {layout === "futuristic" && (
                 <div className="absolute bottom-[-15px] left-1/2 -translate-x-1/2 w-4/5 h-1 blur-md bg-white opacity-40 rounded-full" style={{ background: accentColor }} />
               )}
             </div>
             )}
             
             {/* Componentes Abstraidos del CV */}
             {layout !== "pro" && (
               <div className="absolute top-[52%] w-full px-5 flex flex-col gap-4 z-10 transition-all duration-500">
                  {/* Bloque tipo ficha (Para futurista o clásico) */}
                 <div className="h-10 w-full rounded bg-white/5 backdrop-blur-md border border-white/10 flex items-center px-4" style={{ borderLeftWidth: layout === "minimalist" ? 0 : 3, borderLeftColor: accentColor }} />
                 
                 {layout === "minimalist" ? (
                   <div className="w-full flex justify-between gap-3">
                     <div className="h-14 flex-1 rounded bg-white/5 backdrop-blur-md border border-white/5" />
                     <div className="h-14 flex-1 rounded bg-white/5 backdrop-blur-md border border-white/5" />
                   </div>
                 ) : (
                  <div className="h-20 w-full rounded-xl bg-white/5 backdrop-blur-md border border-white/10 shadow-lg" style={{ borderRadius: layout === "futuristic" ? "4px" : "16px" }} />
                 )}
               </div>
             )}
             
             {/* Decoración según Layout */}
             {layout === "futuristic" && (
               <div className="absolute bottom-0 right-0 w-32 h-32 bg-white blur-[100px] opacity-20 pointer-events-none rounded-full" style={{ background: accentColor }} />
             )}
             {layout === "vintage" && (
               <div className="absolute inset-0 bg-[#D97706] mix-blend-overlay opacity-[0.03] pointer-events-none noise-bg" />
             )}
             
             {/* Marca de agua flotante del preview */}
             <div className="absolute bottom-5 left-0 w-full flex flex-col items-center gap-1 z-20 opacity-50 mix-blend-luminosity">
                <span className="text-[9px] font-bold tracking-widest text-white uppercase opacity-70 border px-2 py-0.5 rounded-full border-white/20">{layout}</span>
             </div>
           </div>
        </SectionCard>
      </div>

    </div>
  );
}
