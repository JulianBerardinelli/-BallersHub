import {
  EmailButton,
  EmailCard,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
} from "@/emails";
import type { Locale } from "@/i18n/routing";

export type AdminProfileCorrectedProps = {
  /** Display name del jugador (firstname-first si lo derivamos). */
  playerName: string;
  /** Frase específica del dominio (ADMIN_EDIT_DOMAIN_NOTICE[domain]) — ES. */
  notice: string;
  /** Labels de los campos editados (ES; puede venir vacío). */
  changedFields?: string[];
  /** URL al editor del dashboard correspondiente. */
  dashboardUrl: string;
  recipientEmail?: string;
  /** preferred_locale del jugador (resuelto en resend.ts). Default es. */
  locale?: Locale;
};

type Copy = {
  preheader: string;
  eyebrow: string;
  heading: (name: string) => string;
  intro: string;
  fieldsLabel: string;
  cta: string;
  footer: string;
};

const COPY: Record<Locale, Copy> = {
  es: {
    preheader: "Hicimos una corrección en tu perfil luego de una revisión.",
    eyebrow: "Actualización de tu perfil",
    heading: (n) => `Revisamos tu perfil, ${n}`,
    intro:
      "Nuestro equipo hizo una corrección en tu perfil luego de una revisión. Acá te dejamos el detalle:",
    fieldsLabel: "Campos actualizados",
    cta: "Ver mi perfil",
    footer:
      "Si tenés dudas sobre este cambio, respondé este correo y te ayudamos. Podés seguir editando tu perfil desde tu dashboard cuando quieras.",
  },
  en: {
    preheader: "We made a correction to your profile after a review.",
    eyebrow: "Profile update",
    heading: (n) => `We reviewed your profile, ${n}`,
    intro:
      "Our team made a correction to your profile after a review. Here's the detail:",
    fieldsLabel: "Updated fields",
    cta: "View my profile",
    footer:
      "If you have questions about this change, just reply to this email. You can keep editing your profile from your dashboard anytime.",
  },
  it: {
    preheader: "Abbiamo corretto il tuo profilo dopo una revisione.",
    eyebrow: "Aggiornamento del profilo",
    heading: (n) => `Abbiamo rivisto il tuo profilo, ${n}`,
    intro:
      "Il nostro team ha apportato una correzione al tuo profilo dopo una revisione. Ecco il dettaglio:",
    fieldsLabel: "Campi aggiornati",
    cta: "Vedi il mio profilo",
    footer:
      "Se hai domande su questa modifica, rispondi a questa email. Puoi continuare a modificare il tuo profilo dalla tua dashboard quando vuoi.",
  },
  pt: {
    preheader: "Fizemos uma correção no seu perfil após uma revisão.",
    eyebrow: "Atualização do seu perfil",
    heading: (n) => `Revisamos seu perfil, ${n}`,
    intro:
      "Nossa equipe fez uma correção no seu perfil após uma revisão. Aqui está o detalhe:",
    fieldsLabel: "Campos atualizados",
    cta: "Ver meu perfil",
    footer:
      "Se tiver dúvidas sobre essa alteração, responda este e-mail. Você pode continuar editando seu perfil no seu painel quando quiser.",
  },
};

/**
 * Notifica al jugador que el staff corrigió/editó su perfil desde el admin CRUD.
 *
 * Frame localizado por preferred_locale (resuelto en resend.ts; fallback es).
 * El `notice` específico del dominio y los `changedFields` llegan en ES desde
 * el servidor (igual que los blog templates dejan títulos verbatim).
 */
export default function AdminProfileCorrectedEmail({
  playerName,
  notice,
  changedFields = [],
  dashboardUrl,
  recipientEmail,
  locale = "es",
}: AdminProfileCorrectedProps) {
  const firstName = (playerName || "").split(" ")[0] || playerName || "";
  const c = COPY[locale] ?? COPY.es;

  return (
    <EmailLayout preheader={c.preheader} recipientEmail={recipientEmail}>
      <EmailEyebrow>{c.eyebrow}</EmailEyebrow>
      <EmailHeading level={1}>{c.heading(firstName)}</EmailHeading>

      <EmailParagraph>{c.intro}</EmailParagraph>

      <EmailCard>
        <EmailParagraph tone="default">
          <strong>{notice}</strong>
        </EmailParagraph>
        {changedFields.length > 0 && (
          <EmailParagraph tone="muted">
            {c.fieldsLabel}: {changedFields.join(", ")}.
          </EmailParagraph>
        )}
      </EmailCard>

      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <EmailButton href={dashboardUrl} variant="lime">
          {c.cta}
        </EmailButton>
      </div>

      <EmailDivider tone="subtle" spacing={28} />

      <EmailParagraph tone="muted">{c.footer}</EmailParagraph>
    </EmailLayout>
  );
}
