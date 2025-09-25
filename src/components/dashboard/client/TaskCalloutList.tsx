"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import TaskSeverityChip from "./TaskSeverityChip";
import type { TaskSeverity } from "@/lib/dashboard/client/tasks";

export type TaskCallout = {
  id: string;
  severity: TaskSeverity;
  title: string;
  description: string;
  href: string;
};

export default function TaskCalloutList({ tasks }: { tasks: TaskCallout[] }) {
  const pathname = usePathname();

  if (!tasks.length) return null;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-4 shadow-sm shadow-black/20">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">Tareas pendientes en esta sección</p>
        <span className="text-xs text-neutral-500">{tasks.length} pendiente(s)</span>
      </div>
      <ul className="space-y-3 text-sm text-neutral-200">
        {tasks.map((task) => {
          const showLink = task.href !== pathname;

          return (
            <li
              key={task.id}
              className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <TaskSeverityChip severity={task.severity} />
                <span className="font-semibold text-white">{task.title}</span>
              </div>
              <p className="mt-2 text-xs text-neutral-400">{task.description}</p>
              {showLink ? (
                <Link
                  href={task.href}
                  className="mt-2 inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  Ver detalle
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
