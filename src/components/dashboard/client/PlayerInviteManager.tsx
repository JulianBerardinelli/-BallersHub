"use client";

import { useState } from "react";
import { Button, Input, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";
import { Mail, Loader2, Trash2, CalendarDays } from "lucide-react";
import { invitePlayerToAgency, revokePlayerInvite } from "@/app/actions/player-invites";
import { useRouter } from "next/navigation";

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
    <div className="space-y-8 mt-6">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Vincular un Jugador a la Agencia</h3>
        <p className="text-sm text-neutral-400 mb-6 max-w-2xl">
          Envía una invitación formal de representación a un jugador.
          Al aceptar, su perfil quedará vinculado públicamente a la agencia hasta la fecha de caducidad del vínculo.
        </p>

        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 items-start">
          <Input
            type="email"
            label="Correo del jugador"
            placeholder="correo@ejemplo.com"
            labelPlacement="outside"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            startContent={<Mail className="h-4 w-4 text-neutral-500" />}
            classNames={{
              label: "text-white font-medium",
              inputWrapper: "bg-neutral-950 border-neutral-800",
            }}
            className="w-full sm:max-w-[280px]"
          />
          <Input
            type="date"
            label="Fin del Vínculo"
            placeholder="Selecciona la caducidad"
            labelPlacement="outside"
            value={contractEndDate}
            onChange={(e) => setContractEndDate(e.target.value)}
            disabled={isSubmitting}
            startContent={<CalendarDays className="h-4 w-4 text-neutral-500" />}
            classNames={{
              label: "text-white font-medium",
              inputWrapper: "bg-neutral-950 border-neutral-800",
            }}
            className="w-full sm:max-w-[200px]"
          />
          <div className="flex h-full items-end pb-0 sm:pb-0 sm:pt-[24px]">
            <Button 
              type="submit" 
              color="primary" 
              isLoading={isSubmitting}
              className="w-full sm:w-auto font-medium h-10"
            >
               Enviar invitación
            </Button>
          </div>
        </form>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Invitaciones Pendientes ({pendingInvites.length})</h3>
        
        {pendingInvites.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900/30 py-12 text-center text-sm text-neutral-500">
            No hay invitaciones de representación pendientes.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-800">
            <Table aria-label="Invitaciones pendientes" removeWrapper className="bg-neutral-900/50">
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
                    <TableCell className="font-medium text-white">{invite.playerEmail}</TableCell>
                    <TableCell className="text-neutral-400">
                       {invite.contractEndDate ? new Date(invite.contractEndDate).toLocaleDateString("es-AR", { timeZone: "UTC" }) : "-"}
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" color="warning" variant="flat" className="capitalize">
                        {invite.status === "pending" ? "Pendiente" : invite.status}
                      </Chip>
                    </TableCell>
                    <TableCell className="text-neutral-400">
                      {new Date(invite.createdAt).toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end relative">
                         <Button 
                           isIconOnly
                           size="sm"
                           variant="light"
                           color="danger"
                           onClick={() => handleRevoke(invite.id)}
                           isDisabled={revokingId === invite.id}
                           title="Revocar invitación"
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
