"use client";

// Fixed reading-progress bar at the very top of the viewport. Tracks scroll
// across the article body (#bh-article-body) only — so it fills as you read
// the prose, not the hero or footer.

import { useEffect, useState } from "react";

export function ReadingProgress({ accent }: { accent: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      const el = document.getElementById("bh-article-body");
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const start = rect.top + window.scrollY - 120;
      const total = el.offsetHeight - 200;
      const cur = window.scrollY - start;
      setProgress(total > 0 ? Math.max(0, Math.min(1, cur / total)) : 0);
    };
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-[3px]" aria-hidden>
      <div
        className="h-full transition-[width] duration-75 ease-linear"
        style={{ width: `${progress * 100}%`, background: accent, boxShadow: `0 0 12px ${accent}` }}
      />
    </div>
  );
}
