"use client";

import { createPortal } from "react-dom";
import { CircularProgress } from "@heroui/react";
import * as React from "react";

export default function FullScreenLoader({ text = "Cargando…", show }: { text?: string; show: boolean }) {
  if (!show) return null;
  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-black/30 backdrop-blur-sm">
      <CircularProgress aria-label="Loading..." color="primary" />
      <p className="text-sm opacity-90">{text}</p>
    </div>,
    document.body
  );
}
