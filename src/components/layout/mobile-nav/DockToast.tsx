"use client";

// Minimal ephemeral toast for dock feedback (e.g. "Link copiado"). Portaled to
// body, auto-dismisses, honors the safe-area. Sits just above the dock.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function DockToast({
  message,
  onDone,
}: {
  message: string | null;
  onDone: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onDone, 1900);
    return () => clearTimeout(id);
  }, [message, onDone]);

  if (!mounted || !message) return null;

  return createPortal(
    <div
      className="bh-dock-root"
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: "calc(96px + env(safe-area-inset-bottom, 0px))",
        display: "flex",
        justifyContent: "center",
        zIndex: 62,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-bh-body), 'DM Sans', sans-serif",
          fontSize: 12.5,
          fontWeight: 600,
          color: "#fff",
          padding: "9px 16px",
          borderRadius: 999,
          background: "var(--bh-dock-surface, rgba(15,15,15,0.94))",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        }}
      >
        {message}
      </div>
    </div>,
    document.body,
  );
}
