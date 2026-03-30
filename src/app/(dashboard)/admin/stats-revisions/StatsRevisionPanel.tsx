"use client";

import * as React from "react";
import { Avatar, Button, Card, CardBody, CardHeader, Chip, Divider, Input, Textarea } from "@heroui/react";
import { Check, X, ExternalLink, Pencil } from "lucide-react";

import CountryFlag from "@/components/common/CountryFlag";
import TeamCrest from "@/components/teams/TeamCrest";

import type { StatsRevisionItem, StatsRevisionRequest } from "./types";

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

function mapStatus(
  status: StatsRevisionRequest["status"],
): { label: string; color: "warning" | "success" | "danger" | "default" } {
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

function formatNumericStat(value: number | null): string {
  return value !== null && value !== undefined ? String(value) : "—";
}



function EditableNumericCell({
  label,
  value,
  editable,
  onChange,
  colorScheme = "neutral",
}: {
  label: string;
  value: number | null;
  editable?: boolean;
  onChange?: (val: number | null) => void;
  colorScheme?: "neutral" | "emerald" | "amber" | "red";
}) {
  const getColors = () => {
    switch (colorScheme) {
      case "emerald":
        return "bg-emerald-900/20 border-emerald-900/30 text-emerald-400 label-emerald-500";
      case "amber":
        return "bg-amber-900/20 border-amber-900/30 text-amber-400 label-amber-500";
      case "red":
        return "bg-red-900/20 border-red-900/30 text-red-400 label-red-500";
      default:
        return "bg-neutral-900/50 border-neutral-800 text-white label-neutral-500";
    }
  };

  const colors = getColors();
  const baseClasses = `rounded py-1 border flex flex-col items-center justify-center ${colors.split(" label-")[0]}`;
  const labelColor = colors.includes("label-") ? colors.split("label-")[1] : "text-neutral-500";

  return (
    <div className={baseClasses}>
      <span className={`block mb-0.5 font-medium text-[10px] sm:text-xs ${labelColor}`}>
        {label}
      </span>
      {editable ? (
        <input
          type="number"
          min={0}
          className="w-full bg-transparent text-center font-medium outline-none placeholder:text-neutral-600 focus:bg-white/5 disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={value ?? ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            if (!onChange) return;
            const val = e.target.value;
            onChange(val === "" ? null : parseInt(val, 10));
          }}
        />
      ) : (
        <span className="font-medium text-[10px] sm:text-xs">{formatNumericStat(value)}</span>
      )}
    </div>
  );
}

type StatRowProps = {
  item: StatsRevisionItem;
  editable?: boolean;
  onCommit?: (updatedItem: StatsRevisionItem) => void;
};

// ... EditableNumericCell stays the same above except the input classes

function RevisionStatRow({ item, editable, onCommit }: StatRowProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<StatsRevisionItem>(item);

  // Sync draft if item changes from outside
  React.useEffect(() => {
    setDraft(item);
  }, [item]);

  const handleFieldChange = (field: keyof StatsRevisionItem, value: number | null) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onCommit?.(draft);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft(item);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-content3 bg-content2/40 p-4">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          <TeamCrest
            src={item.crestUrl || "/images/team-default.svg"}
            name={item.team ?? "Equipo"}
            size={32}
            className="shrink-0 bg-neutral-900/60 p-0.5 rounded-md"
          />
          <div>
            <h4 className="font-semibold text-sm">{item.season}</h4>
            <span className="text-xs text-neutral-400">{item.competition || "Sin competencia"} - {item.team || "Sin equipo"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!item.originalStatId ? (
            <span className="text-[10px] uppercase tracking-wider text-emerald-500 font-bold bg-emerald-950 px-1.5 py-0.5 rounded">Nueva</span>
          ) : (
            <span className="text-[10px] uppercase tracking-wider text-blue-500 font-bold bg-blue-950 px-1.5 py-0.5 rounded">Edición</span>
          )}

          {editable && (
            isEditing ? (
              <div className="flex items-center gap-1 ml-2">
                <Button isIconOnly size="sm" variant="light" color="success" onPress={handleSave}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button isIconOnly size="sm" variant="light" color="danger" onPress={handleCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button 
                isIconOnly 
                size="sm" 
                variant="light" 
                className="ml-2 text-default-400 hover:text-default-foreground" 
                onPress={() => setIsEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs">
        <EditableNumericCell
          label="PJ"
          value={isEditing ? draft.matches : item.matches}
          editable={isEditing}
          onChange={(v) => handleFieldChange("matches", v)}
        />
        <EditableNumericCell
          label="TIT"
          value={isEditing ? draft.starts : item.starts}
          editable={isEditing}
          onChange={(v) => handleFieldChange("starts", v)}
        />
        <EditableNumericCell
          label="G"
          value={isEditing ? draft.goals : item.goals}
          editable={isEditing}
          onChange={(v) => handleFieldChange("goals", v)}
          colorScheme="emerald"
        />
        <EditableNumericCell
          label="A"
          value={isEditing ? draft.assists : item.assists}
          editable={isEditing}
          onChange={(v) => handleFieldChange("assists", v)}
          colorScheme="emerald"
        />
        <EditableNumericCell
          label="MIN"
          value={isEditing ? draft.minutes : item.minutes}
          editable={isEditing}
          onChange={(v) => handleFieldChange("minutes", v)}
        />
        <EditableNumericCell
          label="TA"
          value={isEditing ? draft.yellowCards : item.yellowCards}
          editable={isEditing}
          onChange={(v) => handleFieldChange("yellowCards", v)}
          colorScheme="amber"
        />
        <EditableNumericCell
          label="TR"
          value={isEditing ? draft.redCards : item.redCards}
          editable={isEditing}
          onChange={(v) => handleFieldChange("redCards", v)}
          colorScheme="red"
        />
      </div>
    </div>
  );
}

function RequestCard({
  request,
  onApprove,
  onReject,
}: {
  request: StatsRevisionRequest;
  onApprove: (id: string, note: string, modifiedStats?: StatsRevisionItem[]) => Promise<void>;
  onReject: (id: string, note: string) => Promise<void>;
}) {
  const [resolutionNote, setResolutionNote] = React.useState("");
  const [loadingAction, setLoadingAction] = React.useState<"approve" | "reject" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [localStats, setLocalStats] = React.useState<StatsRevisionItem[]>(request.stats);

  const pending = request.status === "pending";
  const statusMeta = mapStatus(request.status);
  const player = request.player;

  async function handleApprove() {
    try {
      setLoadingAction("approve");
      setError(null);
      await onApprove(request.id, resolutionNote, localStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoadingAction(null);
    }
  }

  async function handleReject() {
    try {
      setLoadingAction("reject");
      setError(null);
      await onReject(request.id, resolutionNote);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoadingAction(null);
    }
  }

  return (
    <Card className="border border-content3 bg-content1 shadow-sm">
      <CardHeader className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar src={player.avatarUrl || undefined} name={player.name || "Jugador"} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{player.name ?? "Jugador"}</h3>
              <Chip size="sm" color={statusMeta.color} variant="flat">
                {statusMeta.label}
              </Chip>
              {player.transfermarktUrl && (
                <a
                  href={player.transfermarktUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition ml-1"
                  title="Ver perfil en Transfermarkt"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            <p className="mt-0.5 text-xs text-default-500">
              Solicitada: {formatDate(request.submittedAt)}
              {request.submittedBy && typeof request.submittedBy.name === "string" ? ` por ${request.submittedBy.name}` : ""}
            </p>
            {player.nationalities && player.nationalities.length > 0 && (
              <div className="mt-2 flex gap-1">
                {player.nationalities.map((nat) => (
                  <CountryFlag key={nat} code={nat} title={nat} className="h-4 w-6 rounded-sm object-cover" />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TeamCrest
            src={player.currentTeam.crestUrl || "/images/team-default.svg"}
            name={player.currentTeam.name ?? player.currentClub ?? "Club"}
            size={40}
            className="shrink-0"
          />
          <div className="text-right">
            <p className="text-xs text-default-500">Club actual</p>
            <p className="max-w-[120px] truncate text-sm font-medium">
              {player.currentTeam.name ?? player.currentClub ?? "Libre"}
            </p>
          </div>
        </div>
      </CardHeader>

      <Divider />

      <CardBody className="gap-6 p-5">
        {request.note && (
          <div className="rounded-lg bg-content2/50 p-3 text-sm italic text-default-600">
            <span className="mr-2 not-italic">📝</span>&quot;{request.note}&quot;
          </div>
        )}

        <div className="space-y-3">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-default-500">
            Estadísticas propuestas
            {pending && <span className="ml-2 text-primary lowercase font-normal">(Editables)</span>}
          </h4>
          <div className="flex flex-col gap-3">
            {localStats.map((item, index) => (
              <RevisionStatRow
                key={item.id}
                item={item}
                editable={pending}
                onCommit={(updatedItem) => {
                  setLocalStats((prev) => {
                    const next = [...prev];
                    next[index] = updatedItem;
                    return next;
                  });
                }}
              />
            ))}
          </div>
        </div>

        {pending && (
          <div className="space-y-3 rounded-lg border border-default-200 bg-content2/30 p-4">
            <h4 className="text-sm font-medium">Resolución de la solicitud</h4>
            <Textarea
              label="Nota de resolución (Opcional)"
              placeholder="Ej: Aprobado según Transfermarkt..."
              variant="faded"
              size="sm"
              value={resolutionNote}
              onValueChange={setResolutionNote}
            />

            {error && <p className="text-xs text-danger">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                color="danger"
                variant="flat"
                startContent={<X className="h-4 w-4" />}
                onPress={handleReject}
                isLoading={loadingAction === "reject"}
                isDisabled={loadingAction !== null}
              >
                Rechazar
              </Button>
              <Button
                color="success"
                startContent={<Check className="h-4 w-4" />}
                onPress={handleApprove}
                isLoading={loadingAction === "approve"}
                isDisabled={loadingAction !== null}
              >
                Aprobar e impactar
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

import AdminInboxLayout, { AdminInboxFilterProps } from "@/components/admin/AdminInboxLayout";

export default function StatsRevisionPanel({ initialRequests }: { initialRequests: StatsRevisionRequest[] }) {
  const [requests, setRequests] = React.useState<StatsRevisionRequest[]>(initialRequests);
  const [activeTab, setActiveTab] = React.useState<"pending" | "history">("pending");
  const [statusFilter, setStatusFilter] = React.useState<AdminInboxFilterProps>("all");

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const historyRequests = requests.filter((r) => r.status !== "pending");

  const displayedRequests = React.useMemo(() => {
    if (activeTab === "pending") return pendingRequests;
    if (statusFilter === "all") return historyRequests;
    return historyRequests.filter((r) => r.status === statusFilter);
  }, [pendingRequests, historyRequests, activeTab, statusFilter]);

  async function handleApprove(id: string, note: string, modifiedStats?: StatsRevisionItem[]) {
    await post(`/api/admin/stats/revisions/${id}/approve`, {
      resolutionNote: note,
      modifiedStats,
    });
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "approved",
              reviewedAt: new Date().toISOString(),
              stats: modifiedStats || r.stats,
            }
          : r
      )
    );
  }

  async function handleReject(id: string, note: string) {
    await post(`/api/admin/stats/revisions/${id}/reject`, { resolutionNote: note });
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "rejected", reviewedAt: new Date().toISOString() } : r)),
    );
  }

  return (
    <AdminInboxLayout
      title="Revisiones de Estadísticas"
      description="Gestiona las solicitudes de adición o modificación de estadísticas que envían los jugadores."
      activeTab={activeTab}
      onTabChange={setActiveTab}
      pendingCount={pendingRequests.length}
      historyCount={historyRequests.length}
      statusFilter={statusFilter}
      onFilterChange={setStatusFilter}
    >
      {displayedRequests.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-content3 bg-content2/30">
          <p className="text-sm text-default-500">No hay solicitudes en esta categoría.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {displayedRequests.map((req) => (
            <RequestCard key={req.id} request={req} onApprove={handleApprove} onReject={handleReject} />
          ))}
        </div>
      )}
    </AdminInboxLayout>
  );
}
