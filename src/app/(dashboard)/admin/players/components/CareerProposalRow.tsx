import * as React from "react";
import { Button, Chip, Select, SelectItem } from "@heroui/react";
import { Pencil, Check, X } from "lucide-react";
import TeamCrest from "@/components/teams/TeamCrest";
import CountryFlag from "@/components/common/CountryFlag";
import { careerStatusMeta, teamStatusMeta } from "../utils";

import FormField from "@/components/dashboard/client/FormField";
import { bhButtonClass } from "@/components/ui/BhButton";
import { bhChip, bhSelectClassNames } from "@/lib/ui/heroui-brand";

type ChipTone = Parameters<typeof bhChip>[0];

const CAREER_STATUS_TONE: Record<string, ChipTone> = {
  pending: "warning",
  accepted: "success",
  rejected: "danger",
  waiting: "neutral",
};

const TEAM_STATUS_TONE: Record<string, ChipTone> = {
  approved: "success",
  pending: "warning",
  new: "blue",
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

type Props = {
  item: CareerItem;
  onChange: (updatedItem: CareerItem) => void;
};

export default function CareerProposalRow({ item, onChange }: Props) {
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState({
    club: item.team_name,
    division: item.division ?? "",
    startYear: item.start_year ?? undefined,
    endYear: item.end_year ?? undefined,
    status: item.status,
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!editing) {
      setForm({
        club: item.team_name,
        division: item.division ?? "",
        startYear: item.start_year ?? undefined,
        endYear: item.end_year ?? undefined,
        status: item.status,
      });
      setError(null);
    }
  }, [editing, item]);

  async function save() {
    try {
      setSaving(true);
      setError(null);

      const startYearValue =
        typeof form.startYear === "number" && Number.isFinite(form.startYear) ? form.startYear : null;
      const endYearValue =
        typeof form.endYear === "number" && Number.isFinite(form.endYear) ? form.endYear : null;

      const res = await fetch(`/api/admin/applications/career-items/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          startYear: startYearValue,
          endYear: endYearValue,
          division: form.division.trim() ? form.division.trim() : null,
          club: form.club.trim() ? form.club.trim() : null,
          status: form.status,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Error al guardar");
      }

      onChange({
        ...item,
        start_year: startYearValue,
        end_year: endYearValue,
        division: form.division.trim() ? form.division.trim() : null,
        team_name: form.club.trim() ? form.club.trim() : "",
        status: form.status,
      });

      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  const statusMeta = careerStatusMeta[item.status] ?? {
    label: item.status,
    color: "default" as const,
  };
  const teamMeta = item.team_status ? teamStatusMeta[item.team_status] ?? null : null;

  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-content2/60 px-4 py-3 ring-1 ring-white/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <TeamCrest src={item.crest_url || "/images/team-default.svg"} size={36} className="shrink-0" />
          <div className="min-w-0">
            <p className="font-medium truncate">{item.team_name}</p>
            <div className="flex items-center gap-2 text-xs text-bh-fg-3">
              <span className="truncate">{item.division ?? "Sin división"}</span>
              {item.country_code && <CountryFlag code={item.country_code} size={14} />}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Chip size="sm" variant="flat" classNames={bhChip("neutral")}>
            {item.start_year ?? "¿?"} – {item.end_year ?? "Actual"}
          </Chip>
          <Chip
            size="sm"
            variant="flat"
            classNames={bhChip(CAREER_STATUS_TONE[item.status] ?? "neutral")}
          >
            {statusMeta.label}
          </Chip>
          {teamMeta && (
            <Chip
              size="sm"
              variant="flat"
              classNames={bhChip(TEAM_STATUS_TONE[item.team_status ?? ""] ?? "outline")}
            >
              {teamMeta.label}
            </Chip>
          )}
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={() => setEditing((prev) => !prev)}
            className={bhButtonClass({ variant: "icon-ghost", size: "sm", iconOnly: true })}
          >
            {editing ? <X size={16} /> : <Pencil size={16} />}
          </Button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 grid gap-3 border-t border-white/[0.06] pt-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <FormField
            id={`bh-cp-club-${item.id}`}
            label="Club propuesto"
            value={form.club}
            onChange={(event) => setForm((state) => ({ ...state, club: event.target.value }))}
          />
          <FormField
            id={`bh-cp-division-${item.id}`}
            label="División"
            value={form.division}
            onChange={(event) => setForm((state) => ({ ...state, division: event.target.value }))}
          />
          <div className="flex gap-2">
            <FormField
              id={`bh-cp-start-${item.id}`}
              type="number"
              label="Inicio"
              value={form.startYear?.toString() ?? ""}
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                setForm((state) => ({ ...state, startYear: Number.isNaN(value) ? undefined : value }));
              }}
              className="w-24"
            />
            <FormField
              id={`bh-cp-end-${item.id}`}
              type="number"
              label="Fin"
              value={form.endYear?.toString() ?? ""}
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                setForm((state) => ({ ...state, endYear: Number.isNaN(value) ? undefined : value }));
              }}
              className="w-24"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-2">
            <Select
              size="sm"
              label="Estado"
              defaultSelectedKeys={[form.status]}
              onChange={(e) => setForm((state) => ({ ...state, status: e.target.value }))}
              variant="flat"
              classNames={bhSelectClassNames}
              className="w-full sm:w-36"
            >
              <SelectItem key="pending">Pendiente</SelectItem>
              <SelectItem key="accepted">Aceptado</SelectItem>
              <SelectItem key="rejected">Rechazado</SelectItem>
              <SelectItem key="waiting">En espera</SelectItem>
            </Select>
            <Button
              size="sm"
              onPress={save}
              isLoading={saving}
              startContent={<Check size={16} />}
              className={bhButtonClass({ variant: "lime", size: "sm" })}
            >
              Guardar
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-bh-danger">{error}</p>}
    </li>
  );
}
