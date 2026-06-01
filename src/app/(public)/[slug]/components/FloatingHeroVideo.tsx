"use client";

import * as React from "react";
import { motion } from "framer-motion";
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
const VIDEO_TOP_FROM_HEADER = 10; // gutter between header pill and video
const VIDEO_W = HEADER_W - 24; // 12px gutter each side
const VIDEO_H = Math.round((VIDEO_W * 9) / 16); // 16:9 → 166
const VIDEO_BOTTOM_PAD = 12;
const BLOB_OPEN_H =
  HEADER_H + VIDEO_TOP_FROM_HEADER + VIDEO_H + VIDEO_BOTTOM_PAD; // 248
const BLOB_OPEN_W = HEADER_W;
const BLOB_OPEN_TOP = HEADER_TOP;
const BLOB_OPEN_RADIUS = 30;
// Extra room below the panel for the standalone collapse chevron.
const STAGE_HEIGHT = HEADER_TOP + BLOB_OPEN_H + 52;

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
    revealAfterScrollMs: 1000,
    enabled,
    dismissKey: `bh:floatingVideoDismissed:${slug}`,
  });

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [iframeMounted, setIframeMounted] = React.useState(false);
  // Tracks whether the morph has opened at least once this session. Used to
  // gate the close (shrink) shell animation so it only plays after a real
  // open — never on a fresh mount that starts dismissed via sessionStorage
  // (which would otherwise flash the dark shell).
  const [hasOpened, setHasOpened] = React.useState(false);
  // Hide the YouTube player chrome that briefly flashes while the iframe
  // loads + autoplay kicks in. After ~1.4s we fade the poster out and the
  // playing video shows through (no controls overlay once playing).
  const [posterCover, setPosterCover] = React.useState(true);

  React.useEffect(() => {
    if (state === "open") {
      setIframeMounted(true);
      setHasOpened(true);
      return;
    }
    if (state === "hidden_permanent" && iframeMounted) {
      const id = window.setTimeout(() => setIframeMounted(false), 720);
      return () => window.clearTimeout(id);
    }
  }, [state, iframeMounted]);

  React.useEffect(() => {
    if (!iframeMounted) {
      setPosterCover(true);
      return;
    }
    const id = window.setTimeout(() => setPosterCover(false), 1400);
    return () => window.clearTimeout(id);
  }, [iframeMounted]);

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
  // Used as the loading poster that covers YT chrome before autoplay starts.
  const posterUrl = ytId
    ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
    : null;

  return (
    <>
      <div
        data-state={state}
        className={`bh-morph-stage${isOpen ? " is-open" : ""}${hasOpened ? " bh-was-open" : ""}`}
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
            ["--bh-morph-accent" as string]: accentColor,
          } as React.CSSProperties
        }
      >
        {/* z-4 — header content (avatar + section icons + share).
            Glass styling (bg, blur, border, shadow) lives in CSS so it can
            transition between the closed glass pill and the open unified
            card. */}
        <div
          className="bh-morph-header-content"
          style={{
            position: "absolute",
            top: HEADER_TOP,
            left: "50%",
            transform: "translateX(-50%)",
            width: HEADER_W,
            height: HEADER_H,
            zIndex: 5,
            display: "flex",
            alignItems: "center",
            padding: "0 10px 0 6px",
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
                    position: "relative",
                    width: 30,
                    height: 30,
                    display: "grid",
                    placeItems: "center",
                    background: "transparent",
                    border: 0,
                    padding: 0,
                    cursor: "pointer",
                    color: isActive ? "#0a0a0a" : "rgba(255, 255, 255, 0.7)",
                    transition: "color 200ms ease",
                  }}
                >
                  {isActive && (
                    <motion.span
                      layoutId="bh-morph-nav-active"
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: 999,
                        backgroundColor: accentColor,
                        boxShadow: `0 4px 18px color-mix(in srgb, ${accentColor} 45%, transparent)`,
                      }}
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <Icon
                    size={17}
                    strokeWidth={1.8}
                    style={{ position: "relative", zIndex: 1 }}
                  />
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

        {/* z-4 — blob content (HIGHLIGHT label + close + video frame).
            This is the REAL glass panel: transparent bg + backdrop-blur over
            the player photo. The solid goo shell behind it fades out once the
            morph finishes opening (see CSS), so the open panel reads as glass,
            not a solid dark fill. */}
        <div
          className="bh-morph-blob-content"
          style={{
            position: "absolute",
            top: BLOB_OPEN_TOP,
            left: "50%",
            width: BLOB_OPEN_W,
            transform: "translateX(-50%)",
            borderRadius: BLOB_OPEN_RADIUS,
            zIndex: 4,
            overflow: "hidden",
            pointerEvents: isOpen ? "auto" : "none",
            border: `1px solid ${SHELL_BORDER}`,
            background: "rgba(8, 8, 8, 0.30)",
            backdropFilter: "blur(22px) saturate(140%)",
            WebkitBackdropFilter: "blur(22px) saturate(140%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.05), 0 18px 48px -12px rgba(0,0,0,0.6)",
          }}
        >
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

            {/* Loading poster — covers YouTube's initial chrome (title bar,
                play button, skip controls) until autoplay-muted starts the
                playback (~1.4s). Fades out smoothly to reveal the playing
                video underneath. */}
            {posterUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={posterUrl}
                alt=""
                aria-hidden="true"
                draggable={false}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  pointerEvents: "none",
                  opacity: posterCover ? 1 : 0,
                  transition: "opacity 320ms ease-out",
                  zIndex: 5,
                }}
              />
            )}

            {/* Full-area tap surface — sits ABOVE the iframe + poster so
                YouTube chrome can never receive pointer events; click opens
                the video natively in the YouTube app/web. */}
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

        {/* Collapse affordance — a bare minimalist chevron BELOW the panel,
            outside the block, so tapping it can never be confused with the
            video tap surface (which opens YouTube). No container, just the
            stroke icon. */}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar panel"
          className="bh-morph-collapse"
          style={{
            position: "absolute",
            top: BLOB_OPEN_TOP + BLOB_OPEN_H + 6,
            left: "50%",
            transform: "translateX(-50%)",
            display: "grid",
            placeItems: "center",
            width: 48,
            height: 30,
            padding: 0,
            border: 0,
            background: "transparent",
            color: "rgba(255,255,255,0.55)",
            cursor: "pointer",
            pointerEvents: isOpen ? "auto" : "none",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <ChevronUp size={22} strokeWidth={2} />
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: MORPH_CSS }} />
    </>
  );
}

const MORPH_CSS = `
/* Glass header pill — transparent + backdrop blur, identical tone to the
   original ProPlayerHeader nav (bg-black/40 backdrop-blur-xl border-white/10).
   When open it melts into the unified glass card: border + radius shift so the
   pill and the panel below read as one continuous glass shape. The tone never
   changes to a solid dark/blue fill — it stays glass the whole morph. */
.bh-morph-header-content {
  border-radius: 999px;
  background: rgba(8, 8, 8, 0.42);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 24px rgba(0, 0, 0, 0.35);
  transition:
    border-color 460ms cubic-bezier(0.5, 0, 0.75, 0) 140ms,
    border-radius 520ms cubic-bezier(0.5, 0, 0.75, 0) 60ms,
    background-color 460ms cubic-bezier(0.5, 0, 0.75, 0) 100ms,
    box-shadow 460ms cubic-bezier(0.5, 0, 0.75, 0) 140ms;
}
.bh-morph-stage.is-open .bh-morph-header-content {
  background: rgba(8, 8, 8, 0.18);
  border-color: transparent;
  border-bottom-color: rgba(255, 255, 255, 0.05);
  border-radius: 30px 30px 0 0;
  box-shadow: none;
  transition:
    border-color 360ms cubic-bezier(0.16, 1, 0.3, 1),
    border-radius 460ms cubic-bezier(0.16, 1, 0.3, 1),
    background-color 420ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 360ms cubic-bezier(0.16, 1, 0.3, 1);
}
/* Glass panel — same glass tone as the header pill. Collapsed to the header
   height (and invisible) when closed; expands DOWNWARD to the full panel when
   open. No gooey shell, no solid fill: the player photo stays visible/blurred
   through it the entire time, so the morph reads as the glass header
   stretching open. */
.bh-morph-blob-content {
  height: 60px;
  opacity: 0;
  transform: scale(0.96);
  transform-origin: 50% 0%;
  transition:
    height 520ms cubic-bezier(0.5, 0, 0.75, 0),
    opacity 200ms cubic-bezier(0.5, 0, 0.75, 0),
    transform 460ms cubic-bezier(0.5, 0, 0.75, 0);
}
/* Open: the panel height-reveals the video while a subtle scale bloom with a
   soft overshoot makes it deploy organically (not a rigid box-grow). Anchored
   at the top so it blooms out of the header. */
.bh-morph-stage.is-open .bh-morph-blob-content {
  height: 248px;
  opacity: 1;
  transform: scale(1);
  transition:
    height 720ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 240ms ease-out,
    transform 660ms cubic-bezier(0.34, 1.32, 0.5, 1);
}
.bh-morph-icon:not([data-active="true"]):hover {
  color: rgba(255, 255, 255, 1);
}
/* Minimalist collapse chevron below the panel — only visible once open,
   fading in after the panel finishes expanding. */
.bh-morph-collapse {
  opacity: 0;
  transition: opacity 200ms ease-out, color 140ms ease;
}
.bh-morph-stage.is-open .bh-morph-collapse {
  opacity: 1;
  transition: opacity 240ms ease-out 520ms, color 140ms ease;
}
.bh-morph-collapse:hover {
  color: rgba(255, 255, 255, 0.95);
}
.bh-morph-collapse:active {
  transform: translateX(-50%) scale(0.88);
}
@media (prefers-reduced-motion: reduce) {
  .bh-morph-blob-content,
  .bh-morph-stage.is-open .bh-morph-blob-content,
  .bh-morph-header-content,
  .bh-morph-stage.is-open .bh-morph-header-content,
  .bh-morph-collapse,
  .bh-morph-stage.is-open .bh-morph-collapse {
    transition: opacity 180ms ease !important;
  }
}
`;
