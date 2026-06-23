"use client";

// Pro coach — Photo gallery (#gallery). Reuses the player's agnostic
// `PortfolioGallery` (12-col scroll-reveal grid + lightbox, themed via
// --theme-* CSS vars) fed with the coach's approved photos. Videos live in the
// Tactics module, so this only consumes type=photo media.
//
// `PortfolioGallery` already returns null on an empty list and renders its own
// id="gallery" section, so we just guard + map here.

import PortfolioGallery from "@/app/[locale]/(public)/[slug]/components/modules/gallery/PortfolioGallery";
import type { GalleryPhoto } from "@/app/[locale]/(public)/[slug]/components/modules/gallery/types";
import type { CoachMediaRow } from "../../CoachPortfolio";

export type CoachMediaGalleryModuleProps = {
  photos: CoachMediaRow[];
  coachName: string;
};

export default function CoachMediaGalleryModule({ photos, coachName }: CoachMediaGalleryModuleProps) {
  const galleryPhotos: GalleryPhoto[] = photos
    .filter((m) => m.type === "photo")
    .map((m) => ({ id: m.id, url: m.url, title: m.title }));

  if (galleryPhotos.length === 0) return null;

  return <PortfolioGallery photos={galleryPhotos} playerName={coachName} />;
}
