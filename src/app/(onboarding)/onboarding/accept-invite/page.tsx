import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { CheckCircle, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Aceptar Invitación - BallersHub",
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AcceptInvitePage(props: PageProps) {
  const searchParams = await props.searchParams;
  const token = typeof searchParams.token === "string" ? searchParams.token : null;

  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center bg-black px-4">
        <div className="text-center space-y-4 max-w-sm">
          <AlertTriangle className="mx-auto w-12 h-12 text-red-500" />
          <h1 className="text-xl font-bold text-white">Enlace inválido</h1>
          <p className="text-neutral-400">Esta invitación no contiene un token de acceso válido.</p>
          <Link href="/" className="inline-block mt-4 text-primary hover:underline">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  const supabase = await createSupabaseServerRSC();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Search in Agency (Staff) Invites
  const staffInvite = await db.query.agencyInvites.findFirst({
    where: (invites, { eq }) => eq(invites.token, token),
    with: { agency: true }
  });

  // 2. Search in Player (Roster) Invites
  const playerInvite = await db.query.playerInvites.findFirst({
    where: (invites, { eq }) => eq(invites.token, token),
    with: { agency: true }
  });

  const invite = staffInvite || playerInvite;

  if (!invite) {
    return (
      <div className="flex h-screen items-center justify-center bg-black px-4">
        <div className="text-center space-y-4 max-w-sm">
           <AlertTriangle className="mx-auto w-12 h-12 text-yellow-500" />
           <h1 className="text-xl font-bold text-white">Invitación no encontrada</h1>
           <p className="text-neutral-400">El enlace pudo haber expirado o la invitación fue revocada por la agencia.</p>
           <Link href="/" className="inline-block mt-4 text-primary hover:underline">Ir a BallersHub</Link>
        </div>
      </div>
    );
  }

  const targetEmail = ("email" in invite ? invite.email : invite.playerEmail);
  const agencyName = invite.agency?.name || "Una Agencia";
  const isPlayerInvite = !!playerInvite;

  if (invite.status !== "pending") {
    return (
      <div className="flex h-screen items-center justify-center bg-black px-4">
        <div className="text-center space-y-4 max-w-sm rounded-xl border border-neutral-800 bg-neutral-900/50 p-8">
           <CheckCircle className="mx-auto w-12 h-12 text-blue-500" />
           <h1 className="text-xl font-bold text-white">Invitación procesada</h1>
           <p className="text-neutral-400">Esta invitación ya ha sido {invite.status === "accepted" ? "aceptada" : "rechazada"}.</p>
           <Link href="/dashboard" className="inline-block mt-4 bg-white text-black font-medium py-2 px-6 rounded-md hover:bg-neutral-200">
             Ir a mi panel
           </Link>
        </div>
      </div>
    );
  }

  // If user is already logged in normally
  if (user) {
    if (user.email === targetEmail) {
      // The dashboard layout will automatically pop up the PendingInvites modal!
      redirect("/dashboard");
    } else {
      // Wrong account logged in
      return (
        <div className="flex h-screen items-center justify-center bg-black px-4">
          <div className="text-center space-y-4 max-w-md rounded-xl border border-neutral-800 bg-neutral-900/50 p-8">
             <AlertTriangle className="mx-auto w-12 h-12 text-yellow-500" />
             <h1 className="text-xl font-bold text-white">Cuenta incorrecta</h1>
             <p className="text-neutral-400">
               Esta invitación está dirigida al correo <strong className="text-white">{targetEmail}</strong>, pero has iniciado sesión como <strong className="text-white">{user.email}</strong>.
             </p>
             <div className="pt-4 flex flex-col gap-3">
               <Link href="/dashboard/settings/account" className="bg-white text-black font-medium py-2 px-6 rounded-md hover:bg-neutral-200">
                 Cerrar sesión actual
               </Link>
             </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8 text-center shadow-xl">
        
        <div>
           <CheckCircle className="mx-auto h-16 w-16 text-primary" />
           <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white">
             Invitación Recibida
           </h2>
           <p className="mt-2 text-sm text-neutral-400">
              <strong className="text-white">{agencyName}</strong> te ha enviado una invitación oficial para sumarte a la plataforma estadísitca como {isPlayerInvite ? "jugador representado" : "mánager de agencia"}.
           </p>
        </div>

        <div className="rounded-md bg-neutral-950/50 p-4 border border-dashed border-neutral-800">
          <p className="text-sm font-medium text-neutral-300">
            Destinatario: <span className="text-white font-bold">{targetEmail}</span>
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Si no eres el dueño de este correo, por favor desestima esta invitación.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Link
            href={`/auth/sign-in?email=${encodeURIComponent(targetEmail)}&redirect=/dashboard`}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-white hover:bg-neutral-200 focus:outline-none"
          >
            Iniciar sesión para Aceptar
          </Link>
          <Link
            href={`/auth/sign-up?email=${encodeURIComponent(targetEmail)}`}
            className="w-full flex justify-center py-2.5 px-4 border border-neutral-700 rounded-md shadow-sm text-sm font-medium text-white bg-transparent hover:bg-neutral-800 focus:outline-none"
          >
            Aún no tengo una cuenta
          </Link>
        </div>
      </div>
    </div>
  );
}
