"use client";

import { useState } from "react";
import { Button, Tabs, Tab } from "@heroui/react";
import { Lock, Plus } from "lucide-react";
import MediaUploadModal from "./MediaUploadModal";
import MediaGalleryGrid from "./MediaGalleryGrid";
import type { PlayerMedia } from "@/db/schema/media";

import { bhButtonClass } from "@/components/ui/BhButton";
import UpgradeCta from "@/components/dashboard/plan/UpgradeCta";

export type ProfileContext = {
  fullName: string | null;
  currentClub: string | null;
  nationality: string | null;
};

export default function MultimediaManagerClient({
  media,
  profileContext,
  isPro,
}: {
  media: PlayerMedia[];
  profileContext: ProfileContext;
  isPro: boolean;
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
            {isPro
              ? "Añadí fotos y videos para mejorar tus chances de ser contactado."
              : "Cargá videos y highlights. Las fotos de catálogo son una feature Pro."}
          </p>
        </div>
        <Button
          onPress={() => setIsModalOpen(true)}
          startContent={<Plus className="h-4 w-4" />}
          className={bhButtonClass({ variant: "lime", size: "sm", className: "shrink-0" })}
        >
          {isPro ? "Subir archivo" : "Subir video"}
        </Button>
      </div>

      <MediaUploadModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        profileContext={profileContext}
        videoOnly={!isPro}
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
          <Tab
            key="photos"
            title={
              <span className="inline-flex items-center gap-1.5">
                Fotografías ({photos.length})
                {!isPro && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-bh-lime/40 bg-bh-lime/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-bh-lime">
                    <Lock size={8} /> Pro
                  </span>
                )}
              </span>
            }
          >
            <div className="pt-4">
              {isPro ? (
                <MediaGalleryGrid items={photos} />
              ) : (
                <div className="relative overflow-hidden rounded-bh-lg border border-dashed border-white/[0.10] bg-bh-surface-1/40 p-10 text-center">
                  <div className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-bh-md bg-bh-lime/15 text-bh-lime">
                    <Lock size={14} />
                  </div>
                  <h3 className="mt-3 font-bh-display text-base font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
                    Galería catálogo de fotos
                  </h3>
                  <p className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-[1.55] text-bh-fg-3">
                    Subí hasta 5 fotos de catálogo curadas para tu perfil público. Solo en plan Pro.
                  </p>
                  <div className="mt-3">
                    <UpgradeCta feature="catalogGallery" size="sm" />
                  </div>
                </div>
              )}
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
