'use client';

import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import type { PropsWithChildren } from 'react';

export function SiteMotionProvider({ children }: PropsWithChildren) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.6, ease: 'easeOut' }}>
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
