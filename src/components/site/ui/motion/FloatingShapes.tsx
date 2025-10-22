'use client';

import clsx from 'classnames';
import { m } from 'framer-motion';
import type { MotionProps } from 'framer-motion';

export type FloatingShape = {
  size: number;
  top: string;
  left: string;
  opacity?: number;
  blur?: number;
  delay?: number;
  duration?: number;
  floatY?: number;
  floatX?: number;
  gradient?: string;
};

export interface FloatingShapesProps extends MotionProps {
  className?: string;
  shapes?: FloatingShape[];
}

const DEFAULT_SHAPES: FloatingShape[] = [
  {
    size: 360,
    top: '-12%',
    left: '58%',
    opacity: 0.6,
    blur: 90,
    duration: 14,
    floatY: 26,
    floatX: 12,
  },
  {
    size: 280,
    top: '52%',
    left: '-8%',
    opacity: 0.55,
    blur: 110,
    duration: 18,
    floatY: 24,
  },
  {
    size: 320,
    top: '68%',
    left: '62%',
    opacity: 0.45,
    blur: 120,
    duration: 20,
    floatY: 28,
    floatX: -14,
  },
];

export function FloatingShapes({ className, shapes = DEFAULT_SHAPES, ...motionProps }: FloatingShapesProps) {
  return (
    <div className={clsx('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}>
      {shapes.map((shape, index) => (
        <m.span
          key={`${shape.top}-${shape.left}-${index}`}
          aria-hidden
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{
            opacity: shape.opacity ?? 0.6,
            y: [0, -(shape.floatY ?? 20), 0],
            x: [0, shape.floatX ?? 0, 0],
            scale: [0.95, 1.05, 0.95],
          }}
          transition={{
            duration: shape.duration ?? 16,
            delay: shape.delay ?? index * 0.4,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
          className="absolute rounded-full"
          style={{
            width: shape.size,
            height: shape.size,
            top: shape.top,
            left: shape.left,
            background:
              shape.gradient ??
              'radial-gradient(circle at 30% 30%, rgba(13, 213, 165, 0.35), rgba(13, 213, 165, 0))',
            filter: `blur(${shape.blur ?? 80}px)`,
          }}
          {...motionProps}
        />
      ))}
    </div>
  );
}
