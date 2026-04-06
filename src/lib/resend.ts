import { Resend } from "resend";

export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const sendAgencyStaffInviteEmail = async (
  email: string,
  managerName: string,
  agencyName: string,
  inviteToken: string
) => {
  const inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL}/onboarding/accept-invite?token=${inviteToken}`;
  
  if (!resend) {
    console.log("[Resend Mock] Envío ignorado. Configura RESEND_API_KEY.");
    console.log(`[Resend Mock] Link de invitación: ${inviteLink}`);
    return;
  }

  try {
    await resend.emails.send({
      from: "BallersHub <no-reply@ballershub.co>",
      to: [email],
      subject: `Invitación para unirte a ${agencyName} en BallersHub`,
      html: `
        <div>
          <h2>¡Hola!</h2>
          <p><strong>${managerName}</strong> te ha invitado a formar parte del staff de la agencia <strong>${agencyName}</strong> en BallersHub.</p>
          <p>Para aceptar la invitación y unirte al equipo, haz clic en el siguiente enlace:</p>
          <a href="${inviteLink}" style="display:inline-block;padding:10px 20px;background-color:#000;color:#fff;text-decoration:none;border-radius:5px;margin:20px 0;">Aceptar Invitación</a>
          <p>Si ya posees una cuenta, te pediremos que inicies sesión. Si no, podrás registrarte rápidamente.</p>
          <p>El equipo de BallersHub</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error al enviar email de invitación:", error);
    // Silent fail for the user, but logged
  }
};

export const sendPlayerAgencyInviteEmail = async (
  email: string,
  managerName: string,
  agencyName: string,
  inviteToken: string,
  contractEndDate: string
) => {
  const inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL}/onboarding/accept-invite?token=${inviteToken}`;
  
  if (!resend) {
    console.log("[Resend Mock] Envío ignorado. Configura RESEND_API_KEY.");
    console.log(`[Resend Mock] Link de invitación para JUGADOR: ${inviteLink}`);
    return;
  }

  try {
    await resend.emails.send({
      from: "BallersHub <no-reply@ballershub.co>",
      to: [email],
      subject: `${agencyName} ha solicitado sumarte a su cartera de jugadores`,
      html: `
        <div>
          <h2>¡Hola!</h2>
          <p>La agencia <strong>${agencyName}</strong> (representada por ${managerName}) te ha invitado a formar parte de su cartera de futbolistas en BallersHub.</p>
          <p>El vínculo de representación registrado en nuestra plataforma está vigente hasta el <strong>${contractEndDate}</strong>.</p>
          <p>Para aceptar la invitación y vincular tu perfil deportivo de forma oficial a ${agencyName}, haz clic en el siguiente enlace:</p>
          <a href="${inviteLink}" style="display:inline-block;padding:10px 20px;background-color:#000;color:#fff;text-decoration:none;border-radius:5px;margin:20px 0;">Vincularme a la Agencia</a>
          <p>Si aún no tienes tu perfil de BallersHub configurado, te pediremos que lo completes al ingresar.</p>
          <p>El equipo de BallersHub</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error al enviar email de vinculación de jugador:", error);
  }
};

export const sendPlayerDisconnectEmail = async (
  agencyEmail: string,
  playerName: string,
  agencyName: string,
) => {
  if (!resend) {
    console.log("[Resend Mock] Envío ignorado. Configura RESEND_API_KEY.");
    console.log(`[Resend Mock] Email a ${agencyEmail}: ${playerName} se ha desvinculado de ${agencyName}`);
    return;
  }

  try {
    await resend.emails.send({
      from: "BallersHub <no-reply@ballershub.co>",
      to: [agencyEmail],
      subject: `Notificación de desvinculación: ${playerName}`,
      html: `
        <div>
          <h2>Aviso de desvinculación</h2>
          <p>La cuenta correspondiente a <strong>${playerName}</strong> ha cancelado unilateralmente su vinculación con la agencia <strong>${agencyName}</strong> en BallersHub.</p>
          <p>Este cambio ya tiene efecto inmediato en la plataforma, y el jugador ya no aparecerá en tu directorio de roster.</p>
          <p>Si esto fue un error, puedes volver a enviarle una invitación desde tu panel de "Mis Jugadores".</p>
          <p>El equipo de BallersHub</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error al enviar email de desvinculación de jugador:", error);
  }
};

