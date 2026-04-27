"use client";

import { useState } from "react";
import { Button, Tabs, Tab } from "@heroui/react";
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-neutral-900/40 border border-neutral-800 p-6 rounded-2xl">
        <div>
          <h2 className="text-lg font-bold text-white mb-1">Tu Catálogo</h2>
          <p className="text-sm text-neutral-400">
            Añade material para mejorar tus chances de ser contactado.
          </p>
        </div>
        <Button color="primary" onPress={() => setIsModalOpen(true)} className="font-semibold shrink-0">
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

      <div className="flex w-full flex-col">
        <Tabs aria-label="Catálogo" color="primary" variant="underlined" classNames={{
          tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
          cursor: "w-full bg-emerald-500",
          tab: "max-w-fit px-0 h-12",
          tabContent: "group-data-[selected=true]:text-emerald-500 group-data-[selected=true]:font-semibold"
        }}>
          <Tab key="photos" title={`Fotografías (${photos.length})`}>
            <div className="pt-4">
              <MediaGalleryGrid items={photos} />
            </div>
          </Tab>
          <Tab key="videos" title={`Videos & Highlights (${videos.length})`}>
            <div className="pt-4">
              <MediaGalleryGrid items={videos} />
            </div>
          </Tab>
        </Tabs>
      </div>
    </div>
  );
}
