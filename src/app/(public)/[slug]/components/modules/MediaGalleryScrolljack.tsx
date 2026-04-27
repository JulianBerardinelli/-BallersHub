"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

type Media = {
  id: string;
  url: string;
  title?: string | null;
  altText?: string | null;
  type: string;
};

export default function MediaGalleryScrolljack({ media }: { media: Media[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // The scroll container is high to allow long scrolling
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  if (!media || media.length === 0) return null;

  return (
    <section ref={containerRef} className="relative h-[400vh] bg-black w-full" id="gallery">
      {/* Sticky container that holds the viewport */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        
        {/* Title overlay */}
        <div className="absolute top-12 md:top-24 left-6 md:left-12 z-50 pointer-events-none">
          <h2 className="text-4xl md:text-7xl font-black text-white mix-blend-difference font-heading uppercase tracking-tighter">
            THE VAULT
          </h2>
        </div>

        {/* The Gallery Images */}
        {media.map((item, i) => {
          // Calculate individual progress ranges for each image so they sequence nicely.
          // For 5 images over 400vh:
          // 0: 0.0 -> 0.3
          // 1: 0.15 -> 0.45
          // 2: 0.3 -> 0.6
          // 3: 0.45 -> 0.75
          // 4: 0.6 -> 0.9
          
          const start = i * 0.15;
          const end = start + 0.3;
          
          // Image scales up as it comes in
          const scale = useTransform(scrollYProgress, [start, start + 0.15, end], [0.5, 1, 1.5]);
          
          // Opacity fades in then fades out
          const opacity = useTransform(scrollYProgress, [start, start + 0.1, end - 0.1, end], [0, 1, 1, 0]);
          
          // Z-index to stack properly
          const zIndex = 10 + i;

          // A slight rotation to give that "dump" casual feeling
          const rotateConfig = [0, -2, 3, -1, 2];
          const rotate = useTransform(scrollYProgress, [start, end], [rotateConfig[i % 5] * 2, rotateConfig[i % 5] * -2]);

          return (
            <motion.div
              key={item.id}
              style={{
                scale,
                opacity,
                zIndex,
                rotate,
                position: "absolute",
                top: "50%",
                left: "50%",
                x: "-50%",
                y: "-50%",
              }}
              className="w-[85vw] md:w-[60vw] max-w-[1200px] aspect-[4/5] md:aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/10"
            >
              {item.type === "photo" ? (
                <img
                  src={item.url}
                  alt={item.altText || item.title || "Gallery image"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <video
                  src={item.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* Optional caption at the bottom */}
              {item.title && (
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white font-medium text-lg md:text-2xl">{item.title}</p>
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Global Progress indicator */}
        <div className="absolute bottom-12 right-12 z-50 flex items-center gap-4">
          <span className="text-white/50 text-sm font-medium tracking-widest uppercase">Explore</span>
          <div className="w-[100px] h-[2px] bg-white/20 relative rounded-full overflow-hidden">
            <motion.div 
              style={{ scaleX: scrollYProgress, transformOrigin: "left" }} 
              className="absolute inset-0 bg-white"
            />
          </div>
        </div>

      </div>
    </section>
  );
}
