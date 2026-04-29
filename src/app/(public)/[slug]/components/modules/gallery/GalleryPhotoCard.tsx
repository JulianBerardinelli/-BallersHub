"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import type { GalleryPhoto, PhotoSlot } from "./types";

type Props = {
  photo: GalleryPhoto;
  slot: PhotoSlot;
  index: number;
  playerName: string;
  onOpen: (index: number) => void;
};

export default function GalleryPhotoCard({ photo, slot, index, playerName, onOpen }: Props) {
  const [loaded, setLoaded] = useState(false);

  const baseAlt = photo.altText?.trim() || photo.title?.trim() || `${playerName} — Foto ${index + 1}`;
  const seoAlt = baseAlt.toLowerCase().includes(playerName.toLowerCase())
    ? baseAlt
    : `${playerName} · ${baseAlt}`;

  return (
    <figure className={`relative ${slot.col} group`}>
      <button
        type="button"
        onClick={() => onOpen(index)}
        aria-label={`Abrir ${seoAlt} en pantalla completa`}
        className={`relative block w-full ${slot.aspect} overflow-hidden rounded-lg bg-white/[0.025] border border-white/[0.06] shadow-[0_30px_70px_rgba(0,0,0,0.45)] cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-background)]`}
      >
        {!loaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent animate-pulse" />
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={seoAlt}
          title={photo.title || seoAlt}
          loading={index < 2 ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={index === 0 ? "high" : "auto"}
          sizes={slot.sizes}
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover will-change-transform transition-[transform,opacity,filter] duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            loaded ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-[1.06] blur-sm"
          } group-hover:scale-[1.04]`}
        />

        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.08] rounded-lg" />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="pointer-events-none absolute top-3 right-3 flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity duration-500">
          <span className="text-[9px] tracking-[0.32em] uppercase text-white/85 font-bold drop-shadow">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="h-[1px] w-6 bg-[var(--theme-accent)]" />
        </div>

        <div className="pointer-events-none absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-500">
          <span className="inline-flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md p-2 ring-1 ring-white/15">
            <Maximize2 size={14} className="text-white" strokeWidth={2.2} />
          </span>
        </div>

        {photo.title && (
          <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 p-5 md:p-6 pr-14 translate-y-3 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
            <p className="text-white/95 font-heading text-sm md:text-base font-bold tracking-wide uppercase drop-shadow-lg">
              {photo.title}
            </p>
          </figcaption>
        )}
      </button>
    </figure>
  );
}
