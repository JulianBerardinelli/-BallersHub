"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button, Chip, Progress } from "@heroui/react";

export type DashboardProgressSection = {
  id: string;
  title: string;
  description: string;
  href: string;
  completed: number;
  total: number;
  missing: string[];
};

function getProgressColor(percentage: number): "primary" | "success" | "warning" {
  if (percentage >= 100) return "success";
  if (percentage >= 50) return "primary";
  return "warning";
}

export default function DashboardProgressList({ sections }: { sections: DashboardProgressSection[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {sections.map((section) => {
        const percentage = section.total > 0 ? Math.round((section.completed / section.total) * 100) : 0;
        const pending = Math.max(section.total - section.completed, 0);
        const progressColor = getProgressColor(percentage);
        const chipColor = pending === 0 ? "success" : "warning";

        return (
          <div
            key={section.id}
            className="flex h-full flex-col gap-4 rounded-lg border border-neutral-900 bg-neutral-950/70 p-5"
          >
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{section.title}</p>
                  <p className="text-xs text-neutral-400">{section.description}</p>
                </div>
                <Chip color={chipColor} variant="flat" size="sm" className="font-semibold uppercase tracking-wide">
                  {section.completed}/{section.total}
                </Chip>
              </div>
            </div>

            <Progress
              aria-label={`Progreso ${section.title}`}
              value={percentage}
              color={progressColor}
              classNames={{
                indicator: "bg-gradient-to-r from-primary to-primary-500",
                track: "bg-neutral-900",
              }}
            />

            {pending > 0 ? (
              <ul className="list-disc space-y-1 pl-4 text-xs text-neutral-400">
                {section.missing.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-emerald-300">¡Todo listo! Seguimos actualizando tu perfil en esta sección.</p>
            )}

            <Button
              as={Link}
              href={section.href}
              variant="light"
              color="primary"
              size="sm"
              className="self-start"
              endContent={<ArrowUpRight size={16} />}
            >
              Abrir sección
            </Button>
          </div>
        );
      })}
    </div>
  );
}
