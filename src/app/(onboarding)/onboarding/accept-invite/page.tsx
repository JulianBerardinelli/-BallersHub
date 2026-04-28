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
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <AlertTriangle className="mx-auto w-12 h-12 text-bh-danger" />
          <h1 className="font-bh-display text-2xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">Enlace inválido</h1>
          <p className="text-bh-fg-3">Esta invitación no contiene un token de acceso válido.</p>
          <Link href="/" className="inline-block mt-4 text-bh-lime underline-offset-4 hover:underline">Volver al inicio</Link>
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
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
           <AlertTriangle className="mx-auto w-12 h-12 text-bh-warning" />
           <h1 className="font-bh-display text-2xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">Invitación no encontrada</h1>
           <p className="text-bh-fg-3">El enlace pudo haber expirado o la invitación fue revocada por la agencia.</p>
           <Link href="/" className="inline-block mt-4 text-bh-lime underline-offset-4 hover:underline">Ir a BallersHub</Link>
        </div>
      </div>
    );
  }

  const targetEmail = ("email" in invite ? invite.email : invite.playerEmail);
  const agencyName = invite.agency?.name || "Una Agencia";
  const isPlayerInvite = !!playerInvite;

  if (invite.status !== "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-8">
           <CheckCircle className="mx-auto w-12 h-12 text-bh-blue" />
           <h1 className="font-bh-display text-2xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">Invitación procesada</h1>
           <p className="text-bh-fg-3">Esta invitación ya ha sido {invite.status === "accepted" ? "aceptada" : "rechazada"}.</p>
           <Link href="/dashboard" className="inline-block mt-4 inline-flex items-center justify-center rounded-bh-md bg-bh-lime px-5 py-2.5 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]">
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
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="text-center space-y-4 max-w-md rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-8">
             <AlertTriangle className="mx-auto w-12 h-12 text-bh-warning" />
             <h1 className="font-bh-display text-2xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">Cuenta incorrecta</h1>
             <p className="text-bh-fg-3">
               Esta invitación está dirigida al correo <strong className="text-bh-fg-1">{targetEmail}</strong>, pero has iniciado sesión como <strong className="text-bh-fg-1">{user.email}</strong>.
             </p>
             <div className="pt-4 flex flex-col gap-3">
               <Link href="/dashboard/settings/account" className="inline-flex items-center justify-center rounded-bh-md bg-bh-lime px-5 py-2.5 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]">
                 Cerrar sesión actual
               </Link>
             </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-7 rounded-bh-xl border border-white/[0.08] bg-bh-surface-1 p-8 text-center shadow-2xl shadow-black/60">
        <div>
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(204,255,0,0.25)] bg-[rgba(204,255,0,0.08)] text-bh-lime">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h2 className="mt-5 font-bh-display text-2xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
            Invitación recibida
          </h2>
          <p className="mt-2 text-sm leading-[1.55] text-bh-fg-3">
            <strong className="text-bh-fg-1">{agencyName}</strong> te ha enviado
            una invitación oficial para sumarte a la plataforma como{" "}
            {isPlayerInvite ? "jugador representado" : "mánager de agencia"}.
          </p>
        </div>

        <div className="rounded-bh-md border border-dashed border-white/[0.08] bg-bh-surface-1/60 p-4 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-3">
            Destinatario
          </p>
          <p className="mt-1 font-bh-mono text-[13px] text-bh-fg-1">
            {targetEmail}
          </p>
          <p className="mt-2 text-[11px] text-bh-fg-4">
            Si no sos el dueño de este correo, por favor desestimá esta
            invitación.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Link
            href={`/auth/sign-in?email=${encodeURIComponent(targetEmail)}&redirect=/dashboard`}
            className="inline-flex w-full items-center justify-center rounded-bh-md bg-bh-lime px-4 py-2.5 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
          >
            Iniciar sesión para aceptar
          </Link>
          <Link
            href={`/auth/sign-up?email=${encodeURIComponent(targetEmail)}`}
            className="inline-flex w-full items-center justify-center rounded-bh-md border border-bh-fg-4 px-4 py-2.5 text-[13px] font-medium text-bh-fg-2 transition-colors duration-150 hover:border-bh-fg-3 hover:bg-white/[0.06] hover:text-bh-fg-1"
          >
            Aún no tengo una cuenta
          </Link>
        </div>
      </div>
    </div>
  );
}
