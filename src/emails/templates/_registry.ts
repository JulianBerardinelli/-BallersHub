import { render } from "@react-email/components";
import type { ReactElement } from "react";

import WelcomePlayerEmail, { type WelcomePlayerProps } from "./welcome-player";
import WelcomeAgencyEmail, { type WelcomeAgencyProps } from "./welcome-agency";
import LeadWelcomeEmail, { type LeadWelcomeProps } from "./lead-welcome";
import ProfileCompletionEmail, { type ProfileCompletionProps } from "./profile-completion";
import AgencyStaffInviteEmail, {
  type AgencyStaffInviteProps,
} from "./agency-staff-invite";
import PlayerAgencyInviteEmail, {
  type PlayerAgencyInviteProps,
} from "./player-agency-invite";
import PlayerDisconnectEmail, { type PlayerDisconnectProps } from "./player-disconnect";
import CustomBroadcastEmail, { type CustomBroadcastProps } from "./custom-broadcast";
import SubscriptionWelcomeEmail, {
  type SubscriptionWelcomeProps,
} from "./subscription-welcome";
import PaymentFailedEmail, { type PaymentFailedProps } from "./payment-failed";

/**
 * Template registry — every email shipped from BallersHub goes through here.
 *
 * Adding a template:
 *   1. Build the React component under `src/emails/templates/<name>.tsx`,
 *      composing only from `@/emails` primitives.
 *   2. Export `<Name>Props` so callers know what to pass.
 *   3. Register it below with a stable `templateKey` (snake_case).
 *
 * The `templateKey` is what `marketing_campaigns.template_key` stores.
 * Renaming the key = breaking historical campaign rows; treat them as
 * append-only and deprecate, don't rename.
 *
 * Categories:
 *   - "marketing": opt-in campaigns. Include unsubscribe.
 *   - "transactional": tied to a user action (invite, password reset).
 *     Don't go through the marketing dispatcher.
 */

export type TemplateKey =
  | "welcome_player"
  | "welcome_agency"
  | "lead_welcome"
  | "profile_completion"
  | "agency_staff_invite"
  | "player_agency_invite"
  | "player_disconnect"
  | "custom_broadcast"
  | "subscription_welcome"
  | "payment_failed";

export type TemplateCategory = "marketing" | "transactional";

export type TemplatePropsMap = {
  welcome_player: WelcomePlayerProps;
  welcome_agency: WelcomeAgencyProps;
  lead_welcome: LeadWelcomeProps;
  profile_completion: ProfileCompletionProps;
  agency_staff_invite: AgencyStaffInviteProps;
  player_agency_invite: PlayerAgencyInviteProps;
  player_disconnect: PlayerDisconnectProps;
  custom_broadcast: CustomBroadcastProps;
  subscription_welcome: SubscriptionWelcomeProps;
  payment_failed: PaymentFailedProps;
};

const components: { [K in TemplateKey]: (props: TemplatePropsMap[K]) => ReactElement } = {
  welcome_player: (props) => WelcomePlayerEmail(props),
  welcome_agency: (props) => WelcomeAgencyEmail(props),
  lead_welcome: (props) => LeadWelcomeEmail(props),
  profile_completion: (props) => ProfileCompletionEmail(props),
  agency_staff_invite: (props) => AgencyStaffInviteEmail(props),
  player_agency_invite: (props) => PlayerAgencyInviteEmail(props),
  player_disconnect: (props) => PlayerDisconnectEmail(props),
  custom_broadcast: (props) => CustomBroadcastEmail(props),
  subscription_welcome: (props) => SubscriptionWelcomeEmail(props),
  payment_failed: (props) => PaymentFailedEmail(props),
};

/** Render a registered template to its final HTML string. */
export async function renderTemplate<K extends TemplateKey>(
  key: K,
  props: TemplatePropsMap[K],
): Promise<string> {
  const Component = components[key];
  if (!Component) {
    throw new Error(`[emails] Unknown template key: ${key}`);
  }
  return render(Component(props));
}

/** Keys exposed for admin UI dropdowns / typeahead, in display order. */
export const TEMPLATE_DESCRIPTORS: Array<{
  key: TemplateKey;
  category: TemplateCategory;
  label: string;
  description: string;
}> = [
  {
    key: "welcome_player",
    category: "transactional",
    label: "Bienvenida — Jugador",
    description: "Onboarding inicial al recién registrarse como jugador.",
  },
  {
    key: "welcome_agency",
    category: "transactional",
    label: "Bienvenida — Agencia",
    description: "Onboarding inicial al recién registrarse como agencia/manager.",
  },
  {
    key: "lead_welcome",
    category: "marketing",
    label: "Lead capturado en portfolio",
    description: "Disparado cuando un visitante deja su email para desbloquear contactos.",
  },
  {
    key: "profile_completion",
    category: "marketing",
    label: "Completá tu perfil",
    description: "Recordatorio para usuarios registrados que aún no completaron su perfil.",
  },
  {
    key: "agency_staff_invite",
    category: "transactional",
    label: "Invitación de staff — Agencia",
    description: "Invitación de un manager para sumar a un nuevo staff member.",
  },
  {
    key: "player_agency_invite",
    category: "transactional",
    label: "Invitación de representación — Jugador",
    description: "Invitación de una agencia para representar a un jugador.",
  },
  {
    key: "player_disconnect",
    category: "transactional",
    label: "Notificación de desvinculación",
    description: "Notifica a la agencia que un jugador canceló la representación.",
  },
  {
    key: "custom_broadcast",
    category: "marketing",
    label: "Broadcast genérico",
    description:
      "Para campañas ad-hoc: definí eyebrow, headline, cuerpo y CTA opcional sin escribir código.",
  },
  {
    key: "subscription_welcome",
    category: "transactional",
    label: "Suscripción confirmada",
    description:
      "Disparado tras el primer checkout exitoso (Stripe o MP). Confirma trial, monto y próxima fecha de cobro.",
  },
  {
    key: "payment_failed",
    category: "transactional",
    label: "Cobro fallido",
    description:
      "Disparado cuando una factura de renovación no se pudo cobrar. Llama al usuario a actualizar el método de pago.",
  },
];
