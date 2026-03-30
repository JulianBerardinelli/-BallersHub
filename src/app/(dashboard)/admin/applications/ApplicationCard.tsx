"use client";

import * as React from "react";
import { Copy, Edit2, Check, X, ShieldAlert, Link as LinkIcon, Trash2 } from "lucide-react";
import {
  Button,
  Chip,
  Input,
  Tooltip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  useToast, // Asumo que existe algún hook de toast o lo cambiamos por un alert si no
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import type { PlayerApplication } from "./ApplicationsPanel";
import CountryFlag from "@/components/common/CountryFlag";

export default function ApplicationCard({
  application,
  countryMap,
  onAction,
}: {
  application: PlayerApplication;
  countryMap: Record<string, string>;
  onAction: (action: "approved" | "rejected") => void;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [loadingAction, setLoadingAction] = React.useState<"approve" | "reject" | null>(null);

  // Modal states
  const [confirmModal, setConfirmModal] = React.useState<"approve" | "reject" | null>(null);

  // Editing state -> overrides
  const [draft, setDraft] = React.useState({
    full_name: application.full_name || "",
    birth_date: application.birth_date || "",
    transfermarkt_url: application.transfermarkt_url || "",
    height_cm: application.height_cm ? String(application.height_cm) : "",
    weight_kg: application.weight_kg ? String(application.weight_kg) : "",
  });

  const handleApprove = async () => {
    setLoadingAction("approve");
    try {
      const overrides = {
        full_name: draft.full_name,
        birth_date: draft.birth_date,
        transfermarkt_url: draft.transfermarkt_url,
        height_cm: draft.height_cm ? parseInt(draft.height_cm, 10) : null,
        weight_kg: draft.weight_kg ? parseInt(draft.weight_kg, 10) : null,
      };

      const res = await fetch(`/api/admin/applications/${application.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al aprobar");
      onAction("approved");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingAction(null);
      setConfirmModal(null);
    }
  };

  const handleReject = async () => {
    setLoadingAction("reject");
    try {
      const res = await fetch(`/api/admin/applications/${application.id}/reject`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al rechazar");
      onAction("rejected");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingAction(null);
      setConfirmModal(null);
    }
  };

  // Resolve paths for docs
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const resolveDocUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${supabaseUrl}/storage/v1/object/public/kyc/${path}`;
  };

  const idDocUrl = resolveDocUrl(application.id_doc_url);
  const selfieUrl = resolveDocUrl(application.selfie_url);

  // Parse nationality codes if available from JSON string
  let natCodes: string[] = [];
  try {
    if (application.notes) {
      const parsed = JSON.parse(application.notes);
      if (Array.isArray(parsed.nationality_codes)) {
        natCodes = parsed.nationality_codes;
      }
    }
  } catch (e) {}

  const nats = Array.isArray(application.nationality)
    ? application.nationality
    : application.nationality
    ? [application.nationality]
    : [];
  const poss = Array.isArray(application.positions)
    ? application.positions
    : application.positions
    ? [application.positions]
    : [];

  return (
    <>
      <div
        className={`relative flex flex-col sm:flex-row gap-6 rounded-xl border p-5 transition-colors duration-200 ${
          isEditing
            ? "border-primary/50 bg-primary/5 shadow-sm shadow-primary/20 ring-1 ring-primary/30"
            : "border-neutral-800 bg-neutral-900"
        }`}
      >
        {/* Encabezado / Identidad Visual Placeholder */}
        <div className="flex shrink-0 flex-col items-center gap-3 sm:w-48 sm:items-start">
          <div className="flex size-20 items-center justify-center rounded-full bg-neutral-800 text-xl font-bold uppercase text-neutral-400">
            {draft.full_name ? draft.full_name.substring(0, 2) : "??"}
          </div>
          <div className="text-center sm:text-left mt-1 w-full space-y-2">
            <div>
              <p className="text-[10px] text-neutral-500 font-mono flex items-center gap-1 justify-center sm:justify-start">
                APP ID: {application.id.slice(0, 8)}
                <button
                  type="button"
                  className="text-neutral-500 hover:text-white"
                  onClick={() => navigator.clipboard.writeText(application.id)}
                  title="Copiar ID de Solicitud"
                >
                  <Copy size={10} />
                </button>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-500 font-mono flex items-center gap-1 justify-center sm:justify-start">
                USER ID: {application.user_id?.slice(0, 8)}
                <button
                  type="button"
                  className="text-neutral-500 hover:text-white"
                  onClick={() => navigator.clipboard.writeText(application.user_id)}
                  title="Copiar ID de Usuario"
                >
                  <Copy size={10} />
                </button>
              </p>
            </div>
            <div className="mt-2 text-[10px] text-neutral-500">
              Creado el{" "}
              {new Date(application.created_at).toLocaleDateString("es-AR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>
        </div>

        {/* Formulario / Info (Central) */}
        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                {isEditing ? (
                  <Input
                    size="sm"
                    label="Nombre Completo"
                    value={draft.full_name}
                    onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
                    classNames={{ inputWrapper: "bg-background border-primary" }}
                  />
                ) : (
                  <h3 className="text-lg font-semibold">{draft.full_name || "(Sin nombre)"}</h3>
                )}
                {!isEditing && application.status === "pending" && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    className="text-neutral-500 hover:text-primary"
                    onPress={() => setIsEditing(true)}
                  >
                    <Edit2 size={14} />
                  </Button>
                )}
                {isEditing && application.status === "pending" && (
                  <div className="flex gap-1 ml-2">
                     <Button size="sm" color="primary" variant="flat" onPress={() => setIsEditing(false)}>
                        Listo
                     </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-sm text-neutral-400 items-center">
                <span>{application.current_club || "Sin Club"}</span>
                <span>•</span>
                {nats.length > 0 ? (
                  <div className="flex items-center gap-2 uppercase">
                    {nats.map((n, i) => {
                      const computedCode = natCodes[i] || countryMap[n.toUpperCase()];
                      return (
                        <span key={n} className="flex items-center gap-1">
                          {computedCode && <CountryFlag code={computedCode} size={14} title={n} />}
                          {n}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className="uppercase">Nacionalidad N/A</span>
                )}
                <span>•</span>
                <span className="uppercase">{poss.length > 0 ? poss.join(", ") : "Posición N/A"}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div>
              <p className="mb-1 text-xs text-neutral-500">F. Nacimiento</p>
              {isEditing ? (
                <Input
                   size="sm"
                   type="date"
                   value={draft.birth_date}
                   onChange={(e) => setDraft({ ...draft, birth_date: e.target.value })}
                   classNames={{ inputWrapper: "bg-background border-primary" }}
                />
              ) : (
                <p className="text-sm font-medium">{draft.birth_date || "—"}</p>
              )}
            </div>
            <div>
              <p className="mb-1 text-xs text-neutral-500">Estatura (cm)</p>
              {isEditing ? (
                <Input
                   size="sm"
                   type="number"
                   value={draft.height_cm}
                   onChange={(e) => setDraft({ ...draft, height_cm: e.target.value })}
                   classNames={{ inputWrapper: "bg-background border-primary" }}
                />
              ) : (
                <p className="text-sm font-medium">{draft.height_cm ? `${draft.height_cm} cm` : "—"}</p>
              )}
            </div>
            <div>
              <p className="mb-1 text-xs text-neutral-500">Peso (kg)</p>
              {isEditing ? (
                <Input
                   size="sm"
                   type="number"
                   value={draft.weight_kg}
                   onChange={(e) => setDraft({ ...draft, weight_kg: e.target.value })}
                   classNames={{ inputWrapper: "bg-background border-primary" }}
                />
              ) : (
                <p className="text-sm font-medium">{draft.weight_kg ? `${draft.weight_kg} kg` : "—"}</p>
              )}
            </div>
            <div className="col-span-2 lg:col-span-1 border-l border-neutral-800 pl-4">
              <p className="mb-1 text-xs text-neutral-500">Plan</p>
              <Chip size="sm" color="primary" variant="flat" className="capitalize">
                {application.plan_requested || "free"}
              </Chip>
            </div>
          </div>

          <div className="mt-2">
            <p className="mb-1 text-xs text-neutral-500">Link Transfermarkt</p>
            {isEditing ? (
              <Input
                size="sm"
                placeholder="https://www.transfermarkt..."
                value={draft.transfermarkt_url}
                onChange={(e) => setDraft({ ...draft, transfermarkt_url: e.target.value })}
                classNames={{ inputWrapper: "bg-background border-primary" }}
                startContent={<LinkIcon size={14} className="text-neutral-500" />}
              />
            ) : draft.transfermarkt_url ? (
              <a
                href={draft.transfermarkt_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <LinkIcon size={12} />
                Abir enlace Transfermarkt
              </a>
            ) : (
              <p className="text-sm text-neutral-600">—</p>
            )}
          </div>
        </div>

        {/* Validaciones & Controles (Derecha) */}
        <div className="flex sm:w-48 shrink-0 flex-col justify-between rounded-lg bg-neutral-900/50 p-4 border border-neutral-800">
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              KYC & Documentos
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">Doc. Identidad</span>
                {idDocUrl ? (
                  <a href={idDocUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">Ver</a>
                ) : (
                  <span className="text-neutral-600">Falta</span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">Selfie / Evidencia</span>
                {selfieUrl ? (
                  <a href={selfieUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">Ver</a>
                ) : (
                  <span className="text-neutral-600">Falta</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {application.status === "pending" ? (
              <>
                <Button
                  color="success"
                  variant="flat"
                  startContent={<Check size={16} />}
                  onPress={() => setConfirmModal("approve")}
                  isLoading={loadingAction === "approve"}
                >
                  Aprobar
                </Button>
                <Button
                  color="danger"
                  variant="light"
                  startContent={<Trash2 size={16} />}
                  onPress={() => setConfirmModal("reject")}
                  isLoading={loadingAction === "reject"}
                >
                  Rechazar
                </Button>
              </>
            ) : (
              <div className="flex justify-end mt-4">
                <Chip
                  color={application.status === "approved" ? "success" : "danger"}
                  variant="flat"
                >
                  {application.status === "approved" ? "Aprobada" : "Rechazada"}
                </Chip>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={confirmModal === "approve"} onOpenChange={(open) => !open && setConfirmModal(null)}>
        <ModalContent>
          {(onClose: () => void) => (
            <>
              <ModalHeader className="gap-2 shrink-0 flex-col">
                 <div className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success ring-8 ring-success/5 mb-2">
                    <Check size={24} />
                 </div>
                 <h3>Aprobar Solicitud</h3>
              </ModalHeader>
              <ModalBody>
                <p className="text-neutral-400">
                  ¿Estás seguro de que quieres aprobar la solicitud de <b>{draft.full_name}</b>?
                  Esto creará su perfil público en la plataforma.
                </p>
                {isEditing && (
                  <div className="mt-2 rounded-md bg-warning/10 p-3 text-sm text-warning-500 flex items-center gap-2">
                     <ShieldAlert size={16} />
                     <span>Recuerda salir del modo edición o los cambios mostrados se guardarán como overrides.</span>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                 <Button variant="light" onPress={() => setConfirmModal(null)}>Cancelar</Button>
                 <Button color="success" onPress={handleApprove} isLoading={loadingAction === "approve"}>Confirmar Aprobación</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={confirmModal === "reject"} onOpenChange={(open) => !open && setConfirmModal(null)}>
        <ModalContent>
          {(onClose: () => void) => (
            <>
              <ModalHeader className="gap-2 shrink-0 flex-col">
                 <div className="flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger ring-8 ring-danger/5 mb-2">
                    <Trash2 size={24} />
                 </div>
                 <h3>Rechazar Solicitud</h3>
              </ModalHeader>
              <ModalBody>
                <p className="text-neutral-400">
                  ¿Estás seguro de que quieres rechazar y archivar la solicitud de <b>{draft.full_name}</b>?
                  Esta acción es irreversible y el perfil no se creará en el sistema.
                </p>
              </ModalBody>
              <ModalFooter>
                 <Button variant="light" onPress={() => setConfirmModal(null)}>Cancelar</Button>
                 <Button color="danger" onPress={handleReject} isLoading={loadingAction === "reject"}>Archivar permanentemente</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
