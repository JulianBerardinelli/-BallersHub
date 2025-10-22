'use client';

import clsx from 'classnames';
import type { CardProps } from '@heroui/react';
import { Card } from '@heroui/react';
import { motion } from 'framer-motion';
import type { MotionProps } from 'framer-motion';

const MotionCard = motion(Card);

export type AnimatedCardProps = CardProps &
  MotionProps & {
    delay?: number;
    hoverElevation?: number;
  };

export function AnimatedCard({
  children,
  className,
  delay = 0,
  hoverElevation = 12,
  transition: transitionProp,
  whileHover,
  ...rest
}: AnimatedCardProps) {
  const baseTransition = transitionProp ?? {
    duration: 0.55,
    delay,
    ease: 'easeOut',
  };

  const hoverState = whileHover ?? {
    y: -hoverElevation,
    scale: 1.02,
    boxShadow: '0px 32px 60px rgba(13, 213, 165, 0.18)',
  };

  return (
    <MotionCard
      {...rest}
      className={clsx('will-change-transform transition-transform duration-300', className)}
      initial={rest.initial ?? { opacity: 0, y: 28, scale: 0.97 }}
      whileInView={rest.whileInView ?? { opacity: 1, y: 0, scale: 1 }}
      viewport={rest.viewport ?? { once: true, margin: '-12% 0px -12% 0px' }}
      transition={baseTransition}
      whileHover={hoverState}
    >
      {children}
    </MotionCard>
  );
}
