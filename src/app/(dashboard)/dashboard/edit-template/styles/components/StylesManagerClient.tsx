"use client";

import { useState, useEffect } from "react";
import { Button, Input } from "@heroui/react";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { updateThemeSettingsAction } from "@/app/actions/template-settings";
import { useNotificationContext, profileNotification } from "@/modules/notifications";
import type { DashboardThemeSettings } from "@/lib/dashboard/client/publishing-state";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

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
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex gap-3 text-amber-500 items-start">
             <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
             <div>
               <p className="font-semibold text-sm">Falta el Hero Asset</p>
               <p className="text-xs text-amber-500/80 mt-1 mb-2">Para usar esta plantilla necesitas subir tu recorte en la sección multimedia. Si se publica así, el sistema volverá al modo Minimalista hasta que lo cargues.</p>
               <Link href="/dashboard/edit-profile/multimedia" className="text-xs font-bold underline hover:text-white">Subir ahora en Multimedia &rarr;</Link>
             </div>
          </div>
        )}

        <SectionCard title="Diseño base" description="Elegí la estructura y vibra general de tu perfil público.">
          <div className="grid gap-4 md:grid-cols-2">
            {TEMPLATE_OPTIONS.map(opt => (
              <div 
                key={opt.id} 
                onClick={() => setLayout(opt.id)}
                className={`relative overflow-hidden cursor-pointer flex flex-col gap-3 rounded-xl border p-4 text-sm transition-all ${layout === opt.id ? 'border-primary bg-primary/10 shadow-sm shadow-primary/20' : 'border-neutral-800 bg-neutral-950/40 opacity-70 hover:opacity-100 hover:border-neutral-600'}`}
              >
                {opt.id === "pro" && <div className="absolute -right-6 top-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-[10px] font-bold text-white px-8 py-0.5 rotate-45">PREMIUM</div>}
                <div className="aspect-video w-full rounded-lg border border-dashed border-neutral-800 bg-gradient-to-br from-neutral-800 to-neutral-900 relative overflow-hidden flex items-center justify-center">
                   {opt.id === "pro" ? <span className="text-4xl font-black italic tracking-widest opacity-20 truncate">PRO</span> : null}
                </div>
                <div>
                  <p className="text-base font-semibold text-white">{opt.name}</p>
                  <p className="text-xs text-neutral-400 leading-relaxed mt-1">{opt.description}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Colores de Marca" description="Elegí una paleta preestablecida o definí manualmente los colores de tu identidad.">
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            {COLOR_PRESETS.map(preset => (
              <div 
                key={preset.id} 
                onClick={() => applyColorPreset(preset.primary, preset.secondary, preset.accent, preset.background)}
                className="cursor-pointer rounded-lg border border-neutral-800 hover:border-neutral-500 bg-neutral-950/40 p-4 text-center text-sm transition-all text-neutral-200"
              >
                <div className={`mx-auto mb-3 h-20 w-full rounded-md shadow-inner bg-gradient-to-br ${preset.gradient}`} />
                <p className="font-semibold text-white tracking-wide">{preset.label}</p>
                <p className="text-xs text-neutral-500 mt-1 uppercase">Preset</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Input 
              label="Color de Fondo (Background)" 
              placeholder="#050505" 
              value={backgroundColor} 
              onChange={e => setBackgroundColor(e.target.value)} 
              startContent={
                <div className="relative w-7 h-7 rounded-md overflow-hidden border border-neutral-700 shadow-sm flex-shrink-0 cursor-pointer">
                  <input type="color" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} className="absolute -top-[10px] -left-[10px] w-20 h-20 opacity-0 cursor-pointer" />
                  <div className="w-full h-full pointer-events-none" style={{ backgroundColor: backgroundColor }} />
                </div>
              }
              classNames={{ input: "font-mono uppercase text-sm font-medium tracking-widest pl-2", inputWrapper: "h-16 shadow-inner bg-neutral-900 border-neutral-800", label: "text-neutral-400 font-medium" }}
            />
            <Input 
              label="Color Primario (Luces Principales)" 
              placeholder="#10B981" 
              value={primaryColor} 
              onChange={e => setPrimaryColor(e.target.value)} 
              startContent={
                <div className="relative w-7 h-7 rounded-md overflow-hidden border border-neutral-700 shadow-sm flex-shrink-0 cursor-pointer">
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="absolute -top-[10px] -left-[10px] w-20 h-20 opacity-0 cursor-pointer" />
                  <div className="w-full h-full pointer-events-none" style={{ backgroundColor: primaryColor }} />
                </div>
              }
              classNames={{ input: "font-mono uppercase text-sm font-medium tracking-widest pl-2", inputWrapper: "h-16 shadow-inner bg-neutral-900 border-neutral-800", label: "text-neutral-400 font-medium" }}
            />
            <Input 
              label="Color Secundario (Sombras/Gradientes)"
              placeholder="#2A2A2A" 
              value={secondaryColor} 
              onChange={e => setSecondaryColor(e.target.value)} 
              startContent={
                <div className="relative w-7 h-7 rounded-md overflow-hidden border border-neutral-700 shadow-sm flex-shrink-0 cursor-pointer">
                  <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="absolute -top-[10px] -left-[10px] w-20 h-20 opacity-0 cursor-pointer" />
                  <div className="w-full h-full pointer-events-none" style={{ backgroundColor: secondaryColor }} />
                </div>
              }
              classNames={{ input: "font-mono uppercase text-sm font-medium tracking-widest pl-2", inputWrapper: "h-16 shadow-inner bg-neutral-900 border-neutral-800", label: "text-neutral-400 font-medium" }}
            />
            <Input 
              label="Color de Acento (Textos Destacados)"
              placeholder="#34D399" 
              value={accentColor} 
              onChange={e => setAccentColor(e.target.value)} 
              startContent={
                <div className="relative w-7 h-7 rounded-md overflow-hidden border border-neutral-700 shadow-sm flex-shrink-0 cursor-pointer">
                  <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="absolute -top-[10px] -left-[10px] w-20 h-20 opacity-0 cursor-pointer" />
                  <div className="w-full h-full pointer-events-none" style={{ backgroundColor: accentColor }} />
                </div>
              }
              classNames={{ input: "font-mono uppercase text-sm font-medium tracking-widest pl-2", inputWrapper: "h-16 shadow-inner bg-neutral-900 border-neutral-800", label: "text-neutral-400 font-medium" }}
            />
          </div>
        </SectionCard>

        <SectionCard title="Tipografía" description="Seleccioná un par tipográfico que se adapte al estilo que elegiste.">
          <div className="grid gap-4 md:grid-cols-2">
            {fontsForLayout.map(font => (
              <div
                key={font.id}
                onClick={() => setTypography(font.id)}
                className={`cursor-pointer rounded-lg border p-4 text-sm transition-all ${typography === font.id ? 'border-primary bg-primary/10' : 'border-neutral-800 bg-neutral-950/40 hover:border-neutral-600'}`}
              >
                <p className="font-bold text-white text-base">{font.label}</p>
                <p className="text-xs text-neutral-400 mt-1">Familia ideal para estilo {TEMPLATE_OPTIONS.find(l => l.id === layout)?.name}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="flex justify-end pt-4 pb-12 lg:pb-4">
          <Button color="primary" size="lg" onPress={handleSave} isLoading={saving}>
            Guardar Diseño
          </Button>
        </div>

      </div>

      {/* Columna Derecha: Vista Previa Flotante */}
      <div className="lg:col-span-4 sticky top-24 z-10">
        <SectionCard title="Live Preview" description="Una vista veloz adaptada al dispositivo.">
           <div className="relative mx-auto max-w-[280px] aspect-[9/18] rounded-[2rem] border-8 border-neutral-800 shadow-2xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]" style={{ backgroundColor: primaryColor }}>
             {/* Mini Notch falso */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-neutral-800 rounded-b-2xl z-20" />
             
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
