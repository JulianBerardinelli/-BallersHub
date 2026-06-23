"use client";

// Agnostic portfolio video helpers, ported out of the inline player
// `ProfileTacticsModule` so the Pro coach Tactics module can reuse the exact
// same video treatment (YouTube embeds that lazily mount on view, self-hosted
// auto-play loops, and a full-list "all videos" modal). These are theme-aware
// via `--theme-primary` / `--theme-accent` CSS vars (already set by the Pro
// layout root), so they inherit each profile's accent without extra props.
//
// Kept deliberately generic (a `PortfolioVideo` shape, not a player/coach row)
// so any portfolio surface can feed it. The player module still has its own
// private copies; this is the shared home for new consumers.

import * as React from "react";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useLenis } from "lenis/react";
import { useTranslations } from "next-intl";

export type PortfolioVideo = {
  id: string;
  url: string;
  title?: string | null;
  seasonYear?: number | null;
  createdAt?: string | Date | null;
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/,
  );
  return match ? match[1] : null;
}

export function getYouTubeThumbnail(url: string): string {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : "/images/player-default.jpg";
}

// ── AUTO-PLAY VIDEO (self-hosted) ─────────────────────────────────────────────
export function AutoPlayVideo({ src, className = "" }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isInView = useInView(videoRef, { margin: "0px 0px -100px 0px" });
  React.useEffect(() => {
    if (!videoRef.current) return;
    if (isInView) videoRef.current.play().catch(() => {});
    else videoRef.current.pause();
  }, [isInView]);
  return (
    <video
      ref={videoRef}
      src={src}
      className={`object-cover ${className}`}
      muted
      loop
      playsInline
      preload="none"
    />
  );
}

// ── YOUTUBE CLIP — iframe mounts only when in view ────────────────────────────
export function YoutubeClip({
  video,
  className,
  animate = false,
}: {
  video: PortfolioVideo;
  className: string;
  animate?: boolean;
}) {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { margin: "400px 0px 400px 0px" });
  const ytId = getYouTubeId(video.url);

  if (!ytId) {
    return (
      <div ref={containerRef} className={className}>
        {isInView && <AutoPlayVideo src={video.url} className="w-full h-full" />}
      </div>
    );
  }

  const inner = isInView ? (
    <iframe
      src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&playsinline=1&disablekb=1`}
      className="w-full h-full absolute inset-0 rounded-[inherit] pointer-events-none"
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
    />
  ) : (
    <div className="relative w-full h-full bg-black/20" />
  );

  if (animate) {
    return (
      <motion.div
        ref={containerRef}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className={className}
      >
        {inner}
      </motion.div>
    );
  }
  return (
    <div ref={containerRef} className={className}>
      {inner}
    </div>
  );
}

// ── VIDEOS MODAL — full-list overlay (locks body + Lenis) ─────────────────────
export function VideosModal({
  videos,
  ownerName,
  onClose,
}: {
  videos: PortfolioVideo[];
  ownerName: string;
  onClose: () => void;
}) {
  const t = useTranslations("portfolio");
  const lenis = useLenis();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lenis?.stop();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      lenis?.start();
    };
  }, [onClose, lenis]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("scouting.allHighlightsOf", { name: ownerName })}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-neutral-900/95 backdrop-blur-[40px] border border-white/10 ring-1 ring-white/5 rounded-3xl p-5 relative shadow-2xl max-h-[80vh] flex flex-col"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("scouting.close")}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/70 hover:text-white transition-colors border border-white/10 z-10"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-4 pr-10">
          <span className="text-[9px] uppercase font-black tracking-[0.3em] text-[var(--theme-accent)]">
            {t("scouting.highlights")} · {videos.length}
          </span>
          <h3 className="text-xl font-black font-heading text-white uppercase leading-tight mt-1">
            {t("scouting.allVideos")}
          </h3>
        </div>

        <ul className="flex-1 overflow-y-auto pr-1 custom-scrollbar flex flex-col gap-2 -mr-1">
          {videos.map((vid) => {
            const year =
              vid.seasonYear ??
              (vid.createdAt ? new Date(vid.createdAt).getFullYear() : new Date().getFullYear());
            return (
              <li key={vid.id}>
                <a
                  href={vid.url}
                  target="_blank"
                  rel="noreferrer nofollow"
                  className="group flex items-center gap-3 bg-white/[0.02] border border-white/10 rounded-lg p-2 hover:bg-white/[0.06] hover:border-[var(--theme-primary)]/50 transition-colors"
                >
                  <div className="w-16 h-10 bg-black rounded overflow-hidden shrink-0 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getYouTubeThumbnail(vid.url)}
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                      alt=""
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-black/80 border border-white/20 flex items-center justify-center text-white/80 group-hover:bg-[var(--theme-primary)] group-hover:text-white group-hover:border-transparent transition-colors">
                        <span className="text-[7px] ml-[1px]">▶</span>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-white/90 font-bold uppercase tracking-wide line-clamp-1">
                      {vid.title || t("scouting.matchHighlight")}
                    </p>
                    <p className="text-[var(--theme-accent)] text-[9px] uppercase font-black tracking-widest mt-0.5">
                      {t("scouting.season")} {year}
                    </p>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      </motion.div>
    </motion.div>
  );
}
