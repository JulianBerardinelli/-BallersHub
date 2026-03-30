"use client";

import { useState } from "react";
import { Button, Input, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";
import { Mail, Loader2, Trash2 } from "lucide-react";
import { inviteAgencyStaff, revokeInvite } from "@/app/actions/agency-invites";
import { useRouter } from "next/navigation";

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
      alert("Ingresa un correo electrónico válido");
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
      router.refresh(); // Refresh page to see new invite
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
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Invitar a un nuevo colega</h3>
        <p className="text-sm text-neutral-400 mb-6 max-w-2xl">
          Envía una invitación a otros managers para que se unan a esta agencia. 
          Al aceptar, podrán ver a todos los jugadores representados y editar el perfil de la agencia. 
          Si ya tienen cuenta en BallersHub su acceso será automático.
        </p>

        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 items-start">
          <Input
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            startContent={<Mail className="h-4 w-4 text-neutral-500" />}
            classNames={{
              inputWrapper: "bg-neutral-950 border-neutral-800",
            }}
            className="w-full sm:max-w-md"
          />
          <Button 
            type="submit" 
            color="primary" 
            isLoading={isSubmitting}
            className="w-full sm:w-auto font-medium"
          >
             Enviar invitación
          </Button>
        </form>
      </div>

      {/* Pending Invites List */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Invitaciones Pendientes ({pendingInvites.length})</h3>
        
        {pendingInvites.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900/30 py-12 text-center text-sm text-neutral-500">
            No hay invitaciones pendientes.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-800">
            <Table aria-label="Invitaciones pendientes" removeWrapper className="bg-neutral-900/50">
              <TableHeader>
                <TableColumn>CORREO</TableColumn>
                <TableColumn>ESTADO</TableColumn>
                <TableColumn>FECHA</TableColumn>
                <TableColumn align="end">ACCIONES</TableColumn>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium text-white">{invite.email}</TableCell>
                    <TableCell>
                      <Chip size="sm" color="warning" variant="flat" className="capitalize">
                        Pendiente
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
