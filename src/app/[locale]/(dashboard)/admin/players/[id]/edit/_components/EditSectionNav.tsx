"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { Breadcrumbs, BreadcrumbItem } from "@heroui/react";

import { Link } from "@/i18n/navigation";
import { ADMIN_EDIT_SECTIONS, adminEditSectionLabel } from "@/lib/admin/edit-sections";

type Props = { playerId: string; playerName: string };

export default function EditSectionNav({ playerId, playerName }: Props) {
  const segment = useSelectedLayoutSegment() ?? "datos";
  const activeLabel = adminEditSectionLabel(segment);

  return (
    <div className="space-y-4">
      <Breadcrumbs size="sm" variant="light">
        <BreadcrumbItem href="/admin/players">Jugadores</BreadcrumbItem>
        <BreadcrumbItem href={`/admin/players/${playerId}/edit/datos`}>
          {playerName || "Jugador"}
        </BreadcrumbItem>
        <BreadcrumbItem>{activeLabel}</BreadcrumbItem>
      </Breadcrumbs>

      <nav className="flex flex-wrap gap-1.5">
        {ADMIN_EDIT_SECTIONS.map((s) => {
          const isActive = s.key === segment;
          return (
            <Link
              key={s.key}
              href={`/admin/players/${playerId}/edit/${s.key}`}
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
