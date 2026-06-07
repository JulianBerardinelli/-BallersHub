"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Chip } from "@heroui/react";
import { Check, X, ExternalLink, Inbox } from "lucide-react";
import CountryFlag from "@/components/common/CountryFlag";
import FormField from "@/components/dashboard/client/FormField";
import { reviewAgencyTeamSubmissionAction } from "@/app/actions/agency-team-relations";
import { bhButtonClass } from "@/components/ui/bh-button-class";

const RELATION_KIND_LABEL: Record<string, string> = {
  current: "Actual",
  past: "Pasada",
};

type ItemDecision = "approved" | "rejected";

type Item = {
  id: string;
  teamId: string | null;
  proposedTeamName: string | null;
  proposedTeamCountry: string | null;
  proposedTeamCountryCode: string | null;
  proposedTeamDivision: string | null;
  proposedTeamTransfermarktUrl: string | null;
  relationKind: string;
  description: string | null;
  team:
    | {
        id: string;
        name: string;
        country: string | null;
        countryCode: string | null;
        slug: string;
      }
    | null
    | undefined;
};

type Submission = {
  submission: { id: string; note: string | null; submittedAt: string };
  agency: { id: string; name: string; slug: string; logoUrl: string | null } | null;
  items: Item[];
};

export default function AgencyTeamProposalsClient({
  submissions,
}: {
  submissions: Submission[];
}) {
  if (submissions.length === 0) {
    return (
      <div className="rounded-bh-lg border border-dashed border-white/[0.10] bg-bh-surface-1/40 p-10 text-center">
        <Inbox className="mx-auto mb-3 h-6 w-6 text-bh-fg-4" />
        <h3 className="font-bh-heading text-base font-semibold text-bh-fg-1">
          Sin solicitudes pendientes
        </h3>
        <p className="mt-1 text-sm text-bh-fg-3">
          Cuando una agencia proponga equipos, aparecerán acá para revisión.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {submissions.map((s) => (
        <SubmissionCard key={s.submission.id} data={s} />
      ))}
    </div>
  );
}

function SubmissionCard({ data }: { data: Submission }) {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Record<string, ItemDecision>>(() =>
    Object.fromEntries(data.items.map((it) => [it.id, "approved" as ItemDecision])),
  );
  const [resolutionNote, setResolutionNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const setDecision = (itemId: string, value: ItemDecision) => {
    setDecisions((prev) => ({ ...prev, [itemId]: value }));
  };

  const submit = () => {
    startTransition(async () => {
      setStatus(null);
      try {
        const result = await reviewAgencyTeamSubmissionAction({
          submissionId: data.submission.id,
          resolutionNote: resolutionNote.trim() || null,
          items: data.items.map((it) => ({
            proposalId: it.id,
            status: decisions[it.id],
          })),
        });
        setStatus({
          type: "success",
          message:
            result.status === "approved"
              ? "Solicitud aprobada."
              : "Solicitud rechazada.",
        });
        router.refresh();
      } catch (err) {
        setStatus({
          type: "error",
          message: err instanceof Error ? err.message : "Error al revisar.",
        });
      }
    });
  };

  return (
    <article className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1/60 p-5 space-y-4">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {data.agency?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.agency.logoUrl}
              alt={data.agency.name}
              className="h-10 w-10 rounded-bh-md object-contain bg-black border border-white/[0.06]"
            />
          ) : (
            <div className="h-10 w-10 rounded-bh-md bg-bh-surface-2 border border-white/[0.06] flex items-center justify-center text-bh-fg-4 text-[11px] font-semibold uppercase">
              {data.agency?.name?.slice(0, 2) ?? "AG"}
            </div>
          )}
          <div>
            <h3 className="font-bh-heading text-base font-bold uppercase tracking-tight text-bh-fg-1">
              {data.agency?.name ?? "Agencia desconocida"}
            </h3>
            <p className="text-[11px] text-bh-fg-4">
              Enviada {new Date(data.submission.submittedAt).toLocaleString()} ·{" "}
              {data.items.length} equipo{data.items.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {data.agency?.slug && (
          <a
            href={`/agency/${data.agency.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12px] text-bh-lime hover:underline"
          >
            Portfolio <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </header>

      {data.submission.note && (
        <div className="rounded-bh-md border border-white/[0.06] bg-bh-surface-2/30 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-bh-fg-4 mb-1">
            Nota del mánager
          </p>
          <p className="text-[13px] text-bh-fg-2 whitespace-pre-wrap">
            {data.submission.note}
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {data.items.map((it) => {
          const cc = it.team?.countryCode ?? it.proposedTeamCountryCode ?? null;
          const name = it.team?.name ?? it.proposedTeamName ?? "—";
          const decision = decisions[it.id];
          const isApproved = decision === "approved";
          const isRejected = decision === "rejected";
          return (
            <li
              key={it.id}
              className={`rounded-bh-md border p-3 space-y-2 transition-colors ${
                isApproved
                  ? "border-[rgba(204,255,0,0.30)] bg-[rgba(204,255,0,0.04)]"
                  : isRejected
                  ? "border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.05)]"
                  : "border-white/[0.06] bg-bh-surface-2/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 min-w-0">
                  {cc && <CountryFlag code={cc} size={20} />}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bh-heading text-sm font-bold text-bh-fg-1">
                        {name}
                      </span>
                      <Chip
                        size="sm"
                        variant="flat"
                        classNames={{
                          base:
                            it.relationKind === "current"
                              ? "bg-[rgba(204,255,0,0.10)] text-bh-lime"
                              : "bg-white/[0.05] text-bh-fg-3",
                          content: "text-[10px]",
                        }}
                      >
                        {RELATION_KIND_LABEL[it.relationKind] ?? it.relationKind}
                      </Chip>
                      {it.team ? (
                        <Chip
                          size="sm"
                          variant="flat"
                          classNames={{
                            base: "bg-bh-surface-1 text-bh-fg-3",
                            content: "text-[10px]",
                          }}
                        >
                          equipo existente
                        </Chip>
                      ) : (
                        <Chip
                          size="sm"
                          variant="flat"
                          color="warning"
                          classNames={{ content: "text-[10px]" }}
                        >
                          equipo nuevo
                        </Chip>
                      )}
                      {/* Status badge — leaves zero ambiguity about which
                          decision is currently selected for this item. */}
                      {isApproved && (
                        <Chip
                          size="sm"
                          variant="flat"
                          startContent={<Check className="h-3 w-3" />}
                          classNames={{
                            base: "bg-bh-lime text-bh-black font-semibold",
                            content: "text-[10px] uppercase tracking-wider px-1",
                          }}
                        >
                          Marcado para aprobar
                        </Chip>
                      )}
                      {isRejected && (
                        <Chip
                          size="sm"
                          variant="flat"
                          startContent={<X className="h-3 w-3" />}
                          classNames={{
                            base: "bg-bh-danger text-white font-semibold",
                            content: "text-[10px] uppercase tracking-wider px-1",
                          }}
                        >
                          Marcado para rechazar
                        </Chip>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-bh-fg-4">
                      {it.proposedTeamDivision || it.proposedTeamCountry || (it.team?.country ?? "")}
                    </p>
                    {it.description && (
                      <p className="mt-1 text-[12px] text-bh-fg-2 leading-[1.55]">
                        {it.description}
                      </p>
                    )}
                    {it.proposedTeamTransfermarktUrl && (
                      <a
                        href={it.proposedTeamTransfermarktUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-[11px] text-bh-lime hover:underline"
                      >
                        Transfermarkt <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Segmented control — explicit Aprobar / Rechazar with
                    clear active state. The actual mutation runs on
                    "Resolver solicitud" so the admin can review the whole
                    submission before committing. */}
                <div
                  role="group"
                  aria-label={`Decisión para ${name}`}
                  className="flex h-9 shrink-0 overflow-hidden rounded-bh-md border border-white/[0.10] bg-bh-surface-1"
                >
                  <button
                    type="button"
                    onClick={() => setDecision(it.id, "approved")}
                    className={`flex items-center gap-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                      isApproved
                        ? "bg-bh-lime text-bh-black"
                        : "text-bh-fg-3 hover:text-bh-fg-1 hover:bg-white/[0.04]"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Aprobar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision(it.id, "rejected")}
                    className={`flex items-center gap-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide transition-colors border-l border-white/[0.10] ${
                      isRejected
                        ? "bg-bh-danger text-white"
                        : "text-bh-fg-3 hover:text-bh-fg-1 hover:bg-white/[0.04]"
                    }`}
                  >
                    <X className="h-3.5 w-3.5" />
                    Rechazar
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <FormField
        as="textarea"
        label="Nota de resolución (opcional, visible para el mánager)"
        placeholder="Ej: Aprobado. La fuente de Transfermarkt confirma la relación."
        rows={2}
        value={resolutionNote}
        onChange={(e) => setResolutionNote(e.target.value)}
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

      <div className="flex justify-end border-t border-white/[0.06] pt-3">
        <Button
          onPress={submit}
          isLoading={isPending}
          className={bhButtonClass({ variant: "lime", size: "sm" })}
        >
          Resolver solicitud
        </Button>
      </div>
    </article>
  );
}
