'use client';

import clsx from 'classnames';
import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { useMemo } from 'react';
import { m } from 'framer-motion';
import type { MotionProps } from 'framer-motion';

export type AnimatedSectionProps = Omit<HTMLAttributes<HTMLElement>, 'children'> &
  MotionProps & {
    as?: ElementType;
    children: ReactNode;
    className?: string;
    delay?: number;
    duration?: number;
    initialY?: number;
    offset?: string;
    once?: boolean;
  };

export function AnimatedSection({
  as = 'section',
  children,
  className,
  delay = 0,
  duration = 0.6,
  initialY = 36,
  offset = '-20% 0px -20% 0px',
  once = true,
  transition: transitionProp,
  ...rest
}: AnimatedSectionProps) {
  const MotionComponent = useMemo(() => m(as), [as]);

  const initialValue = rest.initial ?? { opacity: 0, y: initialY };
  const whileInViewValue = rest.whileInView ?? { opacity: 1, y: 0 };
  const transitionValue = transitionProp ?? {
    duration,
    delay,
    ease: 'easeOut',
  };
  const viewportValue = rest.viewport ?? { once, margin: offset };

  return (
    <MotionComponent
      {...rest}
      className={clsx('will-change-transform', className)}
      initial={initialValue}
      whileInView={whileInViewValue}
      transition={transitionValue}
      viewport={viewportValue}
    >
      {children}
    </MotionComponent>
  );
}
