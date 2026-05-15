// src/components/career/CareerRowRead.tsx
"use client";

import * as React from "react";
import { Button, Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { MoreHorizontal } from "lucide-react";
import CountryFlag from "@/components/common/CountryFlag";

import { bhButtonClass } from "@/components/ui/BhButton";
import { bhChip } from "@/lib/ui/heroui-brand";

export type TeamMeta = {
    slug?: string | null;
    country_code?: string | null;
    crest_url?: string | null;
};

export default function CareerRowRead({
    club,
    division,
    start_year,
    end_year,
    teamMeta,
    proposedCountry,
    onEdit,
    onEditProposed,
    onRemove,
    isCurrent,
    readOnly = false,
}: {
    club: string;
    division?: string | null;
    start_year?: number | null;
    end_year?: number | null;
    teamMeta?: TeamMeta | null;
    proposedCountry?: { code: string; name: string } | null;
    onEdit?: () => void;
    onEditProposed?: () => void;
    onRemove?: () => void;
    isCurrent?: boolean;
    readOnly?: boolean;
}) {
    const crest = (teamMeta?.crest_url && teamMeta.crest_url.trim())
        ? teamMeta.crest_url
        : "/images/team-default.svg";

    return (
        <div
            className={`group grid grid-cols-1 items-center gap-2 rounded-bh-md border p-3 transition-colors md:grid-cols-[1fr_auto] ${
                isCurrent
                    ? "border-[rgba(204,255,0,0.18)] bg-[rgba(204,255,0,0.04)]"
                    : "border-white/[0.06] bg-bh-surface-1/40 hover:border-white/[0.12]"
            }`}
        >
            <div className="flex min-w-0 items-center gap-3">
                <img
                    src={crest}
                    width={24}
                    height={24}
                    className="h-6 w-6 shrink-0 object-contain"
                    alt=""
                />
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="truncate font-bh-heading text-[14px] font-semibold text-bh-fg-1">
                            {club}
                        </p>
                        {teamMeta?.country_code && (
                            <CountryFlag code={teamMeta.country_code} size={12} />
                        )}
                        {!teamMeta?.crest_url && proposedCountry && (
                            <Chip size="sm" variant="flat" classNames={bhChip("warning")}>
                                Propuesto
                            </Chip>
                        )}
                        {isCurrent ? (
                            <Chip size="sm" variant="flat" classNames={bhChip("lime")}>
                                Actual
                            </Chip>
                        ) : null}
                    </div>
                    <p className="truncate text-[12px] text-bh-fg-3">
                        {division || "—"}{" "}
                        <span className="text-bh-fg-4">·</span>{" "}
                        <span className="font-bh-mono">
                            {start_year ?? "?"}–{end_year ?? "Actual"}
                        </span>
                    </p>
                </div>
            </div>

            {readOnly ? null : (
                <div className="justify-self-end opacity-0 transition-opacity group-hover:opacity-100">
                    <Dropdown
                        placement="bottom-end"
                        classNames={{
                            content:
                                "bg-bh-surface-1 border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.7)] p-1 rounded-bh-lg",
                        }}
                    >
                        <DropdownTrigger>
                            <Button
                                isIconOnly
                                variant="light"
                                className={bhButtonClass({ variant: "icon-ghost", size: "sm", iconOnly: true })}
                            >
                                <MoreHorizontal size={18} />
                            </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                            aria-label="Acciones"
                            itemClasses={{
                                base:
                                    "rounded-bh-md text-bh-fg-2 data-[hover=true]:bg-white/[0.05] data-[hover=true]:text-bh-fg-1",
                                title: "text-[13px]",
                            }}
                        >
                            {onEdit ? (
                                <DropdownItem key="edit" onPress={onEdit}>
                                    Editar
                                </DropdownItem>
                            ) : null}
                            {onEditProposed && !teamMeta?.crest_url ? (
                                <DropdownItem key="proposed" onPress={onEditProposed}>
                                    Detalles de equipo propuesto
                                </DropdownItem>
                            ) : null}
                            {onRemove ? (
                                <DropdownItem
                                    key="delete"
                                    color="danger"
                                    className="text-bh-danger data-[hover=true]:!bg-[rgba(239,68,68,0.08)] data-[hover=true]:!text-bh-danger"
                                    onPress={onRemove}
                                >
                                    Eliminar
                                </DropdownItem>
                            ) : null}
                        </DropdownMenu>
                    </Dropdown>
                </div>
            )}
        </div>
    );
}
