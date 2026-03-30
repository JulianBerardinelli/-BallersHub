"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import MediaUploadModal from "./MediaUploadModal";
import MediaGalleryGrid from "./MediaGalleryGrid";
import type { PlayerMedia } from "@/db/schema/media";

export type ProfileContext = {
  fullName: string | null;
  currentClub: string | null;
  nationality: string | null;
};

export default function MultimediaManagerClient({ 
  media, 
  profileContext 
}: { 
  media: PlayerMedia[];
  profileContext: ProfileContext;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const photos = media.filter((m) => m.type === "photo");
  const videos = media.filter((m) => m.type === "video");

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-neutral-900/40 border border-neutral-800 p-6 rounded-2xl">
        <div>
          <h2 className="text-lg font-bold text-white mb-1">Tu Catálogo</h2>
          <p className="text-sm text-neutral-400">
            Añade material para mejorar tus chances de ser contactado.
          </p>
        </div>
        <Button color="primary" onPress={() => setIsModalOpen(true)} className="font-semibold">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Subir Archivo
        </Button>
      </div>

      <MediaUploadModal 
        isOpen={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        profileContext={profileContext}
      />

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white tracking-tight border-b border-neutral-800 pb-2">Fotografías</h3>
        <MediaGalleryGrid items={photos} />
      </div>

      <div className="space-y-4 pt-4">
        <h3 className="text-xl font-semibold text-white tracking-tight border-b border-neutral-800 pb-2">Videos & Highlights</h3>
        <MediaGalleryGrid items={videos} />
      </div>
    </div>
  );
}
