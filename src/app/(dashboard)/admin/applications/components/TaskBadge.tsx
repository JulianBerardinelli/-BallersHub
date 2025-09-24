"use client";

import * as React from "react";
import { Chip } from "@heroui/react";
import { Info } from "lucide-react";
import type { Task } from "../types";

type TaskBadgeProps = {
  tasks: Task[];
  onPress: () => void;
};

export default function TaskBadge({ tasks, onPress }: TaskBadgeProps) {
  const [index, setIndex] = React.useState(0);
  const [fade, setFade] = React.useState(false);

  React.useEffect(() => {
    if (tasks.length <= 1) return;
    const id = setInterval(() => {
      setFade(true);
      setTimeout(() => {
        setIndex((i) => (i + 1) % tasks.length);
        setFade(false);
      }, 200);
    }, 3000);
    return () => clearInterval(id);
  }, [tasks.length]);

  if (!tasks.length) return <span className="text-default-500">—</span>;

  const task = tasks[index];

  return (
    <Chip
      size="sm"
      variant="faded"
      onClick={onPress}
      className={`cursor-pointer transition-opacity duration-200 w-32 justify-start border ${
        fade ? "opacity-0" : "opacity-100"
      } ${task.className}`}
      startContent={<Info size={14} />}
    >
      {task.label}
    </Chip>
  );
}
