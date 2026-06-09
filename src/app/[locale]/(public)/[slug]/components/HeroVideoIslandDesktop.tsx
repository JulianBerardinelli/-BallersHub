"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useFloatingVideoVisibility } from "@/hooks/useFloatingVideoVisibility";

type HeroVideoIslandDesktopProps = {
  video: {
    url: string;
    title?: string | null;
    provider?: string | null;
  };
  slug: string;
  accentColor?: string;
  hideSelector?: string;
};

function getYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/,
  );
  return m ? m[1] : null;
}

const ISLAND_W = 360; // 16:9 → ~203px tall video

export default function HeroVideoIslandDesktop({
  video,
  slug,
  accentColor = "#34d399",
  hideSelector = "#tactics",
}: HeroVideoIslandDesktopProps) {
  const t = useTranslations("portfolio");
  const isMobile = useIsMobile(1024);
  const enabled = !isMobile && !!video?.url;

  const { state, dismiss } = useFloatingVideoVisibility({
    hideSelector,
    revealAfterLoadMs: 1000,
    enabled,
    dismissKey: `bh:floatingVideoIslandDismissed:${slug}`,
  });

  const [iframeMounted, setIframeMounted] = React.useState(false);
  const [posterCover, setPosterCover] = React.useState(true);

  React.useEffect(() => {
    if (state === "open") {
      setIframeMounted(true);
      return;
    }
    if (state === "hidden_permanent" && iframeMounted) {
      const id = window.setTimeout(() => setIframeMounted(false), 460);
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

  if (!enabled) return null;

  const isOpen = state === "open";
  const ytId = getYouTubeId(video.url);
  const youtubeWatchUrl = ytId
    ? `https://www.youtube.com/watch?v=${ytId}`
    : video.url;
  const iframeSrc = ytId
    ? `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&playsinline=1&disablekb=1&rel=0&iv_load_policy=3&fs=0`
    : null;
  const posterUrl = ytId
    ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
    : null;

  return (
    <>
      <div
        data-state={state}
        className={`bh-island${isOpen ? " is-open" : ""}`}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: ISLAND_W,
          zIndex: 90,
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <div
          className="bh-island-card"
          style={{
            position: "relative",
            width: "100%",
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(8,8,8,0.55)",
            backdropFilter: "blur(22px) saturate(140%)",
            WebkitBackdropFilter: "blur(22px) saturate(140%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 60px -16px rgba(0,0,0,0.7)",
          }}
        >
          <div
            className="bh-island-video"
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "16 / 9",
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
                style={{
                  position: "absolute",
                  // Scale + offset to clip YouTube's top/bottom chrome bars.
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

            {/* Loading poster — hides YouTube chrome until autoplay starts. */}
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

            {/* HIGHLIGHT badge */}
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                zIndex: 15,
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 8px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                pointerEvents: "none",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: accentColor,
                }}
              />
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                {t("modules.video.highlightBadge")}
              </span>
            </div>

            {/* Full-area tap surface — opens the source video in YouTube. */}
            <a
              href={youtubeWatchUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={
                video.title
                  ? t("modules.video.openTitleInYouTube", { title: video.title })
                  : t("modules.video.openHighlightInYouTube")
              }
              style={{ position: "absolute", inset: 0, zIndex: 10, display: "block" }}
            />

            {/* Close — sits ABOVE the tap surface (z-20) so dismissing never
                opens the video. */}
            <button
              type="button"
              onClick={dismiss}
              aria-label={t("modules.video.closeVideo")}
              className="bh-island-close"
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                zIndex: 20,
                width: 28,
                height: 28,
                display: "grid",
                placeItems: "center",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                color: "rgba(255,255,255,0.85)",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <X size={15} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: ISLAND_CSS }} />
    </>
  );
}

const ISLAND_CSS = `
.bh-island {
  opacity: 0;
  transform: translateY(18px) scale(0.97);
  transform-origin: 100% 100%;
  transition:
    opacity 260ms cubic-bezier(0.5, 0, 0.75, 0),
    transform 280ms cubic-bezier(0.5, 0, 0.75, 0);
}
.bh-island.is-open {
  opacity: 1;
  transform: translateY(0) scale(1);
  transition:
    opacity 420ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 520ms cubic-bezier(0.16, 1, 0.3, 1);
}
.bh-island-close:hover {
  background: rgba(0, 0, 0, 0.65);
  border-color: rgba(255, 255, 255, 0.32);
  color: #fff;
}
.bh-island-close:active {
  transform: scale(0.92);
}
@media (prefers-reduced-motion: reduce) {
  .bh-island,
  .bh-island.is-open {
    transition: opacity 180ms ease !important;
    transform: none !important;
  }
}
`;
