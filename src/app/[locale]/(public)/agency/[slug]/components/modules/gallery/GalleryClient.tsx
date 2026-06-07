"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import CountUp from "@/components/ui/CountUp";
import ModuleBackdrop from "../../ModuleBackdrop";

export type GalleryPhoto = {
  id: string;
  url: string;
  title: string | null;
  altText: string | null;
};

export default function GalleryClient({ photos }: { photos: GalleryPhoto[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const close = () => setActiveIdx(null);
  const prev = () =>
    setActiveIdx((curr) => (curr === null ? curr : (curr - 1 + photos.length) % photos.length));
  const next = () =>
    setActiveIdx((curr) => (curr === null ? curr : (curr + 1) % photos.length));

  const featured = photos[0];
  const rest = photos.slice(1);

  return (
    <section id="gallery" className="relative scroll-mt-32 space-y-10 isolate">
      <ModuleBackdrop variant="halo" align="left" />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15%" }}
        transition={{ duration: 0.6 }}
        className="flex items-end justify-between gap-6 flex-wrap"
      >
        <div className="space-y-3">
          <div
            className="text-[10px] uppercase tracking-[0.4em] font-bold"
            style={{ color: "var(--theme-accent)" }}
          >
            / Galería
          </div>
          <h2 className="font-heading text-5xl md:text-7xl font-black uppercase leading-[0.9] tracking-tighter text-white">
            En primera persona
          </h2>
        </div>
        <div className="flex items-center gap-3 text-white/60">
          <ImageIcon className="h-5 w-5" style={{ color: "var(--theme-accent)" }} />
          <span className="font-mono text-sm flex items-baseline gap-1.5">
            <CountUp value={photos.length} padStart={2} />
            {photos.length === 1 ? "imagen" : "imágenes"}
          </span>
        </div>
      </motion.div>

      <div
        className={`grid gap-4 ${
          rest.length === 0
            ? "grid-cols-1"
            : "grid-cols-1 lg:grid-cols-12"
        }`}
      >
        {featured && (
          <motion.button
            type="button"
            onClick={() => setActiveIdx(0)}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.6 }}
            className={`group relative overflow-hidden rounded-3xl ${
              rest.length === 0 ? "" : "lg:col-span-7"
            }`}
            style={{ aspectRatio: rest.length === 0 ? "16/9" : "4/3", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={featured.url}
              alt={featured.altText || featured.title || "Imagen de la agencia"}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </motion.button>
        )}

        {rest.length > 0 && (
          <div className="grid grid-cols-2 gap-4 lg:col-span-5">
            {rest.map((photo, i) => (
              <motion.button
                key={photo.id}
                type="button"
                onClick={() => setActiveIdx(i + 1)}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.5, delay: Math.min(i * 0.06, 0.3) }}
                className="group relative aspect-square overflow-hidden rounded-2xl"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.altText || photo.title || "Imagen de la agencia"}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {activeIdx !== null && photos[activeIdx] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={close}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar"
              className="absolute top-6 right-6 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    prev();
                  }}
                  aria-label="Anterior"
                  className="absolute left-6 top-1/2 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                  }}
                  aria-label="Siguiente"
                  className="absolute right-6 top-1/2 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <motion.div
              key={photos[activeIdx].id}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[85vh] max-w-[90vw]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos[activeIdx].url}
                alt={photos[activeIdx].altText || photos[activeIdx].title || "Imagen"}
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
