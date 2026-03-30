"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@heroui/react";
import { UploadCloud, XCircle } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

type Props = {
  agencyId: string;
  currentLogoUrl?: string | null;
  onUploadSuccess: (newUrl: string) => void;
};

export default function AgencyLogoUploader({ agencyId, currentLogoUrl, onUploadSuccess }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecciona una imagen válida.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no debe superar los 5MB.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${agencyId}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("agency-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("agency-logos")
        .getPublicUrl(filePath);

      onUploadSuccess(publicUrlData.publicUrl);
    } catch (err: unknown) {
      console.error("Error uploading logo:", err);
      setError("Error al subir la imagen. Inténtalo de nuevo.");
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex flex-col items-center sm:flex-row gap-6">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-full border border-neutral-800 bg-neutral-900 flex items-center justify-center">
        {currentLogoUrl ? (
          <Image
            src={currentLogoUrl}
            alt="Agency Logo"
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="text-neutral-500 text-xs text-center px-2">Sin Logo</span>
        )}
      </div>

      <div className="flex-1 space-y-3 text-center sm:text-left">
        <div>
          <h3 className="text-sm font-medium text-white">Logo de la Agencia</h3>
          <p className="text-xs text-neutral-400 mt-1">
            Recomendado: 512x512px. JPG, PNG o WebP, máximo 5MB.
          </p>
        </div>

        <div className="flex items-center justify-center sm:justify-start gap-3">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <Button
            size="sm"
            color="primary"
            variant="flat"
            isLoading={isUploading}
            startContent={!isUploading && <UploadCloud className="size-4" />}
            onPress={() => fileInputRef.current?.click()}
          >
            Subir nueva imagen
          </Button>

          {error && (
            <div className="flex items-center text-xs text-red-500 gap-1">
               <XCircle className="size-3" /> {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
