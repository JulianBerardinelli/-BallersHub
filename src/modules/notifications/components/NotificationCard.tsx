"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  CardBody,
  Chip,
  Tooltip,
} from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ExternalLink, X } from "lucide-react";
import clsx from "classnames";
import VerifiedBadge from "@/components/icons/VerifiedBadge";
import { NotificationPayload, NotificationTone } from "../types";

const toneStyles: Record<NotificationTone, {
  gradient: string[];
  chipColor: "default" | "primary" | "secondary" | "success" | "warning" | "danger";
  glow: string;
  shadow: string;
}> = {
  info: {
    gradient: ["from-sky-500/80", "via-sky-400/60", "to-blue-500/70"],
    chipColor: "primary",
    glow: "shadow-[0_18px_45px_-15px_rgba(56,189,248,0.55)]",
    shadow: "shadow-sky-900/40",
  },
  success: {
    gradient: ["from-emerald-500/80", "via-emerald-400/60", "to-green-500/70"],
    chipColor: "success",
    glow: "shadow-[0_18px_45px_-15px_rgba(16,185,129,0.55)]",
    shadow: "shadow-emerald-900/40",
  },
  warning: {
    gradient: ["from-amber-500/80", "via-amber-400/60", "to-orange-500/70"],
    chipColor: "warning",
    glow: "shadow-[0_18px_45px_-15px_rgba(245,158,11,0.55)]",
    shadow: "shadow-amber-900/40",
  },
  danger: {
    gradient: ["from-rose-500/80", "via-rose-400/60", "to-pink-500/70"],
    chipColor: "danger",
    glow: "shadow-[0_18px_45px_-15px_rgba(244,63,94,0.45)]",
    shadow: "shadow-rose-900/40",
  },
};

const categoryLabel: Record<NotificationPayload["category"], string> = {
  onboarding: "Onboarding",
  review: "Revisiones",
  announcement: "Novedades",
  profile: "Perfil",
};

const formatRelativeTime = (isoDate: string) => {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const absSec = Math.abs(diffSec);

  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

  if (absSec < 60) {
    return rtf.format(Math.round(diffSec / 1), "seconds");
  }
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) {
    return rtf.format(diffMin, "minutes");
  }
  const diffHours = Math.round(diffMin / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hours");
  }
  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, "days");
};

export type NotificationCardProps = {
  notification: NotificationPayload;
  onDismiss: (id: string) => void;
};

export const NotificationCard = ({ notification, onDismiss }: NotificationCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const tone = toneStyles[notification.tone];
  const relativeTime = useMemo(() => formatRelativeTime(notification.createdAt), [notification.createdAt]);

  useEffect(() => {
    if (isHovered) return;
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, 10000);
    return () => clearTimeout(timer);
  }, [isHovered, notification.id, onDismiss]);

  const canExpand = Boolean(notification.details) && notification.expandable;
  const showDetails = Boolean(notification.details) && (expanded || !canExpand);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, translateY: 24, scale: 0.97 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      exit={{ opacity: 0, translateY: 24, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card
        radius="lg"
        shadow="lg"
        className={clsx(
          "relative overflow-hidden border border-white/5 bg-neutral-950/80 backdrop-blur-xl",
          tone.shadow,
          tone.glow,
          "before:absolute before:inset-x-0 before:top-0 before:h-0.5",
          "before:bg-gradient-to-r",
          tone.gradient.map((cls) => `before:${cls}`),
        )}
      >
        <CardBody className="p-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className={clsx(
                "mt-1 h-10 w-1.5 rounded-full bg-gradient-to-b",
                tone.gradient,
              )}
            />
            <div className="flex-1 space-y-3">
              <header className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src="/favicon.ico"
                      size="sm"
                      radius="lg"
                      className="border border-white/10 shadow-inner shadow-black/40"
                    />
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1 text-sm font-semibold text-white">
                        BallersHub Admin
                        <VerifiedBadge size={16} title="Cuenta verificada" />
                      </span>
                      <div className="flex items-center gap-2 text-xs text-neutral-400">
                        <Chip
                          size="sm"
                          radius="sm"
                          variant="flat"
                          color={tone.chipColor}
                          className="bg-opacity-20 text-[11px] uppercase tracking-wide"
                        >
                          {categoryLabel[notification.category]}
                        </Chip>
                        <Tooltip content={new Date(notification.createdAt).toLocaleString("es-AR")}> 
                          <span>{relativeTime}</span>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-white">
                      {notification.title}
                    </h3>
                    <p className="text-sm text-neutral-300">
                      {notification.message}
                    </p>
                  </div>
                </div>
                <Button
                  isIconOnly
                  radius="full"
                  size="sm"
                  variant="light"
                  aria-label="Descartar notificación"
                  className="text-neutral-400 hover:text-white"
                  onPress={() => onDismiss(notification.id)}
                >
                  <X size={16} strokeWidth={2} />
                </Button>
              </header>

              <AnimatePresence initial={false}>
                {showDetails ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-neutral-200">
                      {notification.details}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div className="flex flex-wrap items-center gap-3">
                {notification.cta ? (
                  <Button
                    as="a"
                    href={notification.cta.href}
                    target="_self"
                    variant="flat"
                    color={tone.chipColor === "default" ? "primary" : tone.chipColor}
                    className="font-medium"
                    endContent={<ExternalLink size={16} />}
                  >
                    {notification.cta.label}
                  </Button>
                ) : null}

                {canExpand ? (
                  <Button
                    size="sm"
                    variant="light"
                    color="primary"
                    className="text-sm"
                    endContent={
                      <motion.span animate={{ rotate: expanded ? 180 : 0 }}>
                        <ChevronDown size={16} />
                      </motion.span>
                    }
                    onPress={() => setExpanded((prev) => !prev)}
                  >
                    {expanded ? "Ver menos" : "Ver más"}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.article>
  );
};
