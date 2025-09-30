export type LockAction = {
  label: string;
  href: string;
  tone?: "primary" | "warning";
};

export type SectionLock = {
  title: string;
  description: string;
  action?: LockAction;
};

export type DashboardAccess = {
  canEditProfile: boolean;
  canEditTemplate: boolean;
  profileLock: SectionLock | null;
  templateLock: SectionLock | null;
};

export function resolveDashboardAccess(options: {
  profileStatus: string | null;
  hasProfile: boolean;
  applicationStatus: string | null;
}): DashboardAccess {
  const { profileStatus, hasProfile, applicationStatus } = options;

  if (!hasProfile) {
    const lock: SectionLock = {
      title: "Perfil de jugador no disponible",
      description:
        "Necesitás iniciar el onboarding para desbloquear la edición de datos personales, deportivos y multimedia.",
      action: { label: "Crear perfil", href: "/onboarding/start", tone: "primary" },
    };

    const templateLock: SectionLock = {
      title: "Plantillas bloqueadas",
      description:
        "La personalización de tu CV estará disponible una vez que generes y aprueben tu perfil de jugador.",
      action: { label: "Comenzar onboarding", href: "/onboarding/start", tone: "primary" },
    };

    return {
      canEditProfile: false,
      canEditTemplate: false,
      profileLock: lock,
      templateLock,
    };
  }

  switch (profileStatus) {
    case "approved":
      return {
        canEditProfile: true,
        canEditTemplate: true,
        profileLock: null,
        templateLock: null,
      };
    case "pending_review": {
      const action: LockAction = {
        label: "Ver solicitud",
        href: "/onboarding/player/apply",
        tone: "primary",
      };
      const lock: SectionLock = {
        title: "Solicitud en revisión",
        description:
          "Nuestro equipo está validando la información enviada. Te avisaremos cuando puedas continuar con la edición.",
        action,
      };
      const templateLock: SectionLock = {
        title: "Edición temporalmente deshabilitada",
        description:
          "Esperá la aprobación de tu perfil para ajustar la plantilla y el contenido multimedia.",
        action,
      };
      return {
        canEditProfile: false,
        canEditTemplate: false,
        profileLock: lock,
        templateLock,
      };
    }
    case "rejected": {
      const action: LockAction = {
        label: "Reabrir onboarding",
        href: "/onboarding/start",
        tone: "warning",
      };
      const lock: SectionLock = {
        title: "Solicitud rechazada",
        description:
          "Revisá los comentarios del equipo y reenviá tu solicitud para volver a habilitar la edición de tu perfil.",
        action,
      };
      const templateLock: SectionLock = {
        title: "Plantilla bloqueada",
        description:
          "Una vez que corrijas la información y el perfil sea aprobado vas a poder personalizar la plantilla.",
        action,
      };
      return {
        canEditProfile: false,
        canEditTemplate: false,
        profileLock: lock,
        templateLock,
      };
    }
    case "draft":
    default: {
      const hasSubmittedApplication = applicationStatus != null;
      const action: LockAction = {
        label: hasSubmittedApplication ? "Continuar solicitud" : "Comenzar onboarding",
        href: hasSubmittedApplication ? "/onboarding/player/apply" : "/onboarding/start",
        tone: "primary",
      };
      const lock: SectionLock = {
        title: "Perfil en borrador",
        description:
          "Completá los pasos pendientes del onboarding para habilitar la edición de datos personales y multimedia.",
        action,
      };
      const templateLock: SectionLock = {
        title: "Plantilla pendiente",
        description:
          "Necesitás finalizar los datos críticos de tu perfil antes de elegir estilos o activar secciones públicas.",
        action,
      };
      return {
        canEditProfile: false,
        canEditTemplate: false,
        profileLock: lock,
        templateLock,
      };
    }
  }
}
