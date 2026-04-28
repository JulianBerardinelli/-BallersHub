"use client";

import { useState } from "react";
import { Button, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";
import { Mail, Loader2, Trash2, CalendarDays } from "lucide-react";
import { invitePlayerToAgency, revokePlayerInvite } from "@/app/actions/player-invites";
import { useRouter } from "next/navigation";

import FormField from "@/components/dashboard/client/FormField";
import BhEmptyState from "@/components/ui/BhEmptyState";
import { bhButtonClass } from "@/components/ui/BhButton";
import { bhTableClassNames, bhChip } from "@/lib/ui/heroui-brand";

interface PlayerInvite {
  id: string;
  playerEmail: string;
  status: string;
  contractEndDate: string | Date | null;
  createdAt: string | Date;
}

export default function PlayerInviteManager({ pendingInvites }: { pendingInvites: PlayerInvite[] }) {
  const [email, setEmail] = useState("");
  const [contractEndDate, setContractEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const router = useRouter();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      alert("Ingresa un correo electrónico válido");
      return;
    }
    if (!contractEndDate) {
      alert("Ingresa una fecha de fin del vínculo de representación.");
      return;
    }

    setIsSubmitting(true);
    const result = await invitePlayerToAgency(email, contractEndDate);
    setIsSubmitting(false);

    if (result.error) {
      alert(result.error);
    } else {
      alert("Invitación de representación enviada correctamente");
      setEmail("");
      setContractEndDate("");
      router.refresh(); // Refresh page to see new invite
    }
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    const result = await revokePlayerInvite(id);
    setRevokingId(null);

    if (result.error) {
      alert(result.error);
    } else {
      alert("Invitación revocada");
      router.refresh();
    }
  };

  return (
    <div className="mt-6 space-y-8">
      <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6">
        <h3 className="mb-2 font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          Vincular un jugador a la agencia
        </h3>
        <p className="mb-5 max-w-2xl text-sm leading-[1.55] text-bh-fg-3">
          Enviá una invitación formal de representación a un jugador. Al
          aceptar, su perfil quedará vinculado públicamente a la agencia hasta
          la fecha de caducidad del vínculo.
        </p>

        <form onSubmit={handleInvite} className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:max-w-[280px]">
            <FormField
              id="bh-pi-email"
              type="email"
              label="Correo del jugador"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              startContent={<Mail className="h-4 w-4" />}
            />
          </div>
          <div className="w-full sm:max-w-[200px]">
            <FormField
              id="bh-pi-end-date"
              type="date"
              label="Fin del vínculo"
              value={contractEndDate}
              onChange={(e) => setContractEndDate(e.target.value)}
              disabled={isSubmitting}
              startContent={<CalendarDays className="h-4 w-4" />}
            />
          </div>
          <Button
            type="submit"
            isLoading={isSubmitting}
            className={bhButtonClass({ variant: "lime", size: "md", className: "w-full sm:w-auto" })}
          >
            Enviar invitación
          </Button>
        </form>
      </div>

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
          <BhEmptyState
            title="Sin pendientes"
            description="No hay invitaciones de representación pendientes."
          />
        ) : (
          <div className="overflow-hidden rounded-bh-lg border border-white/[0.08] bg-bh-surface-1">
            <Table
              aria-label="Invitaciones pendientes"
              removeWrapper
              classNames={bhTableClassNames}
            >
              <TableHeader>
                <TableColumn>JUGADOR</TableColumn>
                <TableColumn>CADUCIDAD VÍNCULO</TableColumn>
                <TableColumn>ESTADO</TableColumn>
                <TableColumn>ENVIADA</TableColumn>
                <TableColumn align="end">ACCIONES</TableColumn>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium !text-bh-fg-1">{invite.playerEmail}</TableCell>
                    <TableCell>
                      <span className="font-bh-mono text-[12px] text-bh-fg-3">
                        {invite.contractEndDate ? new Date(invite.contractEndDate).toLocaleDateString("es-AR", { timeZone: "UTC" }) : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" classNames={bhChip("warning")}>
                        {invite.status === "pending" ? "Pendiente" : invite.status}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <span className="font-bh-mono text-[12px] text-bh-fg-3">
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
                          className={bhButtonClass({ variant: "icon-danger", size: "sm", iconOnly: true })}
                        >
                          {revokingId === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
