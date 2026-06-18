"use client";

// Copied verbatim from the player Pro portfolio. Keeps every framer-motion
// `useScroll({ target })` instance calibrated when streaming/layout shifts move
// targets after mount (ResizeObserver(body) → synthetic window.resize). Mount
// once at the top of the Pro layout. See the player original for the full
// rationale.

import { useEffect } from "react";

export default function ScrollMeasurementSync() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (typeof ResizeObserver === "undefined") {
      if (document.readyState === "complete") {
        window.dispatchEvent(new Event("resize"));
      } else {
        window.addEventListener(
          "load",
          () => window.dispatchEvent(new Event("resize")),
          { once: true },
        );
      }
      return;
    }

    const dispatchResize = () => window.dispatchEvent(new Event("resize"));
    const observer = new ResizeObserver(dispatchResize);
    observer.observe(document.body);
    if (document.documentElement) observer.observe(document.documentElement);

    let loadHandler: (() => void) | null = null;
    if (document.readyState !== "complete") {
      loadHandler = () => dispatchResize();
      window.addEventListener("load", loadHandler, { once: true });
    }

    return () => {
      observer.disconnect();
      if (loadHandler) window.removeEventListener("load", loadHandler);
    };
  }, []);

  return null;
}
