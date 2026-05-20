"use client";

import { useState } from "react";
import {
  Button,
  Chip,
  Divider,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tooltip,
} from "@heroui/react";
import { Check, ClipboardCopy, Clock, FileSearch, ShieldCheck } from "lucide-react";

type HeroColor = "default" | "primary" | "secondary" | "success" | "warning" | "danger";

export type ApplicationReviewType = "player" | "manager";

export type ApplicationReviewDetails = {
  id: string;
  type: ApplicationReviewType;
  status: string;
  statusLabel: string;
  statusColor: HeroColor;
  createdAt: string | null;
  updatedAt?: string | null;
  planRequested?: string | null;
  fullName?: string | null;
  positions?: string[] | null;
  nationality?: string[] | null;
  currentClub?: string | null;
  agencyName?: string | null;
  agencyWebsite?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  "pro-player": "Pro Player",
  "pro-agency": "Pro Agencia",
};

function formatDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatPlan(plan: string | null | undefined): string | null {
  if (!plan) return null;
  return PLAN_LABELS[plan] ?? plan;
}

function shortenId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

type Row = { label: string; value: React.ReactNode };

function buildRows(details: ApplicationReviewDetails): Row[] {
  const rows: Row[] = [];

  const submittedAt = formatDateTime(details.createdAt);
  if (submittedAt) {
    rows.push({ label: "Fecha de envío", value: submittedAt });
  }

  const updatedAt = formatDateTime(details.updatedAt ?? null);
  if (updatedAt && updatedAt !== submittedAt) {
    rows.push({ label: "Última actualización", value: updatedAt });
  }

  if (details.type === "player") {
    const plan = formatPlan(details.planRequested);
    if (plan) rows.push({ label: "Plan solicitado", value: plan });
    if (details.fullName) rows.push({ label: "Nombre", value: details.fullName });
    if (details.positions && details.positions.length > 0) {
      rows.push({ label: "Posiciones", value: details.positions.join(", ") });
    }
    if (details.nationality && details.nationality.length > 0) {
      rows.push({ label: "Nacionalidad", value: details.nationality.join(", ") });
    }
    if (details.currentClub) {
      rows.push({ label: "Club declarado", value: details.currentClub });
    }
  } else {
    if (details.fullName) rows.push({ label: "Responsable", value: details.fullName });
    if (details.agencyName) rows.push({ label: "Agencia", value: details.agencyName });
    if (details.agencyWebsite) {
      rows.push({
        label: "Sitio web",
        value: (
          <a
            href={details.agencyWebsite}
            target="_blank"
            rel="noreferrer noopener"
            className="text-bh-blue underline-offset-4 hover:underline"
          >
            {details.agencyWebsite}
          </a>
        ),
      });
    }
    if (details.contactEmail) {
      rows.push({ label: "Email de contacto", value: details.contactEmail });
    }
    if (details.contactPhone) {
      rows.push({ label: "Teléfono", value: details.contactPhone });
    }
  }

  return rows;
}

export type ApplicationReviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  details: ApplicationReviewDetails;
};

export default function ApplicationReviewModal({
  isOpen,
  onClose,
  details,
}: ApplicationReviewModalProps) {
  const [copied, setCopied] = useState(false);

  const rows = buildRows(details);
  const isPending =
    details.status === "pending" || details.status === "pending_review";

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(details.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const title =
    details.type === "player" ? "Tu solicitud de jugador" : "Tu solicitud de agencia";

  const subtitle = isPending
    ? "Estamos revisando los datos enviados. Recibirás un mail apenas tengamos novedades."
    : "Detalle del estado actual de tu solicitud.";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      backdrop="blur"
      placement="center"
      size="lg"
      scrollBehavior="inside"
      classNames={{
        base: "bg-bh-surface-1 border border-white/[0.08]",
      }}
    >
      <ModalContent>
        {(closeFn) => (
          <>
            <ModalHeader className="flex flex-col gap-2 pb-2">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-bh-md bg-bh-blue/15 text-bh-blue">
                  <FileSearch size={16} />
                </span>
                <div className="flex flex-col">
                  <span className="font-bh-display text-base font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
                    {title}
                  </span>
                  <span className="text-[11.5px] text-bh-fg-4">{subtitle}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Chip
                  color={details.statusColor}
                  variant="flat"
                  size="sm"
                  className="font-semibold uppercase tracking-wide"
                  startContent={isPending ? <Clock size={12} /> : <ShieldCheck size={12} />}
                >
                  {details.statusLabel}
                </Chip>
              </div>
            </ModalHeader>

            <ModalBody className="gap-4 py-4">
              <div className="rounded-bh-md border border-white/[0.06] bg-bh-surface-2/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-4">
                      ID de solicitud
                    </p>
                    <p className="font-mono text-[12.5px] text-bh-fg-1">
                      {shortenId(details.id)}
                    </p>
                  </div>
                  <Tooltip
                    content={copied ? "Copiado" : "Copiar ID completo"}
                    placement="top"
                  >
                    <Button
                      isIconOnly
                      size="sm"
                      variant="flat"
                      onPress={handleCopyId}
                      aria-label="Copiar identificador de solicitud"
                      className="text-bh-fg-2"
                    >
                      {copied ? <Check size={14} /> : <ClipboardCopy size={14} />}
                    </Button>
                  </Tooltip>
                </div>
              </div>

              {rows.length > 0 ? (
                <dl className="divide-y divide-white/[0.04] rounded-bh-md border border-white/[0.06] bg-bh-surface-2/30">
                  {rows.map((row) => (
                    <div
                      key={row.label}
                      className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                    >
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-bh-fg-4">
                        {row.label}
                      </dt>
                      <dd className="text-[13px] text-bh-fg-1 sm:text-right">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {details.notes ? (
                <div className="space-y-1.5">
                  <Divider className="bg-white/[0.06]" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-4">
                    Notas enviadas
                  </p>
                  <p className="whitespace-pre-wrap text-[12.5px] leading-[1.55] text-bh-fg-2">
                    {details.notes}
                  </p>
                </div>
              ) : null}

              {isPending ? (
                <div className="rounded-bh-md border border-bh-blue/20 bg-bh-blue/[0.06] p-3 text-[12px] leading-[1.55] text-bh-fg-2">
                  Mientras revisamos tu solicitud no podés editar el perfil. El
                  proceso normalmente toma{" "}
                  <strong className="text-bh-fg-1">24 a 72 horas hábiles</strong>.
                  Si necesitás corregir un dato urgente, escribinos a{" "}
                  <a
                    href="mailto:soporte@ballershub.co"
                    className="text-bh-blue underline-offset-4 hover:underline"
                  >
                    soporte@ballershub.co
                  </a>{" "}
                  citando el ID de arriba.
                </div>
              ) : null}
            </ModalBody>

            <ModalFooter className="gap-2">
              <Button variant="light" onPress={closeFn} className="text-bh-fg-3">
                Cerrar
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
