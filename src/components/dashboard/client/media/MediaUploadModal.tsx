"use client";

import { useRouter } from "next/navigation";

import MediaCatalogModal, {
  type SeoSuggestionsByTab,
} from "./MediaCatalogModal";
import { ProfileContext } from "./MultimediaManagerClient";

type MediaUploadModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  profileContext?: ProfileContext;
};

export default function MediaUploadModal({ isOpen, onOpenChange, profileContext }: MediaUploadModalProps) {
  const router = useRouter();

  const playerName = profileContext?.fullName || "Jugador";
  const playerClub = profileContext?.currentClub || "su equipo";
  let playerNat = profileContext?.nationality || "";
  if (playerNat && playerNat.length === 2) {
    try {
      playerNat = new Intl.DisplayNames(["es"], { type: "region" }).of(playerNat) || playerNat;
    } catch {
      // Ignore if invalid code.
    }
  }

  const photoTagSuggestions = [playerNat, playerClub, "futbolista", "foto perfil"]
    .filter(Boolean)
    .join(", ");
  const videoTagSuggestions = [playerNat, playerClub, "highlights", "skills", "temporada", "posicion"]
    .filter(Boolean)
    .join(", ");

  const seo: SeoSuggestionsByTab = {
    photo: {
      titles: [
        `${playerName} jugando con ${playerClub}`,
        `Retrato oficial de ${playerName}`,
      ],
      altTexts: [
        `Fotografía de ${playerName} jugando al fútbol`,
        `Retrato deportivo de ${playerName} con la camiseta de ${playerClub}`,
      ],
      tags: photoTagSuggestions,
    },
    video: {
      titles: [
        `${playerName} - Highlight Video ${new Date().getFullYear()}`,
        `Mejores jugadas de ${playerName} en ${playerClub}`,
      ],
      altTexts: [
        `Video de mejores jugadas y skills de ${playerName}`,
        `Competición y highlights de ${playerName} durante la temporada`,
      ],
      tags: videoTagSuggestions,
    },
  };

  return (
    <MediaCatalogModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      modalTitle="Añadir multimedia"
      modalSubtitle="Subí fotos o videos para enriquecer tu perfil público."
      features={{ videos: true, tags: true, isPrimary: true }}
      seo={seo}
      onSubmit={async ({ type, file, videoUrl, title, altText, tags, isPrimary, provider }) => {
        const formData = new FormData();
        formData.append("type", type);
        formData.append("title", title);
        formData.append("altText", altText);
        formData.append("tags", tags);
        formData.append("isPrimary", String(isPrimary));

        if (file) {
          formData.append("file", file);
        } else if (type === "video" && videoUrl) {
          formData.append("url", videoUrl);
          if (provider) formData.append("provider", provider);
        }

        const response = await fetch("/api/media/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({} as { error?: string }));
          throw new Error(data.error || "Error al subir el archivo");
        }
      }}
      onSuccess={() => router.refresh()}
    />
  );
}
