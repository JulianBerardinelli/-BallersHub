"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { Breadcrumbs, BreadcrumbItem } from "@heroui/react";

import { Link } from "@/i18n/navigation";
import {
  COACH_ADMIN_EDIT_SECTIONS,
  coachAdminEditSectionLabel,
} from "@/lib/admin/coach-edit-sections";

type Props = { coachId: string; coachName: string };

// Mirror of the player module's EditSectionNav (breadcrumb + section tabs).
export default function EditCoachSectionNav({ coachId, coachName }: Props) {
  const segment = useSelectedLayoutSegment() ?? "datos";
  const activeLabel = coachAdminEditSectionLabel(segment);

  return (
    <div className="space-y-4">
      <Breadcrumbs size="sm" variant="light">
        <BreadcrumbItem href="/admin/coaches">Entrenadores</BreadcrumbItem>
        <BreadcrumbItem href={`/admin/coaches/${coachId}/edit/datos`}>
          {coachName || "Entrenador"}
        </BreadcrumbItem>
        <BreadcrumbItem>{activeLabel}</BreadcrumbItem>
      </Breadcrumbs>

      <nav className="flex flex-wrap gap-1.5">
        {COACH_ADMIN_EDIT_SECTIONS.map((s) => {
          const isActive = s.key === segment;
          return (
            <Link
              key={s.key}
              href={`/admin/coaches/${coachId}/edit/${s.key}`}
              className={
                isActive
                  ? "rounded-bh-pill border border-bh-lime/40 bg-bh-lime/10 px-3 py-1.5 text-[12px] font-semibold text-bh-lime"
                  : "rounded-bh-pill border border-white/[0.08] px-3 py-1.5 text-[12px] font-medium text-bh-fg-3 transition-colors hover:bg-white/[0.06] hover:text-bh-fg-1"
              }
            >
              {s.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
