"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, CheckCircle, Image as ImageIcon, ExternalLink, Info, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
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
  userId,
}: ProAssetsProps) {
  const [isUploading, setIsUploading] = useState<AssetType | null>(null);
  const [previews, setPreviews] = useState<Record<AssetType, string | null>>({
    heroUrl: currentHeroUrl,
    modelUrl1: currentModelUrl1,
    modelUrl2: currentModelUrl2,
  });
  const router = useRouter();
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

      setPreviews((prev) => ({ ...prev, [assetType]: res.url as string }));
      router.refresh();

      const slotName = slots.find((s) => s.type === assetType)?.title ?? "Asset PNG";

      enqueue(
        profileNotification.updated({
          sectionLabel: "tu Portfolio Pro",
          changedFields: [slotName],
        }),
      );
    } catch (err: any) {
      console.error(err);
      enqueue(
        announcementNotification.general({
          headline: "Error al subir la imagen",
          body: err.message || "Hubo un problema procesando tu imagen. Intenta de nuevo.",
        }),
      );
    } finally {
      setIsUploading(null);
    }
  };

  const slots: { type: AssetType; title: string; desc: string }[] = [
    { type: "heroUrl", title: "Hero asset", desc: "Imagen principal gigante para la portada." },
    { type: "modelUrl1", title: "Modelado 1", desc: "Imagen de cuerpo entero para acompañar estadísticas." },
    { type: "modelUrl2", title: "Modelado 2", desc: "Imagen secundaria para secciones interactivas." },
  ];

  return (
    <div className="mb-8 space-y-6 rounded-bh-lg border border-[rgba(204,255,0,0.18)] bg-[rgba(204,255,0,0.04)] p-6 shadow-[0_0_24px_rgba(204,255,0,0.06)]">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-bh-md border border-[rgba(204,255,0,0.22)] bg-[rgba(204,255,0,0.10)] text-bh-lime">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <span className="font-bh-display text-[10px] font-bold uppercase tracking-[0.14em] text-bh-lime">
              Pro layout
            </span>
            <h3 className="font-bh-display text-xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
              Assets pro
            </h3>
          </div>
        </div>
        <p className="text-[13px] leading-[1.55] text-bh-fg-3">
          Subí tus imágenes en formato{" "}
          <strong className="text-bh-fg-1">PNG (con fondo transparente)</strong>{" "}
          para habilitar el modelo 3D y los elementos dinámicos de tu portfolio Pro.
        </p>
      </div>

      <div className="flex flex-col items-start gap-4 rounded-bh-md border border-[rgba(204,255,0,0.18)] bg-[rgba(204,255,0,0.06)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-bh-lime" />
          <div className="space-y-1">
            <p className="text-[13px] font-semibold text-bh-fg-1">
              Mejorá la velocidad de tu perfil
            </p>
            <p className="max-w-xl text-[12px] leading-[1.55] text-bh-fg-3">
              Recomendamos comprimir tus imágenes PNG antes de subirlas. Esto
              garantizará una carga rápida y fluida para quienes visiten tu
              perfil. Podés usar herramientas gratuitas como Squoosh.
            </p>
          </div>
        </div>
        <a
          href="https://squoosh.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-2 rounded-bh-md border border-[rgba(204,255,0,0.22)] bg-[rgba(204,255,0,0.10)] px-3 py-1.5 text-[12px] font-medium text-bh-lime transition-colors hover:bg-[rgba(204,255,0,0.16)]"
        >
          Ir a Squoosh.app
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {slots.map((slot) => (
          <div key={slot.type} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h4 className="font-bh-heading text-sm font-semibold text-bh-fg-1">
                {slot.title}
              </h4>
            </div>

            {/* Preview Zone */}
            <div className="group relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-bh-lg border border-white/[0.12] bg-bh-surface-1">
              {previews[slot.type] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previews[slot.type]!}
                  alt={slot.title}
                  className="h-full w-full select-none object-cover"
                />
              ) : (
                <div className="flex flex-col items-center p-4 text-bh-fg-4">
                  <ImageIcon className="mb-2 h-8 w-8" />
                  <span className="text-[11px]">Sin imagen</span>
                </div>
              )}
              {isUploading === slot.type && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <span className="animate-pulse font-bh-display text-sm font-bold uppercase tracking-[0.1em] text-bh-lime">
                    Subiendo...
                  </span>
                </div>
              )}

              <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
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
                  className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-bh-md bg-bh-lime px-4 text-[12px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
                >
                  <Upload className="h-4 w-4" />
                  {previews[slot.type] ? "Reemplazar" : "Subir PNG"}
                </label>
              </div>
            </div>
            <p className="text-center text-[11px] text-bh-fg-4">{slot.desc}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded-bh-md border border-white/[0.08] bg-bh-surface-1/60 p-4 text-[12px] text-bh-fg-3">
        <p>
          <CheckCircle className="mr-1 inline-block h-4 w-4 text-bh-success" />
          Resolución ideal: <span className="font-bh-mono">1080×1350px</span>.
        </p>
        <p>
          <CheckCircle className="mr-1 inline-block h-4 w-4 text-bh-success" />
          Formato <span className="font-bh-mono">.png</span> para asegurar
          fondo transparente.
        </p>
        <p>
          <X className="mr-1 inline-block h-4 w-4 text-bh-danger" />
          No subas fotos cuadradas con estadios de fondo, rompen el efecto 3D.
        </p>
      </div>
    </div>
  );
}
