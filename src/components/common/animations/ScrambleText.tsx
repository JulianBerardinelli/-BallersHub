"use client";

import React, { useEffect, useState, useRef } from "react";
import { useInView } from "framer-motion";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!<>-_\\\\/[]{}—=+*^?#________";

export function ScrambleText({ text, delay = 0, className = "" }: { text: string; delay?: number; className?: string }) {
  const [displayText, setDisplayText] = useState(() => text.replace(/[^\s]/g, "\u00A0"));
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!inView) return;

    let timeout: NodeJS.Timeout;
    const startTimeout = setTimeout(() => {
      let iteration = 0;
      const letters = text.split("");

      timeout = setInterval(() => {
        setDisplayText(
          letters
            .map((letter, index) => {
              if (index < Math.floor(iteration)) {
                return letter;
              }
              if (letter === " ") return " ";
              return CHARS[Math.floor(Math.random() * CHARS.length)];
            })
            .join("")
        );

        if (iteration >= text.length) {
          clearInterval(timeout);
        }
        
        iteration += 1.5; 
      }, 20);
    }, delay * 1000);

    return () => {
      clearTimeout(startTimeout);
      clearInterval(timeout);
    };
  }, [inView, text, delay]);

  return (
    <span ref={ref} className={className}>
      {displayText}
    </span>
  );
}
