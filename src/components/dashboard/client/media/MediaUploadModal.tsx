"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import MediaCatalogModal, {
  type SeoSuggestionsByTab,
} from "./MediaCatalogModal";
import { ProfileContext } from "./MultimediaManagerClient";

type MediaUploadModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  profileContext?: ProfileContext;
  /** When true, the modal disables photo uploads (Free plan). */
  videoOnly?: boolean;
};

export default function MediaUploadModal({ isOpen, onOpenChange, profileContext, videoOnly = false }: MediaUploadModalProps) {
  const router = useRouter();
  const t = useTranslations("dashEditProfile");
  const locale = useLocale();

  const playerName = profileContext?.fullName || t("media.uploadModal.playerFallback");
  const playerClub = profileContext?.currentClub || t("media.uploadModal.clubFallback");
  let playerNat = profileContext?.nationality || "";
  if (playerNat && playerNat.length === 2) {
    try {
      playerNat = new Intl.DisplayNames([locale], { type: "region" }).of(playerNat) || playerNat;
    } catch {
      // Ignore if invalid code.
    }
  }

  const currentYear = new Date().getFullYear();

  const photoTagSuggestions = [
    playerNat,
    playerClub,
    t("media.uploadModal.tagFootballer"),
    t("media.uploadModal.tagProfilePhoto"),
  ]
    .filter(Boolean)
    .join(", ");
  const videoTagSuggestions = [
    playerNat,
    playerClub,
    t("media.uploadModal.tagHighlights"),
    t("media.uploadModal.tagSkills"),
    t("media.uploadModal.tagSeason"),
    t("media.uploadModal.tagPosition"),
  ]
    .filter(Boolean)
    .join(", ");

  const seo: SeoSuggestionsByTab = {
    photo: {
      titles: [
        t("media.uploadModal.seo.photoTitle1", { name: playerName, club: playerClub }),
        t("media.uploadModal.seo.photoTitle2", { name: playerName }),
      ],
      altTexts: [
        t("media.uploadModal.seo.photoAlt1", { name: playerName }),
        t("media.uploadModal.seo.photoAlt2", { name: playerName, club: playerClub }),
      ],
      tags: photoTagSuggestions,
    },
    video: {
      titles: [
        t("media.uploadModal.seo.videoTitle1", { name: playerName, year: currentYear }),
        t("media.uploadModal.seo.videoTitle2", { name: playerName, club: playerClub }),
      ],
      altTexts: [
        t("media.uploadModal.seo.videoAlt1", { name: playerName }),
        t("media.uploadModal.seo.videoAlt2", { name: playerName }),
      ],
      tags: videoTagSuggestions,
    },
  };

  return (
    <MediaCatalogModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      modalTitle={videoOnly ? t("media.uploadModal.titleVideoOnly") : t("media.uploadModal.titleDefault")}
      modalSubtitle={
        videoOnly
          ? t("media.uploadModal.subtitleVideoOnly")
          : t("media.uploadModal.subtitleDefault")
      }
      features={{ videos: true, photos: !videoOnly, tags: true, isPrimary: !videoOnly }}
      seo={seo}
      onSubmit={async ({ type, file, videoUrl, title, altText, tags, isPrimary, provider, seasonYear }) => {
        const formData = new FormData();
        formData.append("type", type);
        formData.append("title", title);
        formData.append("altText", altText);
        formData.append("tags", tags);
        formData.append("isPrimary", String(isPrimary));
        if (type === "video" && seasonYear != null) {
          formData.append("seasonYear", String(seasonYear));
        }

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
          throw new Error(data.error || t("media.uploadModal.uploadError"));
        }
      }}
      onSuccess={() => router.refresh()}
    />
  );
}
