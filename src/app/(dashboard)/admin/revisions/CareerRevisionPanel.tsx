"use client";

import * as React from "react";
import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Input,
  Textarea,
} from "@heroui/react";
import { Check, Pencil, X } from "lucide-react";

import CountryFlag from "@/components/common/CountryFlag";
import TeamCrest from "@/components/teams/TeamCrest";

import type { RevisionItem, RevisionRequest } from "./types";

async function patch(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.error || `HTTP ${res.status}`);
  }
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.error || `HTTP ${res.status}`);
  }
}

function formatPeriod(startYear: number | null, endYear: number | null): string {
  const start = startYear ?? "—";
  const end = endYear ?? "…";
  return `${start}–${end}`;
}

function formatDate(value: string | null): string {
  if (!value) return "";
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return value;
  }
}

function mapStatus(status: RevisionRequest["status"]): { label: string; color: "warning" | "success" | "danger" | "default" } {
  switch (status) {
    case "approved":
      return { label: "Aprobada", color: "success" };
    case "rejected":
      return { label: "Rechazada", color: "danger" };
    case "cancelled":
      return { label: "Cancelada", color: "default" };
    default:
      return { label: "En revisión", color: "warning" };
  }
}

type StageRowProps = {
  item: RevisionItem;
  onChange: (item: RevisionItem) => void;
  disabled?: boolean;
};

function RevisionStageRow({ item, onChange, disabled = false }: StageRowProps) {
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState({
    startYear: item.startYear ?? undefined,
    endYear: item.endYear ?? undefined,
    division: item.division ?? "",
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!editing) {
      setForm({
        startYear: item.startYear ?? undefined,
        endYear: item.endYear ?? undefined,
        division: item.division ?? "",
      });
      setError(null);
    }
  }, [editing, item.division, item.endYear, item.startYear]);

  async function save() {
    try {
      setSaving(true);
      setError(null);

      const startYearValue =
        typeof form.startYear === "number" && Number.isFinite(form.startYear) ? form.startYear : null;
      const endYearValue =
        typeof form.endYear === "number" && Number.isFinite(form.endYear) ? form.endYear : null;

      await patch(`/api/admin/career/revisions/items/${item.id}`, {
        startYear: startYearValue,
        endYear: endYearValue,
        division: form.division.trim() ? form.division.trim() : null,
      });

      onChange({
        ...item,
        startYear: startYearValue,
        endYear: endYearValue,
        division: form.division.trim() ? form.division.trim() : null,
      });

      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  const crest = item.team.crestUrl || "/images/team-default.svg";
  const displayName = item.team.name ?? item.club;

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-content3 bg-content2/40 p-3">
      <div className="flex items-center gap-3">
        <TeamCrest src={crest} name={displayName ?? "Equipo"} size={32} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm">{displayName ?? "Equipo sin nombre"}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-bh-fg-3">
            <Chip size="sm" variant="flat">
              {formatPeriod(item.startYear, item.endYear)}
            </Chip>
            {item.division && <Chip size="sm" variant="flat">{item.division}</Chip>}
            {item.team.countryCode && <CountryFlag code={item.team.countryCode} size={12} />}
            {!item.originalItemId && <Chip size="sm" color="primary" variant="flat">Nueva etapa</Chip>}
            {item.proposedTeam && !item.team.id && (
              <Chip size="sm" color="warning" variant="flat">
                Equipo propuesto
              </Chip>
            )}
          </div>
        </div>
        {!disabled && (
          <Button
            isIconOnly
            size="sm"
            variant={editing ? "flat" : "light"}
            onPress={() => setEditing((prev) => !prev)}
          >
            {editing ? <X size={16} /> : <Pencil size={16} />}
          </Button>
        )}
      </div>

      {item.proposedTeam && (
        <div className="grid gap-1 rounded-md bg-warning-50/80 p-2 text-xs text-warning-700">
          <p className="font-medium">Equipo sugerido por el jugador</p>
          <p>{item.proposedTeam.name ?? "Sin nombre"}</p>
          <div className="flex flex-wrap items-center gap-2">
            {item.proposedTeam.countryCode && <CountryFlag code={item.proposedTeam.countryCode} size={12} />}
            {item.proposedTeam.transfermarktUrl && (
              <a
                href={item.proposedTeam.transfermarktUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary-500 underline"
              >
                Transfermarkt
              </a>
            )}
          </div>
        </div>
      )}

      {editing && (
        <div className="flex flex-wrap items-end gap-3">
          <Input
            type="number"
            size="sm"
            label="Inicio"
            value={form.startYear?.toString() ?? ""}
            onChange={(event) => {
              const value = event.target.valueAsNumber;
              setForm((state) => ({
                ...state,
                startYear: Number.isNaN(value) ? undefined : value,
              }));
            }}
          />
          <Input
            type="number"
            size="sm"
            label="Fin"
            value={form.endYear?.toString() ?? ""}
            onChange={(event) => {
              const value = event.target.valueAsNumber;
              setForm((state) => ({
                ...state,
                endYear: Number.isNaN(value) ? undefined : value,
              }));
            }}
          />
          <Input
            size="sm"
            label="División"
            value={form.division}
            onChange={(event) => setForm((state) => ({ ...state, division: event.target.value }))}
          />
          <Button color="primary" size="sm" onPress={save} isLoading={saving} startContent={<Check size={16} />}>
            Guardar
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-danger-500">{error}</p>}
    </li>
  );
}

import AdminInboxLayout, { AdminInboxFilterProps } from "@/components/admin/AdminInboxLayout";

type Props = {
  initialRequests: RevisionRequest[];
};

export default function CareerRevisionPanel({ initialRequests }: Props) {
  const [requests, setRequests] = React.useState(initialRequests);
  const [activeTab, setActiveTab] = React.useState<"pending" | "history">("pending");
  const [statusFilter, setStatusFilter] = React.useState<AdminInboxFilterProps>("all");
  const [note, setNote] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const pendingRequests = requests.filter((req) => req.status === "pending");
  const historyRequests = requests.filter((req) => req.status !== "pending");

  const displayedRequests = React.useMemo(() => {
    if (activeTab === "pending") return pendingRequests;
    if (statusFilter === "all") return historyRequests;
    return historyRequests.filter((r) => r.status === statusFilter);
  }, [pendingRequests, historyRequests, activeTab, statusFilter]);

  const handleStageChange = React.useCallback((requestId: string, item: RevisionItem) => {
    setRequests((prev) =>
      prev.map((req) =>
        req.id === requestId
          ? {
              ...req,
              items: req.items.map((it) => (it.id === item.id ? item : it)),
            }
          : req,
      ),
    );
  }, []);

  async function resolve(requestId: string, action: "approve" | "reject") {
    try {
      setBusy(requestId + action);
      setError(null);
      const payload = { resolutionNote: note[requestId]?.trim() || null };
      await post(`/api/admin/career/revisions/${requestId}/${action}`, payload);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminInboxLayout
      title="Revisiones de trayectoria"
      description="Gestioná actualizaciones enviadas por jugadores ya activos en la plataforma."
      activeTab={activeTab}
      onTabChange={setActiveTab}
      pendingCount={pendingRequests.length}
      historyCount={historyRequests.length}
      statusFilter={statusFilter}
      onFilterChange={setStatusFilter}
    >
      {error && <p className="text-sm text-danger-500 mb-4">{error}</p>}

      {!displayedRequests.length ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-content3 bg-content2/30">
          <p className="text-sm text-bh-fg-3">No hay solicitudes en esta categoría.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {displayedRequests.map((request) => {
            const status = mapStatus(request.status);
          return (
            <Card key={request.id} radius="lg" shadow="sm">
              <CardHeader className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar
                    size="sm"
                    name={request.player.name ?? undefined}
                    src={request.player.avatarUrl ?? undefined}
                  />
                  <div>
                    <p className="font-medium">{request.player.name ?? "Jugador sin nombre"}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-bh-fg-3">
                      {request.player.nationalities.map((code) => (
                        <CountryFlag key={code} code={code} size={12} />
                      ))}
                      {request.player.currentClub && <span>Club actual: {request.player.currentClub}</span>}
                      {request.submittedBy?.name && <span>Enviado por: {request.submittedBy.name}</span>}
                      {request.submittedAt && <span>Enviada: {formatDate(request.submittedAt)}</span>}
                      {request.reviewedAt && <span>Revisada: {formatDate(request.reviewedAt)}</span>}
                    </div>
                  </div>
                </div>
                <Chip color={status.color} variant="flat">
                  {status.label}
                </Chip>
              </CardHeader>

              <Divider />

              <CardBody className="grid gap-4">
                {request.note && (
                  <div className="rounded-lg bg-content2/60 p-3 text-sm">
                    <p className="font-semibold text-default-700">Nota del jugador</p>
                    <p className="text-default-600">{request.note}</p>
                  </div>
                )}

                <div className="grid gap-3">
                  <p className="text-sm font-semibold text-default-600">Etapas propuestas</p>
                  <ul className="grid gap-3">
                    {request.items.map((item) => (
                      <RevisionStageRow
                        key={item.id}
                        item={item}
                        onChange={(updated) => handleStageChange(request.id, updated)}
                        disabled={request.status !== "pending"}
                      />
                    ))}
                  </ul>
                </div>

                <div className="grid gap-2">
                  <Textarea
                    label="Nota para el jugador"
                    placeholder="Compartí detalles sobre la resolución (opcional)."
                    value={note[request.id] ?? ""}
                    onChange={(event) =>
                      setNote((prev) => ({
                        ...prev,
                        [request.id]: event.target.value,
                      }))
                    }
                    isDisabled={request.status !== "pending"}
                  />
                  {request.status === "pending" && (
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        color="danger"
                        variant="flat"
                        onPress={() => resolve(request.id, "reject")}
                        isLoading={busy === request.id + "reject"}
                      >
                        Rechazar solicitud
                      </Button>
                      <Button
                        color="primary"
                        onPress={() => resolve(request.id, "approve")}
                        isLoading={busy === request.id + "approve"}
                      >
                        Aprobar y actualizar trayectoria
                      </Button>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          );
          })}
        </div>
      )}
    </AdminInboxLayout>
  );
}

