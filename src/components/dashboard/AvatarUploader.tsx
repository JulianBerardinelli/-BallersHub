"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "@heroui/react";
import { UploadCloud, AlertCircle } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import AvatarCropperModal from "@/components/ui/AvatarCropperModal";
import SquooshHint from "@/components/ui/SquooshHint";
import { bhButtonClass } from "@/components/ui/bh-button-class";

const MAX_BYTES = 5 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AvatarUploader({
  playerId,
  currentAvatarUrl,
}: {
  playerId: string;
  currentAvatarUrl?: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Por favor, seleccioná una imagen válida.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(
        `La imagen pesa ${formatBytes(file.size)}. Reducila a ${formatBytes(MAX_BYTES)} o menos. Probá comprimir en squoosh.app.`,
      );
      e.target.value = "";
      return;
    }
    setError(null);
    setPickedFile(file);
    setCropperOpen(true);
  }

  async function uploadCropped(blob: Blob) {
    setError(null);
    setBusy(true);

    try {
      const key = `avatars/${playerId}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("player-media")
        .upload(key, blob, { upsert: true, cacheControl: "3600", contentType: "image/jpeg" });
      if (uploadError) throw new Error(uploadError.message);

      const { data: publicUrlData } = supabase.storage.from("player-media").getPublicUrl(key);
      const publicUrl = publicUrlData?.publicUrl ?? null;
      if (!publicUrl) throw new Error("No se pudo obtener la URL pública de la imagen subida.");

      await supabase
        .from("player_media")
        .delete()
        .eq("player_id", playerId)
        .eq("type", "photo")
        .eq("is_primary", true);

      const { error: mediaInsertError } = await supabase.from("player_media").insert({
        player_id: playerId,
        type: "photo",
        url: publicUrl,
        title: "Avatar principal",
        provider: "upload",
        is_primary: true,
      });
      if (mediaInsertError) throw new Error(mediaInsertError.message);

      const { error: profileUpdateError } = await supabase
        .from("player_profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", playerId);
      if (profileUpdateError) throw new Error(profileUpdateError.message);

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id ?? null;
      if (userId) {
        await supabase.from("profile_change_logs").insert({
          player_id: playerId,
          user_id: userId,
          field: "avatar_url",
          old_value: currentAvatarUrl ? { url: currentAvatarUrl } : null,
          new_value: { url: publicUrl },
        });
      }

      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (uploadErr) {
      const message = uploadErr instanceof Error ? uploadErr.message : "Ocurrió un error al subir el avatar.";
      setError(message);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        ref={fileInputRef}
        onChange={onPick}
      />

      <Button
        size="sm"
        isDisabled={busy}
        isLoading={busy}
        startContent={!busy && <UploadCloud className="size-4" />}
        onPress={() => fileInputRef.current?.click()}
        className={bhButtonClass({ variant: "lime", size: "sm" })}
      >
        {currentAvatarUrl ? "Cambiar avatar" : "Subir avatar"}
      </Button>

      {error && (
        <div className="flex items-start gap-2 rounded-bh-md border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] p-2 text-xs text-bh-danger">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <SquooshHint maxBytes={MAX_BYTES} accept="image/jpeg,image/png,image/webp" />

      <AvatarCropperModal
        isOpen={cropperOpen}
        onOpenChange={(open) => {
          setCropperOpen(open);
          if (!open) {
            setPickedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
        }}
        file={pickedFile}
        outputSize={480}
        onConfirm={uploadCropped}
      />
    </div>
  );
}
