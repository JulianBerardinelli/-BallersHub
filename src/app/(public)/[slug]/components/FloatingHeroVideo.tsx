"use client";

import * as React from "react";
import {
  User2,
  Target,
  TrendingUp,
  Newspaper,
  Image as ImageIcon,
  Share2,
  ChevronUp,
  type LucideIcon,
} from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useFloatingVideoVisibility } from "@/hooks/useFloatingVideoVisibility";

type NavItem = { id: string; label: string; Icon: LucideIcon };

const NAV_SECTIONS: NavItem[] = [
  { id: "biography", label: "Bio", Icon: User2 },
  { id: "tactics", label: "Táctica", Icon: Target },
  { id: "career-timeline", label: "Carrera", Icon: TrendingUp },
  { id: "press", label: "Prensa", Icon: Newspaper },
  { id: "gallery", label: "Galería", Icon: ImageIcon },
];

type FloatingHeroVideoProps = {
  video: {
    url: string;
    title?: string | null;
    provider?: string | null;
  };
  slug: string;
  player: {
    fullName: string;
    avatarUrl?: string | null;
  };
  accentColor?: string;
  hideSelector?: string;
};

function getYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/,
  );
  return m ? m[1] : null;
}

// --- Geometry ---
// Panel sized so the video wrap holds a clean 16:9 (296 × 166), eliminating
// the letterbox bars we got with the prior 4:3-ish 320 × 226 box.
const HEADER_TOP = 32;
const HEADER_W = 320;
const HEADER_H = 60;
const BLOB_OVERLAP = 14;
const VIDEO_TOP_FROM_HEADER = 10; // gutter between header pill and video
const VIDEO_W = HEADER_W - 24; // 12px gutter each side
const VIDEO_H = Math.round((VIDEO_W * 9) / 16); // 16:9 → 166
const VIDEO_BOTTOM_PAD = 12;
const BLOB_OPEN_H =
  HEADER_H + VIDEO_TOP_FROM_HEADER + VIDEO_H + VIDEO_BOTTOM_PAD; // 248
const BLOB_OPEN_W = HEADER_W;
const BLOB_OPEN_TOP = HEADER_TOP;
const BLOB_OPEN_RADIUS = 30;
const BLOB_CLOSED_W = 56;
const BLOB_CLOSED_H = 12;
const BLOB_CLOSED_TOP = HEADER_TOP + HEADER_H - BLOB_OVERLAP;
const STAGE_HEIGHT = HEADER_TOP + BLOB_OPEN_H + 24;

const FILTER_ID = "bh-morph-goo";
const SHELL_BG = "rgba(12, 16, 28, 0.86)";
const SHELL_BORDER = "rgba(255, 255, 255, 0.12)";

export default function FloatingHeroVideo({
  video,
  slug,
  player,
  accentColor = "#34d399",
  hideSelector = "#tactics",
}: FloatingHeroVideoProps) {
  const isMobile = useIsMobile(1024);
  const enabled = isMobile && !!video?.url;

  const { state, dismiss } = useFloatingVideoVisibility({
    hideSelector,
    initialDelayMs: 1400,
    enabled,
    dismissKey: `bh:floatingVideoDismissed:${slug}`,
  });

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [iframeMounted, setIframeMounted] = React.useState(false);

  React.useEffect(() => {
    if (state === "open") {
      setIframeMounted(true);
      return;
    }
    if (state === "hidden_permanent" && iframeMounted) {
      const id = window.setTimeout(() => setIframeMounted(false), 720);
      return () => window.clearTimeout(id);
    }
  }, [state, iframeMounted]);

  // Scroll-spy — mirrors ProPlayerHeader so the morph header reflects the
  // same active section.
  React.useEffect(() => {
    if (!enabled) return;
    const onScroll = () => {
      if (window.scrollY < window.innerHeight * 0.5) {
        setActiveId(null);
        return;
      }
      const probeY = window.innerHeight * 0.35;
      let current: string | null = null;
      for (const section of NAV_SECTIONS) {
        const el = document.getElementById(section.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= probeY) current = section.id;
      }
      setActiveId(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled]);

  const scrollToSection = React.useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const headerOffset = 96;
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  const scrollToTop = React.useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleShare = React.useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Perfil de ${player.fullName}`,
          text: `Mira el perfil profesional de ${player.fullName} en 'BallersHub.`,
          url: window.location.href,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      /* user dismissed */
    }
  }, [player.fullName]);

  if (!enabled) return null;

  const isOpen = state === "open";
  const ytId = getYouTubeId(video.url);
  const youtubeWatchUrl = ytId
    ? `https://www.youtube.com/watch?v=${ytId}`
    : video.url;
  // Autoplay-muted embed. controls=0 + modestbranding kills the YT chrome;
  // the iframe is scaled slightly larger than its wrap and offset so the
  // top/bottom title bars get clipped by the wrap's overflow:hidden. The
  // <a> tap surface above the iframe captures all clicks and opens YouTube.
  const iframeSrc = ytId
    ? `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&playsinline=1&disablekb=1&rel=0&iv_load_policy=3&fs=0`
    : null;

  return (
    <>
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        focusable="false"
        style={{ position: "absolute", pointerEvents: "none" }}
      >
        <defs>
          <filter id={FILTER_ID}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 18 -8"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div
        data-state={state}
        className={`bh-morph-stage${isOpen ? " is-open" : ""}`}
        style={
          {
            position: "fixed",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: HEADER_W,
            height: STAGE_HEIGHT,
            zIndex: 100,
            pointerEvents: "none",
            // contain layout/paint so the SVG goo filter never re-runs
            // because of work happening elsewhere on the page (hero
            // parallax, ghost trails, etc.).
            contain: "layout paint",
            ["--bh-morph-accent" as string]: accentColor,
          } as React.CSSProperties
        }
      >
        {/* z-2 — goo layer with shells only */}
        <div
          className="bh-morph-goo"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: STAGE_HEIGHT,
            filter: `url(#${FILTER_ID})`,
            isolation: "isolate",
            pointerEvents: "none",
          }}
        >
          <div
            className="bh-morph-header-shell"
            style={{
              position: "absolute",
              top: HEADER_TOP,
              left: "50%",
              transform: "translateX(-50%)",
              width: HEADER_W,
              height: HEADER_H,
              borderRadius: 999,
              backgroundColor: SHELL_BG,
            }}
          />
          <div
            className="bh-morph-blob-shell"
            style={{
              position: "absolute",
              left: "50%",
              backgroundColor: SHELL_BG,
            }}
          />
        </div>

        {/* z-4 — header content (avatar + section icons + share) */}
        <div
          className="bh-morph-header-content"
          style={{
            position: "absolute",
            top: HEADER_TOP,
            left: "50%",
            transform: "translateX(-50%)",
            width: HEADER_W,
            height: HEADER_H,
            borderRadius: 999,
            zIndex: 4,
            display: "flex",
            alignItems: "center",
            padding: "0 10px 0 6px",
            border: `1px solid ${SHELL_BORDER}`,
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.35)",
            pointerEvents: "auto",
          }}
        >
          <button
            type="button"
            onClick={scrollToTop}
            aria-label="Inicio"
            className="bh-morph-avatar"
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.20)",
              overflow: "hidden",
              padding: 0,
              flexShrink: 0,
              marginRight: 6,
              cursor: "pointer",
            }}
          >
            {player.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={player.avatarUrl}
                alt={player.fullName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : null}
          </button>
          <div
            className="bh-morph-icons"
            style={{
              display: "flex",
              alignItems: "center",
              flex: 1,
              justifyContent: "space-between",
              padding: "0 6px",
            }}
          >
            {NAV_SECTIONS.map((item) => {
              const isActive = activeId === item.id;
              const Icon = item.Icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  aria-label={item.label}
                  className="bh-morph-icon"
                  data-active={isActive ? "true" : undefined}
                  style={{
                    width: 28,
                    height: 28,
                    display: "grid",
                    placeItems: "center",
                    background: "transparent",
                    border: 0,
                    padding: 0,
                    cursor: "pointer",
                    color: isActive
                      ? accentColor
                      : "rgba(255, 255, 255, 0.7)",
                    transition: "color 140ms ease",
                  }}
                >
                  <Icon size={18} strokeWidth={1.7} />
                </button>
              );
            })}
            <div
              style={{
                width: 1,
                height: 22,
                background: "rgba(255,255,255,0.18)",
                margin: "0 4px",
              }}
            />
            <button
              type="button"
              onClick={handleShare}
              aria-label="Compartir perfil"
              className="bh-morph-icon"
              style={{
                width: 28,
                height: 28,
                display: "grid",
                placeItems: "center",
                background: "transparent",
                border: 0,
                padding: 0,
                cursor: "pointer",
                color: "rgba(255, 255, 255, 0.7)",
                transition: "color 140ms ease",
              }}
            >
              <Share2 size={18} strokeWidth={1.7} />
            </button>
          </div>
        </div>

        {/* z-4 — blob content (HIGHLIGHT label + close + video frame) */}
        <div
          className="bh-morph-blob-content"
          style={{
            position: "absolute",
            top: BLOB_OPEN_TOP,
            left: "50%",
            width: BLOB_OPEN_W,
            height: BLOB_OPEN_H,
            transform: "translateX(-50%)",
            borderRadius: BLOB_OPEN_RADIUS,
            zIndex: 4,
            overflow: "hidden",
            pointerEvents: isOpen ? "auto" : "none",
            border: `1px solid ${SHELL_BORDER}`,
          }}
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="Cerrar panel"
            className="bh-morph-close"
            style={{
              position: "absolute",
              top: 70,
              right: 14,
              width: 22,
              height: 22,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(0,0,0,0.35)",
              color: "rgba(255,255,255,0.75)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              padding: 0,
              transition: "all 140ms ease",
              zIndex: 20,
            }}
          >
            <ChevronUp size={14} strokeWidth={1.8} />
          </button>

          <div
            className="bh-morph-video-wrap"
            style={{
              position: "absolute",
              top: HEADER_H + VIDEO_TOP_FROM_HEADER,
              left: 12,
              right: 12,
              height: VIDEO_H,
              borderRadius: 18,
              overflow: "hidden",
              background: "#000",
            }}
          >
            {iframeMounted && iframeSrc && (
              <iframe
                src={iframeSrc}
                title=""
                aria-hidden="true"
                tabIndex={-1}
                className="bh-morph-iframe"
                style={{
                  position: "absolute",
                  // Scale + offset para clipar las barras superior (título)
                  // e inferior (logo YouTube + progress) sin perder contenido
                  // del video. Los controles centrales (pause, prev, next)
                  // solo aparecen cuando el video está pausado — en
                  // autoplay+mute+loop NO se ven en uso real.
                  top: "-10%",
                  left: "-5%",
                  width: "110%",
                  height: "120%",
                  border: 0,
                  pointerEvents: "none",
                }}
                allow="autoplay; encrypted-media; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                loading="lazy"
              />
            )}
            {iframeMounted && !iframeSrc && (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                src={video.url}
                aria-hidden="true"
                tabIndex={-1}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  pointerEvents: "none",
                }}
                muted
                loop
                playsInline
                autoPlay
                preload="none"
              />
            )}

            {/* Full-area tap surface — sits ABOVE the iframe so YouTube
                chrome can never receive pointer events; click opens the
                video natively in the YouTube app/web. */}
            <a
              href={youtubeWatchUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={
                video.title
                  ? `Abrir ${video.title} en YouTube`
                  : "Abrir highlight en YouTube"
              }
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 10,
                display: "block",
              }}
            />
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: MORPH_CSS }} />
    </>
  );
}

const MORPH_CSS = `
.bh-morph-blob-shell {
  top: 78px;
  width: 56px;
  height: 12px;
  border-radius: 999px;
  opacity: 0;
  transform: translateX(-50%);
  transition:
    width 700ms cubic-bezier(0.7, 0, 0.84, 0),
    height 700ms cubic-bezier(0.7, 0, 0.84, 0),
    border-radius 700ms cubic-bezier(0.7, 0, 0.84, 0),
    top 700ms cubic-bezier(0.7, 0, 0.84, 0),
    opacity 280ms cubic-bezier(0.7, 0, 0.84, 0);
}
.bh-morph-stage.is-open .bh-morph-blob-shell {
  top: 32px;
  width: 320px;
  height: 248px;
  border-radius: 30px;
  opacity: 1;
  transition:
    width 900ms cubic-bezier(0.16, 1, 0.3, 1),
    height 900ms cubic-bezier(0.16, 1, 0.3, 1),
    border-radius 900ms cubic-bezier(0.16, 1, 0.3, 1),
    top 900ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 180ms ease-out;
}
.bh-morph-header-content {
  transition:
    border-color 380ms cubic-bezier(0.16, 1, 0.3, 1),
    border-radius 460ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 380ms cubic-bezier(0.16, 1, 0.3, 1);
}
.bh-morph-stage.is-open .bh-morph-header-content {
  border-color: transparent !important;
  border-bottom-color: rgba(255, 255, 255, 0.05) !important;
  border-radius: 30px 30px 0 0 !important;
  box-shadow: none !important;
}
.bh-morph-blob-content {
  opacity: 0;
  transition: opacity 200ms ease-out;
}
.bh-morph-stage.is-open .bh-morph-blob-content {
  opacity: 1;
  transition: opacity 220ms ease-out 480ms;
}
.bh-morph-icon[data-active="true"] {
  color: var(--bh-morph-accent, #34d399) !important;
}
.bh-morph-icon:hover {
  color: rgba(255, 255, 255, 1);
}
.bh-morph-close:hover {
  color: rgba(255, 255, 255, 1);
  border-color: rgba(255, 255, 255, 0.32);
  transform: scale(1.04);
}
.bh-morph-close:active {
  transform: scale(0.94);
}
@media (prefers-reduced-motion: reduce) {
  .bh-morph-blob-shell,
  .bh-morph-stage.is-open .bh-morph-blob-shell,
  .bh-morph-blob-content,
  .bh-morph-stage.is-open .bh-morph-blob-content,
  .bh-morph-header-content,
  .bh-morph-stage.is-open .bh-morph-header-content {
    transition: opacity 180ms ease !important;
  }
}
`;
