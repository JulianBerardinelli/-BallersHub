"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, CheckCircle, Image as ImageIcon, ExternalLink, Info } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { updateProAssetAction } from "@/app/actions/pro-assets";
import { announcementNotification, profileNotification, useNotificationContext } from "@/modules/notifications";

interface ProAssetsProps {
  currentHeroUrl: string | null;
  currentModelUrl1: string | null;
  currentModelUrl2: string | null;
  playerId: string;
  userId: string;
}

type AssetType = "heroUrl" | "modelUrl1" | "modelUrl2";

export default function ProAssetsUploaderClient({ 
  currentHeroUrl, 
  currentModelUrl1, 
  currentModelUrl2,
  playerId, 
  userId 
}: ProAssetsProps) {
  const [isUploading, setIsUploading] = useState<AssetType | null>(null);
  const [previews, setPreviews] = useState<Record<AssetType, string | null>>({
    heroUrl: currentHeroUrl,
    modelUrl1: currentModelUrl1,
    modelUrl2: currentModelUrl2,
  });
  const router = useRouter();
  const supabase = createClientComponentClient();
  const { enqueue } = useNotificationContext();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, assetType: AssetType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.includes("png")) {
      alert("Debes subir un archivo en formato PNG (Idealmente sin fondo).");
      return;
    }

    setIsUploading(assetType);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("assetType", assetType);
      
      const res = await updateProAssetAction(formData);
      if (!res.success) throw new Error(res.error);

      setPreviews(prev => ({ ...prev, [assetType]: res.url as string }));
      router.refresh();
      
      const slotName = slots.find(s => s.type === assetType)?.title ?? "Asset PNG";
      
      enqueue(
        profileNotification.updated({
          sectionLabel: "tu Portfolio Pro",
          changedFields: [slotName],
        })
      );
      
    } catch (err: any) {
      console.error(err);
      enqueue(
        announcementNotification.general({
          headline: "Error al subir la imagen ⚠️",
          body: err.message || "Hubo un problema procesando tu imagen. Intenta de nuevo.",
        })
      );
    } finally {
      setIsUploading(null);
    }
  };

  const slots: { type: AssetType; title: string; desc: string }[] = [
    { type: "heroUrl", title: "Hero Asset", desc: "Imagen principal gigante para la portada." },
    { type: "modelUrl1", title: "Modelado 1", desc: "Imagen de cuerpo entero para acompañar estadísticas." },
    { type: "modelUrl2", title: "Modelado 2", desc: "Imagen secundaria para secciones interactivas." },
  ];

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 shadow-md shadow-emerald-500/10 mb-8 p-6 space-y-6">
      <div>
        <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
           <ImageIcon className="w-5 h-5 text-emerald-500" />
           Assets (Pro Layout)
        </h3>
        <p className="text-sm text-neutral-500">
          Sube tus imágenes en formato <b>PNG (con fondo transparente)</b> para habilitar el modelo 3D y elementos dinámicos en tu portfolio Pro.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <div className="flex gap-3 items-start">
          <Info className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Mejora la velocidad de tu perfil
            </p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xl">
              Recomendamos comprimir tus imágenes PNG antes de subirlas. Esto garantizará una carga rápida y fluida para quienes visiten tu perfil. Puedes usar herramientas gratuitas como Squoosh.
            </p>
          </div>
        </div>
        <a 
          href="https://squoosh.app/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-md transition-colors"
        >
          Ir a Squoosh.app
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {slots.map((slot) => (
          <div key={slot.type} className="flex flex-col gap-3">
             <div className="flex items-center gap-2">
               <h4 className="font-semibold text-sm">{slot.title}</h4>
             </div>
             
             {/* Preview Zone */}
             <div className="w-full aspect-[4/5] bg-neutral-900 rounded-xl border border-neutral-700 overflow-hidden relative flex items-center justify-center group">
               {previews[slot.type] ? (
                 // eslint-disable-next-line @next/next/no-img-element
                 <img src={previews[slot.type]!} alt={slot.title} className="w-full h-full object-cover select-none" />
               ) : (
                 <div className="text-center p-4 opacity-50 flex flex-col items-center">
                   <ImageIcon className="w-8 h-8 mb-2" />
                   <span className="text-xs">Sin imagen</span>
                 </div>
               )}
               {isUploading === slot.type && (
                 <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-10">
                   <span className="animate-pulse text-sm font-bold text-white">Subiendo...</span>
                 </div>
               )}
               
               <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                 <input 
                    type="file" 
                    accept="image/png" 
                    id={`upload-${slot.type}`} 
                    className="hidden" 
                    onChange={(e) => handleFileChange(e, slot.type)} 
                    disabled={isUploading !== null}
                  />
                  <label 
                    htmlFor={`upload-${slot.type}`} 
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50 bg-emerald-600 text-white shadow hover:bg-emerald-700 h-9 px-4 py-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {previews[slot.type] ? "Reemplazar" : "Subir PNG"}
                  </label>
               </div>
             </div>
             <p className="text-xs text-neutral-500 text-center">{slot.desc}</p>
          </div>
        ))}
      </div>

      <div className="text-sm space-y-2 text-neutral-600 dark:text-neutral-400 bg-neutral-900/50 p-4 rounded-lg border border-neutral-800">
        <p><CheckCircle className="w-4 h-4 inline-block mr-1 text-emerald-500" /> Resolución ideal: 1080x1350px.</p>
        <p><CheckCircle className="w-4 h-4 inline-block mr-1 text-emerald-500" /> Formato `.png` para asegurar fondo transparente.</p>
        <p><X className="w-4 h-4 inline-block mr-1 text-red-500" /> No subas fotos cuadradas con estadios de fondo, rompen el efecto 3D.</p>
      </div>

    </div>
  );
}
