"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { Plus } from "lucide-react";

import AgencyMediaGrid, { type AgencyMediaItem } from "./AgencyMediaGrid";
import AgencyMediaUploadModal from "./AgencyMediaUploadModal";
import { AGENCY_MEDIA_MAX } from "@/app/actions/agency-media-constants";
import { bhButtonClass } from "@/components/ui/bh-button-class";

type AgencyContext = {
  name: string;
  headquarters: string | null;
  operativeCountries: string[] | null;
};

type Props = {
  agencyId: string;
  media: AgencyMediaItem[];
  agencyContext: AgencyContext;
};

export default function AgencyMediaManagerClient({
  agencyId,
  media,
  agencyContext,
}: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const remaining = AGENCY_MEDIA_MAX - media.length;
  const canUpload = remaining > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
            Catálogo de la agencia
          </h2>
          <p className="text-[13px] text-bh-fg-3">
            Hasta {AGENCY_MEDIA_MAX} imágenes para enriquecer el portfolio público (oficinas, equipo, eventos, presentaciones).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-bh-mono text-[11px] text-bh-fg-4">
            {media.length}/{AGENCY_MEDIA_MAX}
          </span>
          <Button
            onPress={() => setIsModalOpen(true)}
            startContent={<Plus className="h-4 w-4" />}
            isDisabled={!canUpload}
            className={bhButtonClass({ variant: "lime", size: "sm", className: "shrink-0" })}
          >
            Subir imagen
          </Button>
        </div>
      </div>

      <AgencyMediaUploadModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        agencyId={agencyId}
        agencyContext={agencyContext}
      />

      <AgencyMediaGrid items={media} />
    </div>
  );
}
