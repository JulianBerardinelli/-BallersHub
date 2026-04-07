"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, CheckCircle, Image as ImageIcon } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { updateHeroUrlAction } from "@/app/actions/hero-asset";

export default function HeroAssetUploaderClient({ currentHeroUrl, playerId, userId }: { currentHeroUrl: string | null, playerId: string, userId: string }) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentHeroUrl);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.includes("png")) {
      alert("Debes subir un archivo en formato PNG (Idealmente sin fondo).");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await updateHeroUrlAction(formData);
      if (!res.success) throw new Error(res.error);

      setPreview(res.url as string);
      router.refresh();
      alert("Hero Asset actualizado exitosamente!");
    } catch (err: any) {
      console.error(err);
      alert("Error al subir el archivo: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 shadow-md shadow-emerald-500/10 mb-8 p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
           <ImageIcon className="w-5 h-5 text-emerald-500" />
           Hero Asset (Pro Layout)
        </h3>
        <p className="text-sm text-neutral-500">
          Para habilitar el Layout "Pro Athlete Portfolio", subí una imagen tuya en formato <b>PNG (con fondo transparente)</b>. Se mostrará gigantezada en la portada de tu web pública.
        </p>
      </div>
      
      <div>
        <div className="flex flex-col md:flex-row gap-8 items-start">
           
           {/* Preview Zone */}
           <div className="w-48 h-64 shrink-0 bg-neutral-900 rounded-xl border border-neutral-700 overflow-hidden relative flex items-center justify-center">
             {preview ? (
               // eslint-disable-next-line @next/next/no-img-element
               <img src={preview} alt="Hero Cutout" className="w-full h-full object-cover select-none" />
             ) : (
               <div className="text-center p-4 opacity-50 flex flex-col items-center">
                 <ImageIcon className="w-8 h-8 mb-2" />
                 <span className="text-xs">Sin Recorte PNG</span>
               </div>
             )}
             {isUploading && (
               <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                 <span className="animate-pulse text-sm font-bold text-white">Subiendo...</span>
               </div>
             )}
           </div>

           {/* Guidelines */}
           <div className="flex-1 space-y-4">
              <div className="text-sm space-y-2 text-neutral-600 dark:text-neutral-400">
                <p><CheckCircle className="w-4 h-4 inline-block mr-1 text-emerald-500" /> Resolucion ideal: 1080x1350px.</p>
                <p><CheckCircle className="w-4 h-4 inline-block mr-1 text-emerald-500" /> Formato `.png` para asegurar fondo transparente.</p>
                <p><X className="w-4 h-4 inline-block mr-1 text-red-500" /> No subas fotos cuadradas con estadios de fondo, rompen el efecto 3D.</p>
              </div>

              <div className="pt-4">
                <input 
                  type="file" 
                  accept="image/png" 
                  id="heroUpload" 
                  className="hidden" 
                  onChange={handleFileChange} 
                  disabled={isUploading}
                />
                <button disabled={isUploading} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50 bg-emerald-600 text-white shadow hover:bg-emerald-700 h-9 px-4 py-2 cursor-pointer">
                  <label htmlFor="heroUpload" className="flex items-center gap-2 cursor-pointer w-full h-full">
                    <Upload className="w-4 h-4" />
                    {preview ? "Reemplazar Asset PNG" : "Subir Asset PNG"}
                  </label>
                </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
