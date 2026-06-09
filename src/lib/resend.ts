import { Resend } from "resend";
import { localizedSubject, renderTemplate } from "@/emails";
import { senderFrom, siteUrl } from "@/emails/tokens";
import { signUnsubscribeToken } from "@/lib/marketing/unsubscribe-token";
import { resolvePreferredLocale } from "@/lib/marketing/recipient-props";

/**
 * Centralized Resend dispatch for transactional emails.
 *
 * All HTML is now rendered from the React Email template registry in
 * `src/emails/templates/_registry.ts` so every send (welcome, invite,
 * disconnect…) inherits the 'BallersHub design system automatically.
 *
 * Marketing campaigns DO NOT go through here — those are dispatched by
 * `src/lib/marketing/dispatch.ts` (with batching, suppression, etc.).
 */
export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const dashboardUrl = (path = "") =>
  `${siteUrl.replace(/\/+$/, "")}/dashboard${path ? `/${path.replace(/^\/+/, "")}` : ""}`;
const inviteUrl = (token: string) =>
  `${siteUrl.replace(/\/+$/, "")}/onboarding/accept-invite?token=${encodeURIComponent(token)}`;
const blogPostUrl = (slug: string) =>
  `${siteUrl.replace(/\/+$/, "")}/blog/${encodeURIComponent(slug)}`;
const blogAuthorHubUrl = (slug: string) =>
  `${siteUrl.replace(/\/+$/, "")}/blog/authors/${encodeURIComponent(slug)}`;
const blogEditUrl = (postId: string) =>
  `${siteUrl.replace(/\/+$/, "")}/blog/write/${encodeURIComponent(postId)}`;
const adminBlogReviewUrl = (postId: string) =>
  `${siteUrl.replace(/\/+$/, "")}/admin/blog/${encodeURIComponent(postId)}`;

// ============================================================================
// Welcomes
// ============================================================================

export async function sendPlayerWelcomeEmail(email: string, playerName: string) {
  if (!resend) {
    console.log("[Resend Mock] Welcome Player →", email);
    return;
  }
  try {
    const locale = await resolvePreferredLocale({ email });
    const html = await renderTemplate("welcome_player", {
      playerName,
      dashboardUrl: dashboardUrl(),
      recipientEmail: email,
      // Welcomes are transactional — not gated by marketing consent — but we
      // still include an unsubscribe link in the footer for consistency. It
      // suppresses *future marketing*, not transactional emails.
      unsubscribeToken: signUnsubscribeToken(email),
      locale,
    });
    await resend.emails.send({
      from: senderFrom,
      to: [email],
      subject: localizedSubject("welcome_player", locale, "Ponte en marcha en 'BallersHub"),
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
    const locale = await resolvePreferredLocale({ email });
    const html = await renderTemplate("welcome_agency", {
      managerName,
      dashboardUrl: dashboardUrl(),
      recipientEmail: email,
      unsubscribeToken: signUnsubscribeToken(email),
      locale,
    });
    await resend.emails.send({
      from: senderFrom,
      to: [email],
      subject: localizedSubject(
        "welcome_agency",
        locale,
        "Construí tu directorio de talentos en 'BallersHub",
      ),
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
      subject: `Invitación para unirte a ${agencyName} en 'BallersHub`,
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
      subject: `${agencyName} solicitó representarte en 'BallersHub`,
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

export async function sendCompGrantWelcomeEmail(opts: {
  email: string;
  displayName: string;
  planId: "pro-player" | "pro-agency";
  expiresAt: string | null;
  variant: "grant" | "extend";
}) {
  if (!resend) {
    console.log(
      "[Resend Mock] Comp grant welcome →",
      opts.email,
      opts.planId,
      opts.variant,
    );
    return;
  }
  try {
    const html = await renderTemplate("comp_grant_welcome", {
      displayName: opts.displayName,
      planId: opts.planId,
      expiresAt: opts.expiresAt,
      variant: opts.variant,
      dashboardUrl: dashboardUrl(),
      manageSubscriptionUrl: dashboardUrl("settings/subscription"),
      recipientEmail: opts.email,
    });
    const subjectPlan =
      opts.planId === "pro-agency" ? "Pro Agency" : "Pro Player";
    const subject =
      opts.variant === "extend"
        ? `Extendimos tu cuenta de cortesía ${subjectPlan}`
        : `Tu cuenta de cortesía ${subjectPlan} está activa`;
    await resend.emails.send({
      from: senderFrom,
      to: [opts.email],
      subject,
      html,
    });
  } catch (error) {
    console.error("[resend] sendCompGrantWelcomeEmail:", error);
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

// ============================================================================
// Blog editorial workflow (MVP-2 #2)
// ============================================================================

/**
 * Notifica a TODOS los admins cuando un blogger submitea un post para
 * revisión. Si no hay admins (caso edge) o no hay Resend config, hace
 * mock log. Failure silenciosa — la action principal (submitForReview)
 * no debería romper si el email falla.
 */
export async function sendBlogPostPendingAdminEmail(opts: {
  adminEmails: string[];
  authorName: string;
  authorEmail: string;
  postId: string;
  postTitle: string;
  clusterLabel: string;
  readingTimeMin: number;
}) {
  if (opts.adminEmails.length === 0) {
    console.warn("[resend] sendBlogPostPendingAdminEmail: no admin emails to notify");
    return;
  }
  if (!resend) {
    console.log(
      "[Resend Mock] Blog post pending →",
      opts.adminEmails,
      opts.postTitle,
    );
    return;
  }
  try {
    const reviewUrl = adminBlogReviewUrl(opts.postId);
    const html = await renderTemplate("blog_post_pending_admin", {
      authorName: opts.authorName,
      authorEmail: opts.authorEmail,
      postTitle: opts.postTitle,
      clusterLabel: opts.clusterLabel,
      readingTimeMin: opts.readingTimeMin,
      reviewUrl,
    });
    await resend.emails.send({
      from: senderFrom,
      to: opts.adminEmails,
      subject: `Blog — Post nuevo en revisión: ${opts.postTitle}`,
      html,
    });
  } catch (error) {
    console.error("[resend] sendBlogPostPendingAdminEmail:", error);
  }
}

/**
 * Notifica al autor cuando su post es aprobado y publicado. Pasa
 * postSlug + opcionalmente authorSlug para mostrar link a su author hub.
 */
export async function sendBlogPostApprovedAuthorEmail(opts: {
  authorEmail: string;
  authorName: string;
  postTitle: string;
  postSlug: string;
  clusterLabel: string;
  authorSlug?: string | null;
}) {
  if (!resend) {
    console.log(
      "[Resend Mock] Blog post approved →",
      opts.authorEmail,
      opts.postTitle,
    );
    return;
  }
  try {
    const html = await renderTemplate("blog_post_approved_author", {
      authorName: opts.authorName,
      postTitle: opts.postTitle,
      clusterLabel: opts.clusterLabel,
      postUrl: blogPostUrl(opts.postSlug),
      authorHubUrl: opts.authorSlug ? blogAuthorHubUrl(opts.authorSlug) : undefined,
      recipientEmail: opts.authorEmail,
    });
    await resend.emails.send({
      from: senderFrom,
      to: [opts.authorEmail],
      subject: `Publicamos tu artículo: ${opts.postTitle}`,
      html,
    });
  } catch (error) {
    console.error("[resend] sendBlogPostApprovedAuthorEmail:", error);
  }
}

/**
 * Notifica al autor cuando su post es rechazado con feedback. El editor
 * URL apunta a /blog/write/[id] donde puede iterar (el post queda en
 * estado 'rejected' que permite UPDATE por el autor).
 */
export async function sendBlogPostRejectedAuthorEmail(opts: {
  authorEmail: string;
  authorName: string;
  postId: string;
  postTitle: string;
  rejectionReason: string;
}) {
  if (!resend) {
    console.log(
      "[Resend Mock] Blog post rejected →",
      opts.authorEmail,
      opts.postTitle,
    );
    return;
  }
  try {
    const html = await renderTemplate("blog_post_rejected_author", {
      authorName: opts.authorName,
      postTitle: opts.postTitle,
      rejectionReason: opts.rejectionReason,
      editUrl: blogEditUrl(opts.postId),
      recipientEmail: opts.authorEmail,
    });
    await resend.emails.send({
      from: senderFrom,
      to: [opts.authorEmail],
      subject: `Feedback editorial sobre tu artículo`,
      html,
    });
  } catch (error) {
    console.error("[resend] sendBlogPostRejectedAuthorEmail:", error);
  }
}
