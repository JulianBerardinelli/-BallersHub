"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { UploadCloud, AlertCircle } from "lucide-react";
import AvatarCropperModal from "@/components/ui/AvatarCropperModal";

const MAX_BYTES = 8 * 1024 * 1024;

// Avatar / hero (Pro asset) uploader for the coach profile editor. Posts to
// /api/coach/profile-image/upload (AVIF transcode + coach_profiles update).
//   • mode="avatar" → square crop via AvatarCropperModal, shown round.
//   • mode="hero"   → free-form (transparent cutout), uploaded as-is.
export default function CoachImageUploader({
  mode,
  currentUrl,
}: {
  mode: "avatar" | "hero";
  currentUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);

  const isAvatar = mode === "avatar";

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Subí una imagen (JPG, PNG, WebP o AVIF).");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("La imagen supera el límite de 8MB.");
      e.target.value = "";
      return;
    }
    setError(null);
    if (isAvatar) {
      setPickedFile(file);
      setCropperOpen(true);
    } else {
      void upload(file);
    }
  }

  async function upload(blob: Blob) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", new File([blob], `${mode}.img`, { type: blob.type || "image/jpeg" }));
      fd.append("assetType", mode);
      const res = await fetch("/api/coach/profile-image/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "No se pudo subir la imagen.");
      setPreview(json.url);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir la imagen.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className={`relative shrink-0 overflow-hidden border border-white/[0.12] bg-bh-surface-2 ${
          isAvatar ? "size-20 rounded-full" : "h-20 w-28 rounded-bh-md"
        }`}
      >
        {preview ? (
          <Image
            src={preview}
            alt={isAvatar ? "Avatar" : "Asset Pro"}
            fill
            sizes="112px"
            className={isAvatar ? "object-cover" : "object-contain"}
            unoptimized
          />
        ) : (
          <div className="flex size-full items-center justify-center text-center text-[10px] text-bh-fg-4">
            {isAvatar ? "Sin avatar" : "Sin asset"}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={onPick}
        />
        <Button
          size="sm"
          isDisabled={busy}
          isLoading={busy}
          startContent={!busy && <UploadCloud className="size-4" />}
          onPress={() => inputRef.current?.click()}
          className="rounded-bh-md bg-bh-lime px-4 py-2 text-[13px] font-semibold text-bh-black hover:bg-[#d8ff26]"
        >
          {preview ? "Cambiar" : "Subir"}
        </Button>
        <p className="max-w-[260px] text-[11px] leading-[1.4] text-bh-fg-4">
          {isAvatar
            ? "Foto cuadrada (rostro). Se usa en la barra y en tu página."
            : "Imagen recortada con fondo transparente (PNG). Se muestra en el hero del layout Pro."}
        </p>
        {error && (
          <p className="flex items-start gap-1.5 text-[12px] text-bh-danger">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            {error}
          </p>
        )}
      </div>

      {isAvatar && (
        <AvatarCropperModal
          isOpen={cropperOpen}
          onOpenChange={(open) => {
            setCropperOpen(open);
            if (!open) {
              setPickedFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }
          }}
          file={pickedFile}
          outputSize={640}
          onConfirm={(blob) => upload(blob)}
        />
      )}
    </div>
  );
}
