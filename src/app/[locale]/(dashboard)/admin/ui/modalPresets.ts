"use client";
import { useIsMobile } from "@/hooks/useIsMobile";

type ModalClassNames = {
  wrapper?: string;
  base?: string;
  header?: string;
  body?: string;
  footer?: string;
  closeButton?: string;
};

export function useAdminModalPreset() {
  const isMobile = useIsMobile();

  const classNames: ModalClassNames = isMobile
    ? {
        // Bottom sheet
        wrapper: "items-end", // coloca el modal abajo
        base:
          // altura casi completa, redondeado arriba, sin márgenes laterales
          "m-0 h-[92dvh] max-h-[92dvh] w-full rounded-t-2xl " +
          // estética
          "border border-white/10 bg-content1 shadow-2xl " +
          // safe area iOS
          "pb-[env(safe-area-inset-bottom)]",
        header: "px-4 py-3 pr-12", // pr extra para no chocar con la X
        body: "px-4 py-3",
        footer: "px-4 py-3",
        closeButton: "right-3 top-3 z-50",
      }
    : {
        // Desktop dialog centrado
        wrapper: "items-center",
        base:
          "rounded-2xl border border-white/10 bg-content1 shadow-2xl " +
          "max-h-[85vh]",
        header: "px-5 py-4 pr-12",
        body: "px-5 py-4",
        footer: "px-5 py-4",
        closeButton: "right-4 top-4 z-50",
      };

  return {
    // Props recomendados por HeroUI
    placement: (isMobile ? "bottom-center" : "center") as
      | "bottom-center"
      | "center",
    size: (isMobile ? "full" : "4xl") as "full" | "4xl",
    backdrop: "blur" as const,
    scrollBehavior: "inside" as const,
    radius: "lg" as const,
    classNames,
  };
}
