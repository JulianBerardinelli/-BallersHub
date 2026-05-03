"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import GalleryPhotoCard from "./GalleryPhotoCard";
import GalleryLightbox from "./GalleryLightbox";
import { getGalleryLayout } from "./galleryLayouts";
import { detectOrientation, ORIENTATION_PRIORITY, type Orientation } from "./orientation";
import type { GalleryPhoto } from "./types";

type Props = {
  photos: GalleryPhoto[];
  playerName: string;
};

export default function PortfolioGallery({ photos, playerName }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [orientations, setOrientations] = useState<Map<string, Orientation>>(new Map());

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "center center"],
  });

  const headerY = useTransform(scrollYProgress, [0, 0.45], [40, 0]);
  const headerOpacity = useTransform(scrollYProgress, [0, 0.25, 0.5], [0, 1, 1]);
  const ruleScaleX = useTransform(scrollYProgress, [0.2, 0.6], [0, 1]);

  const gridClip = useTransform(
    scrollYProgress,
    [0.2, 0.85],
    ["inset(100% 0% 0% 0%)", "inset(0% 0% 0% 0%)"]
  );
  const gridY = useTransform(scrollYProgress, [0.2, 0.95], [120, 0]);
  const gridScale = useTransform(scrollYProgress, [0.2, 0.95], [0.96, 1]);

  // Detect each photo's natural orientation client-side. Used to reorder
  // photos so portraits land in portrait slots and landscapes in landscape
  // slots — particularly relevant for the 5-photo block (3 portrait slots
  // up top + 2 landscape slots below).
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      photos.map(async (p) => [p.id, await detectOrientation(p.url)] as const)
    ).then((entries) => {
      if (!cancelled) setOrientations(new Map(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [photos]);

  // Stable order for SSR + first paint; reorder once orientations are known.
  // Sort is `stable`-ish: ties preserve upload order via the index fallback.
  const orderedPhotos = useMemo(() => {
    if (orientations.size === 0) return photos;
    return photos
      .map((photo, index) => ({ photo, index }))
      .sort((a, b) => {
        const oa = orientations.get(a.photo.id) ?? "landscape";
        const ob = orientations.get(b.photo.id) ?? "landscape";
        const diff = ORIENTATION_PRIORITY[oa] - ORIENTATION_PRIORITY[ob];
        return diff !== 0 ? diff : a.index - b.index;
      })
      .map((entry) => entry.photo);
  }, [photos, orientations]);

  if (!orderedPhotos || orderedPhotos.length === 0) return null;

  const layout = getGalleryLayout(orderedPhotos.length);
  const photoCount = orderedPhotos.length;

  return (
    <section
      ref={sectionRef}
      id="gallery"
      aria-label={`Galería de fotos de ${playerName}`}
      className="relative -mt-24 md:-mt-56 z-30 w-full pt-16 md:pt-28 pb-16 md:pb-32"
    >
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[60vw] h-[60vw] max-w-[900px] max-h-[900px] rounded-full bg-[var(--theme-accent)]/[0.06] blur-[160px]" />
      </div>

      <div className="relative z-10">
        <motion.header
          style={{ y: headerY, opacity: headerOpacity }}
          className="mx-auto mb-8 md:mb-12 max-w-[1000px] flex items-end justify-between gap-6"
        >
          <div className="flex flex-col">
            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-[var(--theme-accent)] mb-1.5">
              {String(photoCount).padStart(2, "0")} {photoCount === 1 ? "captura" : "capturas"}
            </span>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black font-heading text-white uppercase leading-[0.85]">
              Galería
            </h2>
          </div>
          <motion.div
            style={{ scaleX: ruleScaleX, transformOrigin: "right" }}
            className="hidden md:block flex-1 max-w-[260px] h-[2px] bg-[var(--theme-accent)] mb-3"
          />
        </motion.header>

        <motion.div
          style={{ clipPath: gridClip, y: gridY, scale: gridScale }}
          className="mx-auto max-w-[1000px] grid grid-cols-12 gap-3 md:gap-4 lg:gap-5 will-change-transform origin-top"
        >
          {orderedPhotos.map((photo, i) => {
            const slot = layout[i] ?? layout[layout.length - 1];
            return (
              <GalleryPhotoCard
                key={photo.id}
                photo={photo}
                slot={slot}
                index={i}
                playerName={playerName}
                onOpen={setActiveIndex}
              />
            );
          })}
        </motion.div>
      </div>

      <GalleryLightbox
        photos={orderedPhotos}
        index={activeIndex}
        playerName={playerName}
        onClose={() => setActiveIndex(null)}
        onChange={setActiveIndex}
      />
    </section>
  );
}
