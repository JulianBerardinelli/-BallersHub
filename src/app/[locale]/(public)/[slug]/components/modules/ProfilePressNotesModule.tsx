"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { dateLocaleTag } from "@/lib/i18n/dates";
import type { Locale } from "@/i18n/routing";

type Article = {
  id: string;
  title: string;
  url: string;
  imageUrl?: string | null;
  publisher?: string | null;
  publishedAt?: string | null;
  position?: number | null;
};

const NEWSPAPER_BASE_WIDTH = 760;

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function ScalableNewspaper({ children }: { children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState<number | null>(null);

  const update = useCallback(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner) return;
    const available = wrapper.clientWidth;
    if (available <= 0) return;
    const nextScale = Math.min(1, available / NEWSPAPER_BASE_WIDTH);
    setScale(nextScale);
    setInnerHeight(inner.offsetHeight);
  }, []);

  useIsomorphicLayoutEffect(() => {
    update();
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner) return;
    const ro = new ResizeObserver(update);
    ro.observe(wrapper);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [update]);

  return (
    <div
      ref={wrapperRef}
      className="relative w-full"
      style={{ height: innerHeight !== null ? innerHeight * scale : undefined }}
    >
      <div
        ref={innerRef}
        style={{
          width: NEWSPAPER_BASE_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          opacity: innerHeight === null ? 0 : 1,
          transition: "opacity 200ms ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export type PressNotesLayout = "newspaper" | "cards";

export default function ProfilePressNotesModule({
  articles,
  layout = "newspaper",
}: {
  articles: Article[];
  layout?: PressNotesLayout;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("portfolio");

  // If no articles, don't render the section
  if (!articles || articles.length === 0) return null;

  // Sort by the player's manual order (position asc). publishedAt (most
  // recent first) is the tiebreaker for legacy rows that share position 0.
  const sortedArticles = [...articles].sort((a, b) => {
    const pa = a.position ?? 0;
    const pb = b.position ?? 0;
    if (pa !== pb) return pa - pb;
    if (!a.publishedAt) return 1;
    if (!b.publishedAt) return -1;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  return (
    <section
      ref={containerRef}
      id="press"
      className="relative z-40 py-20 px-6 md:px-12 w-full max-w-[1400px] mx-auto"
    >
      {/* AMBIENT BACKGROUND EFFECTS */}
      <div className="absolute inset-0 z-0 pointer-events-none">

        {/* Moving Orbs */}
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, 30, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-[var(--theme-accent)]/15 blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, -50, 0], y: [0, -40, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-white/5 blur-[140px]"
        />

        {/* Central Spotlight behind the layout */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--theme-accent)]/10 blur-[150px] rounded-full" />
      </div>

      <div className="relative z-10">
        {/* SECTION HEADER (Standard Portfolio Style) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="w-full mb-12 flex flex-col md:items-center md:text-center"
        >
          <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-[var(--theme-accent)] mb-2">
            {t("modules.press.eyebrow")}
          </h2>
          <h3 className="text-3xl md:text-5xl lg:text-6xl font-black font-heading text-white uppercase drop-shadow-2xl leading-[0.9]">
            {t("modules.press.title")}
          </h3>
        </motion.div>

        {layout === "cards" ? (
          <CardsGrid articles={sortedArticles} />
        ) : (
          <NewspaperCarousel articles={sortedArticles} />
        )}
      </div>
    </section>
  );
}

function NewspaperCarousel({ articles }: { articles: Article[] }) {
  // Chunk articles into sets of 7
  const chunkSize = 7;
  const chunkedArticles: Article[][] = [];
  for (let i = 0; i < articles.length; i += chunkSize) {
    chunkedArticles.push(articles.slice(i, i + chunkSize));
  }

  return (
    <div className={`w-full flex overflow-x-auto snap-x snap-mandatory gap-8 pb-12 px-4 md:px-12 scrollbar-hide ${chunkedArticles.length === 1 ? 'justify-center' : ''}`}>
        {chunkedArticles.map((chunk, chunkIndex) => (
          <motion.div
            key={`newspaper-${chunkIndex}`}
            initial={{ opacity: 0, scale: 0.95, rotate: chunkIndex % 2 === 0 ? -2 : 1 }}
            whileInView={{ opacity: 1, scale: 1, rotate: chunkIndex % 2 === 0 ? 1 : -1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            viewport={{ once: true }}
            className="w-full max-w-[760px] shrink-0 relative shadow-[0_30px_60px_rgba(0,0,0,0.6)] snap-center"
          >
            <ScalableNewspaper>
            {/* Background Texture & Paper styling */}
            <div
              className="w-full bg-[#f4f4f0] text-black p-6 md:p-10 relative overflow-hidden h-full"
              style={{
                backgroundImage: "url('/images/pack/textures/paper_crumpled_1.jpg')",
                backgroundSize: "cover",
                backgroundBlendMode: "multiply"
              }}
            >
              {/* Subtle overlay to soften the paper texture slightly */}
              <div className="absolute inset-0 bg-white/40 pointer-events-none" />

              <div className="relative z-10">
                {/* NEWSPAPER HEADER */}
                <div className="border-b-[3px] border-black/80 pb-4 mb-8 text-center flex flex-col md:flex-row justify-between items-end gap-4">
                  <div className="flex-1 text-left">
                    <p className="text-black/60 text-[10px] md:text-xs font-serif uppercase tracking-[0.2em] mb-1 font-semibold">
                      The Professional Times
                    </p>
                    <h2 className="text-3xl md:text-5xl font-black font-serif tracking-tighter uppercase leading-[0.8] text-black">
                      DAILY PRESS
                    </h2>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-black/60 font-serif text-[10px] md:text-xs uppercase font-semibold">
                      Vol. {chunkIndex + 1} — Daily Edition
                    </p>
                    <p className="text-black/60 font-serif text-[9px] md:text-[10px] uppercase">
                      Exclusive Coverage
                    </p>
                  </div>
                </div>

                {/* NEWSPAPER GRID (7-item structured packing) */}
                <div className="grid grid-cols-12 gap-y-8 gap-x-0 items-start">
                  {chunk.map((article, index) => {
                    let spanClass = "col-span-4";
                    let titleClass = "text-lg md:text-xl";
                    let imageRatio = "aspect-[4/3]";

                    if (index === 0) {
                      spanClass = "col-span-8 pr-4 md:pr-6";
                      titleClass = "text-2xl md:text-3xl lg:text-4xl";
                      imageRatio = "aspect-[16/9]";
                    } else if (index === 1) {
                      spanClass = "col-span-4 border-l-[2px] border-black/20 pl-4 md:pl-6";
                      titleClass = "text-lg md:text-xl";
                      imageRatio = "aspect-[4/3]";
                    } else if (index === 2) {
                      spanClass = "col-span-4 border-t border-black/20 pt-6 pr-4 md:pr-6";
                      titleClass = "text-lg md:text-xl";
                      imageRatio = "aspect-square";
                    } else if (index === 3 || index === 4) {
                      spanClass = "col-span-4 border-t border-black/20 pt-6 border-l-[1px] border-black/20 pl-4 pr-4 md:pl-6 md:pr-6";
                      if (index === 4) spanClass = spanClass.replace('pr-4 md:pr-6', ''); // Last in row doesn't need right padding
                      titleClass = "text-lg md:text-xl";
                      imageRatio = "aspect-square";
                    } else if (index === 5) {
                      spanClass = "col-span-6 border-t border-black/20 pt-6 pr-4 md:pr-6";
                      titleClass = "text-xl md:text-2xl";
                      imageRatio = "aspect-[3/2]";
                    } else if (index === 6) {
                      spanClass = "col-span-6 border-t border-black/20 pt-6 border-l-[2px] border-black/20 pl-4 md:pl-6";
                      titleClass = "text-xl md:text-2xl";
                      imageRatio = "aspect-[3/2]";
                    }

                    return (
                      <a 
                        key={article.id}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group flex flex-col gap-3 h-full ${spanClass}`}
                      >
                        <div>
                          {article.publisher && (
                            <p className="text-black/50 text-[9px] md:text-[10px] font-serif uppercase tracking-widest font-bold mb-1.5 md:mb-2">
                              {article.publisher}
                            </p>
                          )}
                          <h3 className={`font-serif font-black uppercase text-black/90 leading-[0.9] transition-all duration-300 ease-out 
                            group-hover:text-[#0ea5e9] group-hover:underline decoration-2 underline-offset-[4px] decoration-[#0ea5e9]/50
                            ${titleClass}`}
                          >
                            {article.title}
                          </h3>
                        </div>

                        {article.imageUrl && (
                          <div className={`w-full overflow-hidden border border-black/10 relative bg-black/5 mt-auto ${imageRatio}`}>
                            <div className="absolute inset-0 z-10 bg-black/0 group-hover:bg-[#0ea5e9]/10 transition-colors duration-500 flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="bg-white text-[#0ea5e9] rounded-full p-2 md:p-3 transform translate-y-6 group-hover:translate-y-0 transition-all duration-500 shadow-xl">
                                <ExternalLink size={20} strokeWidth={2.5} />
                              </div>
                            </div>
                            
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={article.imageUrl} 
                              alt={article.title}
                              className="w-full h-full object-cover object-top grayscale opacity-90 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
                              group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105"
                              loading="lazy"
                            />
                          </div>
                        )}
                        
                        {/* DIVIDER LINE (for mobile editorial separation) */}
                        <div className="w-full h-[1px] bg-black/10 mt-6 hidden" />
                      </a>
                    );
                  })}
                </div>

              </div>
            </div>
            </ScalableNewspaper>
          </motion.div>
        ))}
    </div>
  );
}

function CardsGrid({ articles }: { articles: Article[] }) {
  const locale = useLocale() as Locale;
  const count = articles.length;

  // Adapt the column count to the actual number of articles so we never get
  // a half-empty row dangling left. With 1 we render a single centered card;
  // with 2 we hold the 2-col layout and constrain the grid width so it stays
  // visually centered on desktop. 3+ uses the responsive 2/3 grid as usual.
  // Tailwind requires literal class strings, so we map explicitly.
  const gridClass =
    count === 1
      ? "grid-cols-1 max-w-md mx-auto"
      : count === 2
        ? "grid-cols-2 max-w-[640px] lg:max-w-[920px] mx-auto"
        : "grid-cols-2 lg:grid-cols-3";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`w-full grid ${gridClass} gap-4 sm:gap-5 md:gap-6`}
    >
      {articles.map((article, index) => (
        <motion.a
          key={article.id}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: Math.min(index * 0.04, 0.32), ease: "easeOut" }}
          className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm transition-all duration-500 hover:border-[var(--theme-accent)]/40 hover:bg-white/[0.05] hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:-translate-y-1"
        >
          {article.imageUrl ? (
            <div className="relative w-full aspect-[16/10] overflow-hidden bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.imageUrl}
                alt={article.title}
                className="absolute inset-0 w-full h-full object-cover grayscale-[0.35] opacity-90 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-[1.04]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

              <div className="absolute top-3 right-3 z-10 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md p-2 opacity-0 translate-y-1 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
                <ExternalLink size={14} strokeWidth={2.25} className="text-[var(--theme-accent)]" />
              </div>
            </div>
          ) : (
            <div className="relative w-full aspect-[16/10] overflow-hidden bg-gradient-to-br from-white/[0.06] to-white/[0.02] flex items-center justify-center">
              <span className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">
                {article.publisher ?? "Press"}
              </span>
              <div className="absolute top-3 right-3 z-10 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md p-2 opacity-0 translate-y-1 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
                <ExternalLink size={14} strokeWidth={2.25} className="text-[var(--theme-accent)]" />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5 sm:gap-2 p-3 sm:p-5 md:p-6 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em] sm:tracking-[0.22em] text-[var(--theme-accent)]/90">
              {article.publisher && (
                <span className="truncate max-w-full">{article.publisher}</span>
              )}
              {article.publisher && article.publishedAt && (
                <span className="text-white/25 hidden sm:inline">•</span>
              )}
              {article.publishedAt && (
                <time className="text-white/45">
                  {new Date(article.publishedAt).toLocaleDateString(dateLocaleTag(locale), {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </time>
              )}
            </div>
            <h3 className="font-heading text-sm sm:text-lg md:text-xl font-black uppercase leading-[1.1] sm:leading-[1.05] text-white transition-colors duration-300 group-hover:text-[var(--theme-accent)] line-clamp-3">
              {article.title}
            </h3>
          </div>
        </motion.a>
      ))}
    </motion.div>
  );
}
