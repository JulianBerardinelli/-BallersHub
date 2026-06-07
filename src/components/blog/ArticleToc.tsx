"use client";

// Sticky table of contents with scroll-spy. Built from the heading outline
// the server extracted from the post HTML (ids already injected into the
// matching <h2>/<h3> in the prose).

import { useEffect, useState } from "react";
import type { TocHeading } from "@/lib/blog/toc";

export function ArticleToc({
  headings,
  accent,
}: {
  headings: TocHeading[];
  accent: string;
}) {
  const [activeId, setActiveId] = useState(headings[0]?.id);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      let current = headings[0]?.id;
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top <= 160) current = h.id;
      }
      setActiveId(current);
    };
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, [headings]);

  if (headings.length === 0) return null;

  const go = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <nav className="sticky top-24">
      <div className="mb-4 font-bh-display text-[12.5px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
        En esta nota
      </div>
      <div className="flex flex-col gap-0.5 border-l border-white/10">
        {headings.map((h) => {
          const on = h.id === activeId;
          return (
            <a
              key={h.id}
              href={`#${h.id}`}
              onClick={(e) => go(e, h.id)}
              className={`-ml-px border-l-2 py-[7px] font-bh-body text-[13px] leading-[1.4] transition-colors ${
                h.level === 3 ? "pl-7" : "pl-4"
              } ${on ? "font-semibold text-bh-fg-1" : "text-bh-fg-2 hover:text-bh-fg-1"}`}
              style={{ borderColor: on ? accent : "transparent" }}
            >
              {h.text}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
