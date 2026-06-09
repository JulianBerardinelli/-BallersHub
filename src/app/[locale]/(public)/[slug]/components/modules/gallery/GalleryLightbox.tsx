"use client";

import { useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { useLenis } from "lenis/react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { GalleryPhoto } from "./types";

type Props = {
  photos: GalleryPhoto[];
  index: number | null;
  playerName: string;
  onClose: () => void;
  onChange: (index: number) => void;
};

export default function GalleryLightbox({ photos, index, playerName, onClose, onChange }: Props) {
  const t = useTranslations("portfolio");
  const open = index !== null;
  const total = photos.length;
  const photo = open ? photos[index!] : null;
  const lenis = useLenis();

  const goPrev = useCallback(() => {
    if (index === null) return;
    onChange((index - 1 + total) % total);
  }, [index, total, onChange]);

  const goNext = useCallback(() => {
    if (index === null) return;
    onChange((index + 1) % total);
  }, [index, total, onChange]);

  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };

    document.addEventListener("keydown", handleKey);

    // CSS overflow lock alone is NOT enough on this site: Lenis intercepts
    // wheel events at the document level and updates window.scrollY via JS,
    // bypassing `overflow: hidden`. Stop Lenis while the lightbox is open
    // so the background page doesn't scroll behind the modal.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lenis?.stop();

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      lenis?.start();
    };
  }, [open, onClose, goPrev, goNext, lenis]);

  return (
    <AnimatePresence>
      {open && photo && (
        <motion.div
          key="gallery-lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 md:p-12"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={t("modules.gallery.dialogAria", { name: playerName, current: index! + 1, total })}
        >
          <div className="absolute top-5 left-6 right-6 flex items-center justify-between text-white/70 z-10">
            <span className="text-[11px] md:text-xs font-bold tracking-[0.35em] uppercase">
              {String(index! + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label={t("modules.gallery.close")}
              className="rounded-full bg-white/5 hover:bg-white/15 p-2.5 transition-colors ring-1 ring-white/10"
            >
              <X size={20} strokeWidth={2.2} />
            </button>
          </div>

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                aria-label={t("modules.gallery.previous")}
                className="absolute left-3 md:left-8 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/5 hover:bg-white/15 p-3 transition-colors ring-1 ring-white/10 text-white/80 hover:text-white"
              >
                <ChevronLeft size={26} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                aria-label={t("modules.gallery.next")}
                className="absolute right-3 md:right-8 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/5 hover:bg-white/15 p-3 transition-colors ring-1 ring-white/10 text-white/80 hover:text-white"
              >
                <ChevronRight size={26} strokeWidth={2.2} />
              </button>
            </>
          )}

          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-w-full max-h-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.altText || t("modules.gallery.photoAlt", { name: playerName, index: index! + 1 })}
              className="max-w-full max-h-[78vh] md:max-h-[85vh] object-contain rounded-lg shadow-[0_40px_120px_rgba(0,0,0,0.6)]"
              draggable={false}
            />
            {photo.title && (
              <p className="mt-5 max-w-2xl text-center text-white/90 text-sm md:text-base font-medium tracking-wide">
                {photo.title}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
