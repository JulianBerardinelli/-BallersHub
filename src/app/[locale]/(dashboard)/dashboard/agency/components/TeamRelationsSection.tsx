"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Chip } from "@heroui/react";
import {
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Clock,
  XCircle,
} from "lucide-react";
import SectionCard from "@/components/dashboard/client/SectionCard";
import FormField from "@/components/dashboard/client/FormField";
import CountryFlag from "@/components/common/CountryFlag";
import EditPencilButton from "./EditPencilButton";
import AgencyTeamPicker, {
  type AgencyTeamPickerValue,
} from "@/components/teams/AgencyTeamPicker";
import {
  createAgencyTeamSubmissionAction,
  cancelAgencyTeamSubmissionAction,
  deleteAgencyTeamRelationAction,
} from "@/app/actions/agency-team-relations";
import { useNotificationContext, profileNotification } from "@/modules/notifications";
import { bhButtonClass } from "@/components/ui/bh-button-class";

const RELATION_KIND_LABEL: Record<string, string> = {
  current: "Actual",
  past: "Pasada",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "En revisión",
  approved: "Aprobada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

const STATUS_COLOR: Record<string, "warning" | "success" | "danger" | "default"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "default",
};

type TeamRelation = {
  id: string;
  team: {
    id: string;
    name: string;
    countryCode: string | null;
    country: string | null;
    crestUrl: string;
    transfermarktUrl: string | null;
  };
  relationKind: string;
  description: string | null;
  approvedAt: string | null;
};

type SubmissionItem = {
  id: string;
  proposedTeamName: string | null;
  proposedTeamCountry: string | null;
  proposedTeamCountryCode: string | null;
  proposedTeamDivision: string | null;
  proposedTeamTransfermarktUrl: string | null;
  relationKind: string;
  description: string | null;
  status: string;
  team: {
    id: string;
    name: string;
    countryCode: string | null;
  } | null;
};

type Submission = {
  id: string;
  status: string;
  note: string | null;
  resolutionNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  items: SubmissionItem[];
};

type Props = {
  agencyName: string;
  relations: TeamRelation[];
  pendingSubmissions: Submission[];
};

type DraftItem = {
  picker: AgencyTeamPickerValue;
  proposedTeamDivision: string;
  relationKind: "current" | "past";
  description: string;
};

const blankDraft = (): DraftItem => ({
  picker: null,
  proposedTeamDivision: "",
  relationKind: "past",
  description: "",
});

function draftIsEmpty(d: DraftItem) {
  return !d.picker && !d.description.trim() && !d.proposedTeamDivision.trim();
}

function draftIsValid(d: DraftItem) {
  if (!d.picker) return false;
  if (d.picker.mode === "approved") return true;
  if (d.picker.mode === "new") {
    return d.picker.name.trim().length > 1 && !!d.picker.countryCode;
  }
  return false;
}

export default function TeamRelationsSection({
  agencyName,
  relations,
  pendingSubmissions,
}: Props) {
  const router = useRouter();
  const { enqueue } = useNotificationContext();
  const [isComposing, setIsComposing] = useState(false);
  const [drafts, setDrafts] = useState<DraftItem[]>([blankDraft()]);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const updateDraft = (idx: number, patch: Partial<DraftItem>) => {
    setDrafts(drafts.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };
  const addDraft = () => {
    if (drafts.length >= 15) return;
    setDrafts([...drafts, blankDraft()]);
  };
  const removeDraft = (idx: number) => {
    if (drafts.length === 1) {
      setDrafts([blankDraft()]);
    } else {
      setDrafts(drafts.filter((_, i) => i !== idx));
    }
  };

  const cancelComposer = () => {
    setIsComposing(false);
    setDrafts([blankDraft()]);
    setNote("");
    setStatus(null);
  };

  const submit = () => {
    const cleaned = drafts.filter((d) => !draftIsEmpty(d));
    if (cleaned.length === 0) {
      setStatus({ type: "error", message: "Cargá al menos un equipo." });
      return;
    }
    if (!cleaned.every(draftIsValid)) {
      setStatus({
        type: "error",
        message:
          "Todos los equipos deben estar elegidos del buscador o propuestos con país obligatorio.",
      });
      return;
    }

    startTransition(async () => {
      setStatus(null);
      try {
        await createAgencyTeamSubmissionAction({
          note: note.trim() || null,
          items: cleaned.map((d) => {
            if (d.picker?.mode === "approved") {
              return {
                teamId: d.picker.teamId,
                proposedTeamName: null,
                proposedTeamCountry: null,
                proposedTeamCountryCode: null,
                proposedTeamDivision: d.proposedTeamDivision.trim() || null,
                proposedTeamTransfermarktUrl: null,
                relationKind: d.relationKind,
                description: d.description.trim() || null,
              };
            }
            // mode === "new"
            const p = d.picker as Extract<AgencyTeamPickerValue, { mode: "new" }>;
            return {
              teamId: null,
              proposedTeamName: p.name.trim(),
              proposedTeamCountry: p.country ?? null,
              proposedTeamCountryCode: p.countryCode ?? null,
              proposedTeamDivision: d.proposedTeamDivision.trim() || null,
              proposedTeamTransfermarktUrl: p.tmUrl ?? null,
              relationKind: d.relationKind,
              description: d.description.trim() || null,
            };
          }),
        });
        cancelComposer();
        enqueue(
          profileNotification.updated({
            userName: agencyName,
            sectionLabel: "Equipos · Solicitud",
            changedFields: cleaned.map((d) =>
              d.picker?.mode === "approved" ? d.picker.teamName : (d.picker as Extract<AgencyTeamPickerValue, { mode: "new" }>).name,
            ),
          }),
        );
        router.refresh();
      } catch (err) {
        setStatus({
          type: "error",
          message: err instanceof Error ? err.message : "Error al enviar.",
        });
      }
    });
  };

  const cancelSubmission = (id: string) => {
    if (!confirm("¿Cancelar esta solicitud?")) return;
    setBusyId(id);
    startTransition(async () => {
      try {
        await cancelAgencyTeamSubmissionAction(id);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "No se pudo cancelar.");
      } finally {
        setBusyId(null);
      }
    });
  };

  const removeRelation = (id: string) => {
    if (!confirm("¿Quitar este equipo del portfolio?")) return;
    setBusyId(id);
    startTransition(async () => {
      try {
        await deleteAgencyTeamRelationAction(id);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "No se pudo eliminar.");
      } finally {
        setBusyId(null);
      }
    });
  };

  return (
    <SectionCard
      title="Equipos con los que trabajaste"
      description="Cargá clubes con los que tu agencia tiene o tuvo relación. Las altas pasan por administración para verificar la trayectoria. Aparecen agrupados por país en el portfolio público."
      actions={
        <EditPencilButton
          isEditing={isComposing}
          onPress={() => (isComposing ? cancelComposer() : setIsComposing(true))}
          isDisabled={isPending}
          ariaLabel="lista de equipos"
        />
      }
    >
      <div className="space-y-6">
        {/* Confirmed relations */}
        {relations.length === 0 && pendingSubmissions.length === 0 && !isComposing && (
          <div className="rounded-xl border border-dashed border-white/[0.08] bg-bh-surface-1/40 py-6 text-center text-sm text-bh-fg-4">
            Aún no agregaste equipos. Tocá el lápiz para iniciar una solicitud.
          </div>
        )}

        {relations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2">
              Equipos verificados ({relations.length})
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {relations.map((rel) => (
                <div
                  key={rel.id}
                  className="flex items-start gap-3 rounded-bh-md border border-white/[0.08] bg-bh-surface-1/60 p-3"
                >
                  <CountryFlag code={rel.team.countryCode} size={20} />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bh-heading text-[14px] font-semibold text-bh-fg-1 truncate">
                        {rel.team.name}
                      </span>
                      <Chip
                        size="sm"
                        variant="flat"
                        classNames={{
                          base:
                            rel.relationKind === "current"
                              ? "bg-[rgba(204,255,0,0.12)] text-bh-lime"
                              : "bg-white/[0.05] text-bh-fg-3",
                          content: "text-[10px]",
                        }}
                      >
                        {RELATION_KIND_LABEL[rel.relationKind] ?? rel.relationKind}
                      </Chip>
                    </div>
                    {rel.description && (
                      <p className="text-[12px] leading-[1.55] text-bh-fg-3 line-clamp-2">
                        {rel.description}
                      </p>
                    )}
                    {rel.team.transfermarktUrl && (
                      <a
                        href={rel.team.transfermarktUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-bh-lime hover:underline"
                      >
                        Transfermarkt <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    isLoading={busyId === rel.id}
                    onPress={() => removeRelation(rel.id)}
                    aria-label="Eliminar equipo"
                    className={bhButtonClass({ variant: "danger-soft", size: "sm", iconOnly: true })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending submissions */}
        {pendingSubmissions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2">
              Solicitudes ({pendingSubmissions.length})
            </h4>
            <div className="space-y-2">
              {pendingSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-bh-md border border-white/[0.08] bg-bh-surface-1/60 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {sub.status === "pending" ? (
                        <Clock className="h-4 w-4 text-bh-warning" />
                      ) : sub.status === "approved" ? (
                        <ShieldCheck className="h-4 w-4 text-bh-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-bh-danger" />
                      )}
                      <Chip
                        size="sm"
                        variant="flat"
                        color={STATUS_COLOR[sub.status]}
                        classNames={{ content: "text-[11px]" }}
                      >
                        {STATUS_LABEL[sub.status] ?? sub.status}
                      </Chip>
                      <span className="text-[11px] text-bh-fg-4">
                        {new Date(sub.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {sub.status === "pending" && (
                      <Button
                        size="sm"
                        variant="light"
                        isLoading={busyId === sub.id}
                        onPress={() => cancelSubmission(sub.id)}
                        className={bhButtonClass({ variant: "ghost", size: "sm" })}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                  <ul className="space-y-1 pl-1">
                    {sub.items.map((it) => {
                      const name = it.team?.name ?? it.proposedTeamName ?? "—";
                      const cc = it.team?.countryCode ?? it.proposedTeamCountryCode ?? null;
                      return (
                        <li
                          key={it.id}
                          className="flex items-center gap-2 text-[12px] text-bh-fg-2"
                        >
                          {cc && <CountryFlag code={cc} size={14} />}
                          <span className="font-medium">{name}</span>
                          <span className="text-bh-fg-4">
                            · {RELATION_KIND_LABEL[it.relationKind]}
                          </span>
                          {it.proposedTeamDivision && (
                            <span className="text-bh-fg-4">· {it.proposedTeamDivision}</span>
                          )}
                          {!it.team && (
                            <Chip
                              size="sm"
                              variant="flat"
                              color="warning"
                              classNames={{ base: "ml-1", content: "text-[10px]" }}
                            >
                              equipo nuevo
                            </Chip>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {sub.resolutionNote && (
                    <p className="text-[11px] italic text-bh-fg-4">
                      Nota del admin: {sub.resolutionNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Composer */}
        {isComposing && (
          <div className="space-y-3 rounded-bh-lg border border-[rgba(204,255,0,0.18)] bg-[rgba(204,255,0,0.04)] p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bh-heading text-sm font-bold uppercase tracking-tight text-bh-fg-1">
                Nueva solicitud
              </h4>
              <Button
                size="sm"
                startContent={<Plus className="h-4 w-4" />}
                onPress={addDraft}
                isDisabled={drafts.length >= 15}
                className={bhButtonClass({ variant: "lime", size: "sm" })}
              >
                Agregar otro equipo
              </Button>
            </div>

            {drafts.map((d, idx) => (
              <div
                key={idx}
                className="rounded-bh-md border border-white/[0.08] bg-bh-surface-1/60 p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bh-mono text-[10px] uppercase tracking-widest text-bh-fg-4">
                    Equipo #{idx + 1}
                  </span>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    aria-label="Quitar"
                    onPress={() => removeDraft(idx)}
                    isDisabled={drafts.length === 1 && draftIsEmpty(d)}
                    className={bhButtonClass({ variant: "danger-soft", size: "sm", iconOnly: true })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <AgencyTeamPicker
                  defaultValue={d.picker}
                  onChange={(picker) => updateDraft(idx, { picker })}
                />

                <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                  <FormField
                    label="División / Liga (opcional)"
                    placeholder="Ej: Primera División"
                    value={d.proposedTeamDivision}
                    onChange={(e) =>
                      updateDraft(idx, { proposedTeamDivision: e.target.value })
                    }
                    maxLength={120}
                  />
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2">
                      Tipo
                    </span>
                    <div className="flex h-11 rounded-bh-md border border-white/[0.08] bg-bh-surface-1 overflow-hidden">
                      {(["current", "past"] as const).map((kind) => (
                        <button
                          key={kind}
                          type="button"
                          onClick={() => updateDraft(idx, { relationKind: kind })}
                          className={`flex-1 text-[12px] font-semibold uppercase tracking-wide transition-colors ${
                            d.relationKind === kind
                              ? "bg-bh-lime text-bh-black"
                              : "text-bh-fg-3 hover:text-bh-fg-1"
                          }`}
                        >
                          {RELATION_KIND_LABEL[kind]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <FormField
                  as="textarea"
                  label="Descripción de la relación"
                  placeholder="Ej: Representación de jugadores con el club desde 2018, transferencias y renovaciones de contrato."
                  rows={2}
                  value={d.description}
                  onChange={(e) => updateDraft(idx, { description: e.target.value })}
                  maxLength={800}
                />
              </div>
            ))}

            <FormField
              as="textarea"
              label="Mensaje al admin (opcional)"
              placeholder="Cualquier contexto que ayude a verificar (links, contactos, etc.)"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={800}
            />

            {status && (
              <Chip
                color={status.type === "success" ? "success" : "danger"}
                variant="flat"
                className="text-sm"
              >
                {status.message}
              </Chip>
            )}

            <div className="flex justify-end gap-3 border-t border-white/[0.06] pt-3">
              <Button variant="light" onPress={cancelComposer} isDisabled={isPending}>
                Cancelar
              </Button>
              <Button
                onPress={submit}
                isLoading={isPending}
                className={bhButtonClass({ variant: "lime", size: "sm" })}
              >
                Enviar solicitud
              </Button>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
