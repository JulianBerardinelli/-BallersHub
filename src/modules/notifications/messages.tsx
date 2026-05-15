import { Fragment, type ReactNode } from "react";

import { NotificationTemplate, NotificationTemplateKey } from "./types";

const displayName = (name?: string) => (name ? `${name}, ` : "");

const formatFieldList = (fields: string[]): ReactNode => {
  if (fields.length === 0) return null;

  return fields.map((field, index) => {
    const isLast = index === fields.length - 1;
    const isPenultimate = index === fields.length - 2;
    const separator = isLast ? "" : isPenultimate ? " y " : ", ";

    return (
      <Fragment key={`${field}-${index}`}>
        <strong>{field}</strong>
        {separator}
      </Fragment>
    );
  });
};

export const notificationTemplates: {
  [K in NotificationTemplateKey]: NotificationTemplate<K>;
} = {
  "onboarding.submitted": {
    key: "onboarding.submitted",
    category: "onboarding",
    tone: "info",
    headline: ({ userName }) => `${displayName(userName)}tu perfil está en revisión ✨`,
    body: () =>
      "Recibimos tu solicitud de onboarding. Nuestro equipo revisará tu información y te avisaremos apenas tengamos novedades.",
    details: ({ requestId }) =>
      requestId ? `ID de solicitud: ${requestId}` : undefined,
    expandable: false,
  },
  "onboarding.approved": {
    key: "onboarding.approved",
    category: "onboarding",
    tone: "success",
    headline: ({ userName }) => `${displayName(userName)}¡tu perfil fue aprobado! 🥳`,
    body: () =>
      "Felicitaciones, ya sos parte de BallersHub. Ingresá a tu panel para completar el resto de tu información y potenciar tu perfil.",
    cta: ({ dashboardHref }) => ({
      label: "Ir al dashboard",
      href: dashboardHref ?? "/dashboard",
    }),
    details: ({ requestId }) =>
      requestId ? `Solicitud aprobada · Referencia ${requestId}` : undefined,
    expandable: false,
  },
  "onboarding.rejected": {
    key: "onboarding.rejected",
    category: "onboarding",
    tone: "danger",
    headline: ({ userName }) => `${displayName(userName)}tu solicitud necesita ajustes ⚠️`,
    body: () =>
      "Analizamos tu solicitud y detectamos algunos puntos a corregir. Podés revisarla y enviarla nuevamente cuando quieras.",
    details: ({ moderatorMessage }) => moderatorMessage,
    cta: ({ retryHref }) => ({
      label: "Revisar solicitud",
      href: retryHref ?? "/onboarding",
    }),
    expandable: true,
  },
  "review.submitted": {
    key: "review.submitted",
    category: "review",
    tone: "info",
    headline: ({ userName, topicLabel }) =>
      `${displayName(userName)}estamos revisando tu actualización de ${topicLabel} 🔍`,
    body: () =>
      "Recibimos tu pedido de revisión y nuestro equipo ya lo está analizando. Te avisaremos ni bien tengamos una resolución.",
    details: ({ requestId }) =>
      requestId ? `Seguimiento interno: ${requestId}` : undefined,
    expandable: false,
  },
  "review.approved": {
    key: "review.approved",
    category: "review",
    tone: "success",
    headline: ({ userName, topicLabel }) =>
      `${displayName(userName)}tu actualización de ${topicLabel} fue aprobada ✅`,
    body: () =>
      "Ya podés ver los cambios reflejados en tu perfil. Seguimos construyendo tu trayectoria juntos.",
    cta: ({ detailsHref }) => ({
      label: "Ver cambios",
      href: detailsHref ?? "/dashboard/edit-profile/football-data",
    }),
    details: ({ requestId }) =>
      requestId ? `Resolución registrada con el ID ${requestId}` : undefined,
    expandable: false,
  },
  "review.rejected": {
    key: "review.rejected",
    category: "review",
    tone: "warning",
    headline: ({ userName, topicLabel }) =>
      `${displayName(userName)}no pudimos aprobar tu ${topicLabel} 🙈`,
    body: () =>
      "Revisá los comentarios y volvé a enviarnos la información cuando estés listo. Estamos para ayudarte.",
    details: ({ moderatorMessage }) => moderatorMessage,
    cta: ({ retryHref }) => ({
      label: "Intentar nuevamente",
      href: retryHref ?? "/dashboard/edit-profile/football-data",
    }),
    expandable: true,
  },
  "announcement.general": {
    key: "announcement.general",
    category: "announcement",
    tone: "info",
    headline: ({ headline, userName }) =>
      headline ?? `${displayName(userName)}tenemos novedades para vos 📣`,
    body: ({ body }) => body,
    cta: ({ ctaHref, ctaLabel }) =>
      ctaHref && ctaLabel ? { label: ctaLabel, href: ctaHref } : undefined,
    expandable: true,
  },
  "profile.updated": {
    key: "profile.updated",
    category: "profile",
    tone: "success",
    headline: ({ userName, sectionLabel }) =>
      `${displayName(userName)}Actualizaste ${sectionLabel} ✅`,
    body: ({ changedFields }) => {
      const list = formatFieldList(changedFields);
      if (!list) {
        return "Guardamos tu información sin cambios detectados.";
      }

      if (changedFields.length === 1) {
        return <>
          Se actualizó {list} correctamente.
        </>;
      }

      return <>
        Se actualizaron {changedFields.length} datos: {list}.
      </>;
    },
    details: ({ changedFields }) => {
      if (changedFields.length <= 1) return undefined;
      return <>
        Campos editados: {formatFieldList(changedFields)}.
      </>;
    },
    expandable: false,
  },
};
