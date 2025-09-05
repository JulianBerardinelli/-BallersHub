// src/components/career/CareerRowRead.tsx
"use client";

import * as React from "react";
import { Button, Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { MoreHorizontal } from "lucide-react";
import CountryFlag from "@/components/common/CountryFlag";

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
    proposedCountry,   // si es propuesto
    onEdit,
    onEditProposed,
    onRemove,
    isCurrent
}: {
    club: string;
    division?: string | null;
    start_year?: number | null;
    end_year?: number | null;
    teamMeta?: TeamMeta | null;
    proposedCountry?: { code: string; name: string } | null;
    onEdit: () => void;
    onEditProposed?: () => void;
    onRemove: () => void;
    isCurrent?: boolean;  
}) {
    const crest = (teamMeta?.crest_url && teamMeta.crest_url.trim())
        ? teamMeta.crest_url
        : "/images/team-default.svg";

    return (
        <div className="group grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-center rounded-lg border p-3">
            <div className="flex items-center gap-3 min-w-0">

                <img
                    src={crest}
                    width={24}
                    height={24}
                    className="h-6 w-6 object-contain shrink-0"
                    alt=""
                />
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{club}</p>
                        {teamMeta?.country_code && <CountryFlag code={teamMeta.country_code} size={12} />}
                        {!teamMeta?.crest_url && proposedCountry && (
                            <Chip size="sm" variant="flat" className="px-2">Propuesto</Chip>
                        )}
                    </div>
                    <p className="text-sm text-foreground-500 truncate">
                        {division || "—"} · {start_year ?? "?"}–{end_year ?? "Actual"}
                    </p>
                </div>
            </div>

            <div className="justify-self-end opacity-0 group-hover:opacity-100 transition-opacity">
                <Dropdown placement="bottom-end">
                    <DropdownTrigger>
                        <Button isIconOnly variant="light" className="data-[hover=true]:bg-content2">
                            <MoreHorizontal size={18} />
                        </Button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label="Acciones">
                        <DropdownItem key="edit" onPress={onEdit}>Editar</DropdownItem>
                        {onEditProposed && !teamMeta?.crest_url ? (
                            <DropdownItem key="proposed" onPress={onEditProposed}>
                                Detalles de equipo propuesto
                            </DropdownItem>
                        ) : null}
                        <DropdownItem key="delete" color="danger" className="text-danger" onPress={onRemove}>
                            Eliminar
                        </DropdownItem>
                    </DropdownMenu>
                </Dropdown>
            </div>
        </div>
    );
}
