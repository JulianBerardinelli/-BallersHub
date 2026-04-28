"use client";

import { useState } from "react";
import { Button, Tabs, Tab } from "@heroui/react";
import { Plus } from "lucide-react";
import MediaUploadModal from "./MediaUploadModal";
import MediaGalleryGrid from "./MediaGalleryGrid";
import type { PlayerMedia } from "@/db/schema/media";

import { bhButtonClass } from "@/components/ui/BhButton";

export type ProfileContext = {
  fullName: string | null;
  currentClub: string | null;
  nationality: string | null;
};

export default function MultimediaManagerClient({
  media,
  profileContext,
}: {
  media: PlayerMedia[];
  profileContext: ProfileContext;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const photos = media.filter((m) => m.type === "photo");
  const videos = media.filter((m) => m.type === "video");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
            Tu catálogo
          </h2>
          <p className="text-[13px] text-bh-fg-3">
            Añadí material para mejorar tus chances de ser contactado.
          </p>
        </div>
        <Button
          onPress={() => setIsModalOpen(true)}
          startContent={<Plus className="h-4 w-4" />}
          className={bhButtonClass({ variant: "lime", size: "sm", className: "shrink-0" })}
        >
          Subir archivo
        </Button>
      </div>

      <MediaUploadModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        profileContext={profileContext}
      />

      <div className="flex w-full flex-col">
        <Tabs
          aria-label="Catálogo"
          variant="underlined"
          classNames={{
            tabList: "gap-6 w-full relative rounded-none p-0 border-b border-white/[0.06]",
            cursor: "w-full bg-bh-lime",
            tab: "max-w-fit px-0 h-12",
            tabContent:
              "text-bh-fg-3 group-data-[selected=true]:text-bh-fg-1 group-data-[selected=true]:font-semibold font-medium",
          }}
        >
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
