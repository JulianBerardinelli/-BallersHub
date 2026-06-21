import { Resend } from "resend";
import { localizedSubject, renderTemplate } from "@/emails";
import { senderFrom, siteUrl } from "@/emails/tokens";
import { signUnsubscribeToken } from "@/lib/marketing/unsubscribe-token";
import { resolvePreferredLocale } from "@/lib/marketing/recipient-props";
import {
  ADMIN_EDIT_DOMAIN_HREFS,
  ADMIN_EDIT_DOMAIN_LABELS,
  type AdminEditDomain,
} from "@/lib/admin/edit-domains";
import type { Locale } from "@/i18n/routing";

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
  /** Locale of the portfolio page the lead was on (threaded by the route). */
  locale?: Locale;
}) {
  if (!resend) {
    console.log("[Resend Mock] Lead Welcome →", opts.email);
    return;
  }
  try {
    const locale = opts.locale ?? "es";
    const base = siteUrl.replace(/\/+$/, "");
    // Send the lead back to the locale they were browsing in.
    const prefix = locale === "es" ? "" : `/${locale}`;
    const slugPath = `${prefix}/${encodeURIComponent(opts.playerSlug)}`;
    const portfolioUrl = `${base}${slugPath}`;
    const signUpUrl = `${base}${prefix}/auth/sign-up?redirect=${encodeURIComponent(slugPath)}`;
    const html = await renderTemplate("lead_welcome", {
      playerName: opts.playerName,
      portfolioUrl,
      signUpUrl,
      recipientEmail: opts.email,
      unsubscribeToken: signUnsubscribeToken(opts.email),
      locale,
    });
    await resend.emails.send({
      from: senderFrom,
      to: [opts.email],
      subject: LEAD_SUBJECT[locale](opts.playerName),
      html,
    });
  } catch (error) {
    console.error("[resend] sendLeadWelcomeEmail:", error);
  }
}

const LEAD_SUBJECT: Record<Locale, (player: string) => string> = {
  es: (p) => `Acceso desbloqueado: contacto de ${p}`,
  en: (p) => `Access unlocked: ${p}'s contact`,
  it: (p) => `Accesso sbloccato: contatto di ${p}`,
  pt: (p) => `Acesso desbloqueado: contato de ${p}`,
};

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
    const locale = await resolvePreferredLocale({ email: agencyEmail });
    const html = await renderTemplate("player_disconnect", {
      playerName,
      agencyName,
      recipientEmail: agencyEmail,
      locale,
    });
    await resend.emails.send({
      from: senderFrom,
      to: [agencyEmail],
      subject: DISCONNECT_SUBJECT[locale](playerName),
      html,
    });
  } catch (error) {
    console.error("[resend] sendPlayerDisconnectEmail:", error);
  }
}

// Dynamic subject (carries the player name) → localized per locale here, since
// `localizedSubject` only covers static subjects.
const DISCONNECT_SUBJECT: Record<Locale, (player: string) => string> = {
  es: (p) => `Notificación de desvinculación: ${p}`,
  en: (p) => `Representation ended: ${p}`,
  it: (p) => `Rappresentanza terminata: ${p}`,
  pt: (p) => `Representação encerrada: ${p}`,
};

// ============================================================================
// Billing transactionals
// ============================================================================

export async function sendSubscriptionWelcomeEmail(opts: {
  email: string;
  displayName: string;
  planId: "pro-player" | "pro-agency" | "pro-coach";
  formattedAmount: string;
  trialEndsAt: string | null;
  nextChargeAt: string | null;
}) {
  if (!resend) {
    console.log("[Resend Mock] Subscription welcome →", opts.email, opts.planId);
    return;
  }
  try {
    const locale = await resolvePreferredLocale({ email: opts.email });
    const html = await renderTemplate("subscription_welcome", {
      displayName: opts.displayName,
      planId: opts.planId,
      formattedAmount: opts.formattedAmount,
      trialEndsAt: opts.trialEndsAt,
      nextChargeAt: opts.nextChargeAt,
      dashboardUrl: dashboardUrl(),
      manageSubscriptionUrl: dashboardUrl("settings/subscription"),
      recipientEmail: opts.email,
      locale,
    });
    const subjectPlan =
      opts.planId === "pro-agency" ? "Pro Agency" : opts.planId === "pro-coach" ? "Pro DT" : "Pro Player";
    await resend.emails.send({
      from: senderFrom,
      to: [opts.email],
      subject: SUBSCRIPTION_SUBJECT[locale](subjectPlan),
      html,
    });
  } catch (error) {
    console.error("[resend] sendSubscriptionWelcomeEmail:", error);
  }
}

// Dynamic billing subjects (carry the plan tier / variant) → localized here.
const SUBSCRIPTION_SUBJECT: Record<Locale, (plan: string) => string> = {
  es: (p) => `Tu plan ${p} está activo`,
  en: (p) => `Your ${p} plan is active`,
  it: (p) => `Il tuo piano ${p} è attivo`,
  pt: (p) => `Seu plano ${p} está ativo`,
};

export async function sendCompGrantWelcomeEmail(opts: {
  email: string;
  displayName: string;
  planId: "pro-player" | "pro-agency" | "pro-coach";
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
    const locale = await resolvePreferredLocale({ email: opts.email });
    const html = await renderTemplate("comp_grant_welcome", {
      displayName: opts.displayName,
      planId: opts.planId,
      expiresAt: opts.expiresAt,
      variant: opts.variant,
      dashboardUrl: dashboardUrl(),
      manageSubscriptionUrl: dashboardUrl("settings/subscription"),
      recipientEmail: opts.email,
      locale,
    });
    const subjectPlan =
      opts.planId === "pro-agency" ? "Pro Agency" : opts.planId === "pro-coach" ? "Pro DT" : "Pro Player";
    await resend.emails.send({
      from: senderFrom,
      to: [opts.email],
      subject: COMP_GRANT_SUBJECT[locale](subjectPlan, opts.variant),
      html,
    });
  } catch (error) {
    console.error("[resend] sendCompGrantWelcomeEmail:", error);
  }
}

const COMP_GRANT_SUBJECT: Record<
  Locale,
  (plan: string, variant: "grant" | "extend") => string
> = {
  es: (p, v) =>
    v === "extend"
      ? `Extendimos tu cuenta de cortesía ${p}`
      : `Tu cuenta de cortesía ${p} está activa`,
  en: (p, v) =>
    v === "extend"
      ? `We extended your complimentary ${p} account`
      : `Your complimentary ${p} account is active`,
  it: (p, v) =>
    v === "extend"
      ? `Abbiamo esteso il tuo account omaggio ${p}`
      : `Il tuo account omaggio ${p} è attivo`,
  pt: (p, v) =>
    v === "extend"
      ? `Estendemos sua conta cortesia ${p}`
      : `Sua conta cortesia ${p} está ativa`,
};

export async function sendPaymentFailedEmail(opts: {
  email: string;
  displayName: string;
  planId: "pro-player" | "pro-agency" | "pro-coach";
  formattedAmount: string;
  nextRetryAt: string | null;
}) {
  if (!resend) {
    console.log("[Resend Mock] Payment failed →", opts.email, opts.planId);
    return;
  }
  try {
    const locale = await resolvePreferredLocale({ email: opts.email });
    const html = await renderTemplate("payment_failed", {
      displayName: opts.displayName,
      planId: opts.planId,
      formattedAmount: opts.formattedAmount,
      nextRetryAt: opts.nextRetryAt,
      updatePaymentUrl: dashboardUrl("settings/subscription"),
      recipientEmail: opts.email,
      locale,
    });
    await resend.emails.send({
      from: senderFrom,
      to: [opts.email],
      subject: localizedSubject("payment_failed", locale, "No pudimos cobrar tu suscripción"),
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
    const locale = await resolvePreferredLocale({ email: opts.authorEmail });
    const html = await renderTemplate("blog_post_approved_author", {
      authorName: opts.authorName,
      postTitle: opts.postTitle,
      clusterLabel: opts.clusterLabel,
      postUrl: blogPostUrl(opts.postSlug),
      authorHubUrl: opts.authorSlug ? blogAuthorHubUrl(opts.authorSlug) : undefined,
      recipientEmail: opts.authorEmail,
      locale,
    });
    await resend.emails.send({
      from: senderFrom,
      to: [opts.authorEmail],
      subject: BLOG_APPROVED_SUBJECT[locale](opts.postTitle),
      html,
    });
  } catch (error) {
    console.error("[resend] sendBlogPostApprovedAuthorEmail:", error);
  }
}

const BLOG_APPROVED_SUBJECT: Record<Locale, (title: string) => string> = {
  es: (t) => `Publicamos tu artículo: ${t}`,
  en: (t) => `We published your article: ${t}`,
  it: (t) => `Abbiamo pubblicato il tuo articolo: ${t}`,
  pt: (t) => `Publicamos seu artigo: ${t}`,
};

// ============================================================================
// Admin CRUD — staff corrected a player's profile
// ============================================================================

const ADMIN_CORRECTED_SUBJECT: Record<Locale, string> = {
  es: "Actualizamos tu perfil en 'BallersHub",
  en: "We updated your profile on 'BallersHub",
  it: "Abbiamo aggiornato il tuo profilo su 'BallersHub",
  pt: "Atualizamos seu perfil na 'BallersHub",
};

/**
 * Notifica al jugador que el staff corrigió/editó su perfil desde el CRUD admin.
 * El email es por dominio (datos, trayectoria, stats, palmarés, scouting, valor,
 * multimedia). Failure silenciosa — la action ya escribió en vivo, el email no
 * debe romperla. La resolución del email del jugador (auth.users) la hace el
 * caller (recordAdminPlayerEdit) vía service-role.
 */
export async function sendAdminProfileCorrectedEmail(opts: {
  email: string;
  playerName: string;
  domain: AdminEditDomain;
  note: string;
}) {
  if (!resend) {
    console.log("[Resend Mock] Admin profile corrected →", opts.email, opts.domain);
    return;
  }
  try {
    const locale = await resolvePreferredLocale({ email: opts.email });
    const editUrl = `${siteUrl.replace(/\/+$/, "")}${ADMIN_EDIT_DOMAIN_HREFS[opts.domain]}`;
    const html = await renderTemplate("admin_profile_corrected", {
      playerName: opts.playerName,
      sectionLabel: ADMIN_EDIT_DOMAIN_LABELS[opts.domain],
      note: opts.note,
      dashboardUrl: editUrl,
      recipientEmail: opts.email,
      locale,
    });
    await resend.emails.send({
      from: senderFrom,
      to: [opts.email],
      subject: ADMIN_CORRECTED_SUBJECT[locale] ?? ADMIN_CORRECTED_SUBJECT.es,
      html,
    });
  } catch (error) {
    console.error("[resend] sendAdminProfileCorrectedEmail:", error);
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
    const locale = await resolvePreferredLocale({ email: opts.authorEmail });
    const html = await renderTemplate("blog_post_rejected_author", {
      authorName: opts.authorName,
      postTitle: opts.postTitle,
      rejectionReason: opts.rejectionReason,
      editUrl: blogEditUrl(opts.postId),
      recipientEmail: opts.authorEmail,
      locale,
    });
    await resend.emails.send({
      from: senderFrom,
      to: [opts.authorEmail],
      subject: localizedSubject(
        "blog_post_rejected_author",
        locale,
        "Feedback editorial sobre tu artículo",
      ),
      html,
    });
  } catch (error) {
    console.error("[resend] sendBlogPostRejectedAuthorEmail:", error);
  }
}
