"use client";
import * as React from "react";

/** Devuelve true si el viewport es < 640px (sm). Podés pasar otro ancho si querés. */
export function useIsMobile(breakpoint: number = 640) {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width:${breakpoint - 1}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [breakpoint]);
  return isMobile;
}
