"use client";

import * as React from "react";
import {
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Skeleton,
} from "@heroui/react";
import CountryFlag from "@/components/common/CountryFlag";
import TeamCrest from "@/components/teams/TeamCrest";
import type { ApplicationRow } from "../types";
import CareerProposalRow from "./CareerProposalRow";
import {
  formatBirthDate,
} from "../utils";

import { bhButtonClass } from "@/components/ui/BhButton";

type ModalClassNames = {
  header?: string;
  body?: string;
  footer?: string;
};

type CareerItem = {
  id: string;
  status: string;
  team_status: string | null;
  team_name: string;
  crest_url: string | null;
  country_code: string | null;
  division: string | null;
  start_year: number | null;
  end_year: number | null;
};

type ConfirmApplicationModalProps = {
  application: ApplicationRow;
  classNames?: ModalClassNames;
  onClose: () => void;
};

function SkeletonRow() {
  return (
    <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1/60 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-3 w-3/5 rounded-full" />
            <Skeleton className="h-3 w-2/5 rounded-full" />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function ConfirmApplicationModal({
  application,
  classNames,
  onClose,
}: ConfirmApplicationModalProps) {
  const [items, setItems] = React.useState<CareerItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/applications/${application.id}/career`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudo cargar la trayectoria");
        if (!active) return;
        setItems(Array.isArray(json.items) ? json.items : []);
      } catch (e: unknown) {
        if (!active) return;
        setItems([]);
        setError(e instanceof Error ? e.message : "No se pudo cargar la trayectoria");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [application.id]);

  return (
    <>
      <ModalHeader className={classNames?.header}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium truncate">{application.applicant ?? "(sin nombre)"}</span>
            {application.nationalities.map((n, index) =>
              n.code ? <CountryFlag key={`${n.code}-${index}`} code={n.code} size={16} /> : null,
            )}
          </div>
          <div className="grid gap-2 text-sm text-bh-fg-3 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-bh-fg-4">Fecha de nacimiento</p>
              <p className="text-default-700">{formatBirthDate(application.birth_date)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-bh-fg-4">Altura</p>
              <p className="text-default-700">
                {application.height_cm ? `${application.height_cm} cm` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-bh-fg-4">Peso</p>
              <p className="text-default-700">
                {application.weight_kg ? `${application.weight_kg} kg` : "—"}
              </p>
            </div>
          </div>
        </div>
      </ModalHeader>
      <ModalBody className={classNames?.body}>
        <div className="grid gap-5">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2">Trayectoria aprobada</p>
            <p className="text-xs text-bh-fg-3">
              Revisá los clubes confirmados antes de aceptar la solicitud.
            </p>
            {loading ? (
              <div className="grid gap-2">
                {[0, 1, 2].map((key) => (
                  <SkeletonRow key={key} />
                ))}
              </div>
            ) : items.length > 0 ? (
              <ul className="grid gap-2">
                {items.map((ci) => (
                  <CareerProposalRow
                    key={ci.id}
                    item={ci}
                    onChange={(updated) =>
                      setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)))
                    }
                  />
                ))}
              </ul>
            ) : (
              <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1/60 px-4 py-4 text-sm text-bh-fg-3">
                {error || "Sin trayectoria aprobada todavía."}
              </div>
            )}
          </div>

          {application.proposed_team_name && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2">Equipo propuesto</p>
              <div className="flex flex-col gap-3 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <TeamCrest src={null} size={36} className="shrink-0" />
                  <span className="font-medium truncate">{application.proposed_team_name}</span>
                </div>
                {application.proposed_team_country_code && (
                  <CountryFlag
                    code={application.proposed_team_country_code}
                    size={18}
                    className="self-end sm:self-center"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter className={classNames?.footer}>
        <Button
          variant="flat"
          onPress={onClose}
          className={bhButtonClass({ variant: "ghost", size: "sm" })}
        >
          Cancelar
        </Button>
        <form action={`/api/admin/applications/${application.id}/approve`} method="post">
          <Button
            type="submit"
            className={bhButtonClass({ variant: "lime", size: "sm" })}
          >
            Aceptar solicitud
          </Button>
        </form>
      </ModalFooter>
    </>
  );
}
