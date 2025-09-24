"use client";

import * as React from "react";
import clsx from "classnames";
import CountryFlag from "@/components/common/CountryFlag";

type TeamNameTickerProps = {
  name: string;
  countryCode: string | null;
};

export default function TeamNameTicker({ name, countryCode }: TeamNameTickerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = React.useState(false);

  const measure = React.useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const distance = content.scrollWidth - container.clientWidth;
    if (distance > 2) {
      setOverflow(true);
      content.style.setProperty("--marquee-distance", `${distance}px`);
    } else {
      setOverflow(false);
      content.style.removeProperty("--marquee-distance");
    }
  }, []);

  React.useEffect(() => {
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [measure, name, countryCode]);

  React.useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  if (!name) {
    return <span className="text-default-500">—</span>;
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden max-w-full" title={name}>
      <div
        ref={contentRef}
        className={clsx("flex items-center gap-1 min-w-0", overflow && "bh-marquee")}
      >
        <span className="truncate">{name}</span>
        {countryCode && <CountryFlag code={countryCode} size={16} />}
      </div>
      {overflow && (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-5"
            aria-hidden
            style={{
              background:
                "linear-gradient(to right, var(--heroui-colors-background) 0%, transparent 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-5"
            aria-hidden
            style={{
              background:
                "linear-gradient(to left, var(--heroui-colors-background) 0%, transparent 100%)",
            }}
          />
        </>
      )}
    </div>
  );
}
