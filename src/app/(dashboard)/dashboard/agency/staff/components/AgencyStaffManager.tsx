"use client";

import { useState } from "react";
import { Button, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";
import { Mail, Loader2, Trash2 } from "lucide-react";
import { inviteAgencyStaff, revokeInvite } from "@/app/actions/agency-invites";
import { useRouter } from "next/navigation";

import FormField from "@/components/dashboard/client/FormField";

interface Invite {
  id: string;
  email: string;
  status: string;
  createdAt: string | Date;
}

export default function AgencyStaffManager({ pendingInvites }: { pendingInvites: Invite[] }) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const router = useRouter();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      alert("Ingresá un correo electrónico válido");
      return;
    }

    setIsSubmitting(true);
    const result = await inviteAgencyStaff(email);
    setIsSubmitting(false);

    if (result.error) {
      alert(result.error);
    } else {
      alert("Invitación enviada correctamente");
      setEmail("");
      router.refresh();
    }
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    const result = await revokeInvite(id);
    setRevokingId(null);

    if (result.error) {
      alert(result.error);
    } else {
      alert("Invitación revocada");
      router.refresh();
    }
  };

  return (
    <div className="space-y-8">
      {/* Invite Form */}
      <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6">
        <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1 mb-2">
          Invitar a un nuevo colega
        </h3>
        <p className="mb-5 max-w-2xl text-sm leading-[1.55] text-bh-fg-3">
          Enviá una invitación a otros managers para que se unan a esta
          agencia. Al aceptar, podrán ver a todos los jugadores representados y
          editar el perfil de la agencia. Si ya tienen cuenta en
          &apos;BallersHub su acceso será automático.
        </p>

        <form onSubmit={handleInvite} className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:max-w-md">
            <FormField
              id="bh-staff-invite-email"
              type="email"
              label="Correo electrónico"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              startContent={<Mail className="h-4 w-4" />}
            />
          </div>
          <Button
            type="submit"
            isLoading={isSubmitting}
            className="w-full rounded-bh-md bg-bh-lime px-5 py-2.5 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)] sm:w-auto"
          >
            Enviar invitación
          </Button>
        </form>
      </div>

      {/* Pending Invites List */}
      <div>
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
            Invitaciones pendientes
          </h3>
          <span className="font-bh-mono text-[12px] text-bh-fg-4">
            {pendingInvites.length}
          </span>
        </div>

        {pendingInvites.length === 0 ? (
          <div className="rounded-bh-lg border border-dashed border-white/[0.08] bg-bh-surface-1/40 py-12 text-center text-sm text-bh-fg-4">
            No hay invitaciones pendientes.
          </div>
        ) : (
          <div className="overflow-hidden rounded-bh-lg border border-white/[0.08] bg-bh-surface-1">
            <Table
              aria-label="Invitaciones pendientes"
              removeWrapper
              classNames={{
                table: "w-full",
                thead:
                  "[&_th]:bg-transparent [&_th]:font-bh-display [&_th]:text-[10px] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-[0.1em] [&_th]:text-bh-fg-4 [&_th]:border-b [&_th]:border-white/[0.06]",
                tr: "border-b border-white/[0.04] data-[hover=true]:bg-white/[0.02]",
                td: "text-[13px] text-bh-fg-2",
              }}
            >
              <TableHeader>
                <TableColumn>CORREO</TableColumn>
                <TableColumn>ESTADO</TableColumn>
                <TableColumn>FECHA</TableColumn>
                <TableColumn align="end">ACCIONES</TableColumn>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium !text-bh-fg-1">{invite.email}</TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        variant="flat"
                        classNames={{
                          base: "border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.10)] text-bh-warning",
                          content: "text-[11px] font-semibold uppercase tracking-[0.06em]",
                        }}
                      >
                        Pendiente
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <span className="font-bh-mono text-[12px] text-bh-fg-4">
                        {new Date(invite.createdAt).toLocaleDateString("es-AR")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="relative flex justify-end">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onClick={() => handleRevoke(invite.id)}
                          isDisabled={revokingId === invite.id}
                          title="Revocar invitación"
                          className="rounded-bh-md text-bh-fg-3 transition-colors hover:bg-[rgba(239,68,68,0.08)] hover:text-bh-danger"
                        >
                          {revokingId === invite.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
