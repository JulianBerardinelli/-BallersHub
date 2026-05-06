import { Resend } from "resend";
import { renderTemplate } from "@/emails";
import { senderFrom, siteUrl } from "@/emails/tokens";
import { signUnsubscribeToken } from "@/lib/marketing/unsubscribe-token";

/**
 * Centralized Resend dispatch for transactional emails.
 *
 * All HTML is now rendered from the React Email template registry in
 * `src/emails/templates/_registry.ts` so every send (welcome, invite,
 * disconnect…) inherits the BallersHub design system automatically.
 *
 * Marketing campaigns DO NOT go through here — those are dispatched by
 * `src/lib/marketing/dispatch.ts` (with batching, suppression, etc.).
 */
export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const dashboardUrl = (path = "") =>
  `${siteUrl.replace(/\/+$/, "")}/dashboard${path ? `/${path.replace(/^\/+/, "")}` : ""}`;
const inviteUrl = (token: string) =>
  `${siteUrl.replace(/\/+$/, "")}/onboarding/accept-invite?token=${encodeURIComponent(token)}`;

// ============================================================================
// Welcomes
// ============================================================================

export async function sendPlayerWelcomeEmail(email: string, playerName: string) {
  if (!resend) {
    console.log("[Resend Mock] Welcome Player →", email);
    return;
  }
  try {
    const html = await renderTemplate("welcome_player", {
      playerName,
      dashboardUrl: dashboardUrl(),
      recipientEmail: email,
      // Welcomes are transactional — not gated by marketing consent — but we
      // still include an unsubscribe link in the footer for consistency. It
      // suppresses *future marketing*, not transactional emails.
      unsubscribeToken: signUnsubscribeToken(email),
    });
    await resend.emails.send({
      from: senderFrom,
      to: [email],
      subject: "Ponte en marcha en BallersHub",
      html,
    });
  } catch (error) {
    console.error("[resend] sendPlayerWelcomeEmail:", error);
  }
}

export async function sendAgencyWelcomeEmail(email: string, managerName: string) {
  if (!resend) {
    console.log("[Resend Mock] Welcome Agency →", email);
    return;
  }
  try {
    const html = await renderTemplate("welcome_agency", {
      managerName,
      dashboardUrl: dashboardUrl(),
      recipientEmail: email,
      unsubscribeToken: signUnsubscribeToken(email),
    });
    await resend.emails.send({
      from: senderFrom,
      to: [email],
      subject: "Construí tu directorio de talentos en BallersHub",
      html,
    });
  } catch (error) {
    console.error("[resend] sendAgencyWelcomeEmail:", error);
  }
}

// ============================================================================
// Lead capture (visitor left email on a public portfolio)
// ============================================================================

export async function sendLeadWelcomeEmail(opts: {
  email: string;
  playerName: string;
  playerSlug: string;
}) {
  if (!resend) {
    console.log("[Resend Mock] Lead Welcome →", opts.email);
    return;
  }
  try {
    const portfolioUrl = `${siteUrl.replace(/\/+$/, "")}/${encodeURIComponent(opts.playerSlug)}`;
    const signUpUrl = `${siteUrl.replace(/\/+$/, "")}/auth/sign-up?redirect=${encodeURIComponent(`/${opts.playerSlug}`)}`;
    const html = await renderTemplate("lead_welcome", {
      playerName: opts.playerName,
      portfolioUrl,
      signUpUrl,
      recipientEmail: opts.email,
      unsubscribeToken: signUnsubscribeToken(opts.email),
    });
    await resend.emails.send({
      from: senderFrom,
      to: [opts.email],
      subject: `Acceso desbloqueado: contacto de ${opts.playerName}`,
      html,
    });
  } catch (error) {
    console.error("[resend] sendLeadWelcomeEmail:", error);
  }
}

// ============================================================================
// Invitations & networking
// ============================================================================

export async function sendAgencyStaffInviteEmail(
  email: string,
  managerName: string,
  agencyName: string,
  inviteToken: string,
) {
  const url = inviteUrl(inviteToken);
  if (!resend) {
    console.log(`[Resend Mock] Staff invite link: ${url}`);
    return;
  }
  try {
    const html = await renderTemplate("agency_staff_invite", {
      managerName,
      agencyName,
      inviteUrl: url,
      recipientEmail: email,
    });
    await resend.emails.send({
      from: senderFrom,
      to: [email],
      subject: `Invitación para unirte a ${agencyName} en BallersHub`,
      html,
    });
  } catch (error) {
    console.error("[resend] sendAgencyStaffInviteEmail:", error);
  }
}

export async function sendPlayerAgencyInviteEmail(
  email: string,
  managerName: string,
  agencyName: string,
  inviteToken: string,
  contractEndDate: string,
) {
  const url = inviteUrl(inviteToken);
  if (!resend) {
    console.log(`[Resend Mock] Player-agency invite link: ${url}`);
    return;
  }
  try {
    const html = await renderTemplate("player_agency_invite", {
      managerName,
      agencyName,
      inviteUrl: url,
      contractEndDate,
      recipientEmail: email,
    });
    await resend.emails.send({
      from: senderFrom,
      to: [email],
      subject: `${agencyName} solicitó representarte en BallersHub`,
      html,
    });
  } catch (error) {
    console.error("[resend] sendPlayerAgencyInviteEmail:", error);
  }
}

export async function sendPlayerDisconnectEmail(
  agencyEmail: string,
  playerName: string,
  agencyName: string,
) {
  if (!resend) {
    console.log("[Resend Mock] Player disconnect →", agencyEmail);
    return;
  }
  try {
    const html = await renderTemplate("player_disconnect", {
      playerName,
      agencyName,
      recipientEmail: agencyEmail,
    });
    await resend.emails.send({
      from: senderFrom,
      to: [agencyEmail],
      subject: `Notificación de desvinculación: ${playerName}`,
      html,
    });
  } catch (error) {
    console.error("[resend] sendPlayerDisconnectEmail:", error);
  }
}

// ============================================================================
// Billing transactionals
// ============================================================================

export async function sendSubscriptionWelcomeEmail(opts: {
  email: string;
  displayName: string;
  planId: "pro-player" | "pro-agency";
  formattedAmount: string;
  trialEndsAt: string | null;
  nextChargeAt: string | null;
}) {
  if (!resend) {
    console.log("[Resend Mock] Subscription welcome →", opts.email, opts.planId);
    return;
  }
  try {
    const html = await renderTemplate("subscription_welcome", {
      displayName: opts.displayName,
      planId: opts.planId,
      formattedAmount: opts.formattedAmount,
      trialEndsAt: opts.trialEndsAt,
      nextChargeAt: opts.nextChargeAt,
      dashboardUrl: dashboardUrl(),
      manageSubscriptionUrl: dashboardUrl("settings/subscription"),
      recipientEmail: opts.email,
    });
    const subjectPlan =
      opts.planId === "pro-agency" ? "Pro Agency" : "Pro Player";
    await resend.emails.send({
      from: senderFrom,
      to: [opts.email],
      subject: `Tu plan ${subjectPlan} está activo`,
      html,
    });
  } catch (error) {
    console.error("[resend] sendSubscriptionWelcomeEmail:", error);
  }
}

export async function sendPaymentFailedEmail(opts: {
  email: string;
  displayName: string;
  planId: "pro-player" | "pro-agency";
  formattedAmount: string;
  nextRetryAt: string | null;
}) {
  if (!resend) {
    console.log("[Resend Mock] Payment failed →", opts.email, opts.planId);
    return;
  }
  try {
    const html = await renderTemplate("payment_failed", {
      displayName: opts.displayName,
      planId: opts.planId,
      formattedAmount: opts.formattedAmount,
      nextRetryAt: opts.nextRetryAt,
      updatePaymentUrl: dashboardUrl("settings/subscription"),
      recipientEmail: opts.email,
    });
    await resend.emails.send({
      from: senderFrom,
      to: [opts.email],
      subject: "No pudimos cobrar tu suscripción",
      html,
    });
  } catch (error) {
    console.error("[resend] sendPaymentFailedEmail:", error);
  }
}
