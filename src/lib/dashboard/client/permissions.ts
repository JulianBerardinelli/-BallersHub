import {
  hasActiveApplication,
  isApplicationApproved,
  isApplicationDraft,
  isApplicationRejected,
  normalizeApplicationStatus,
} from "./application-status";

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
  const normalizedApplicationStatus = normalizeApplicationStatus(applicationStatus);

  if (!hasProfile) {
    const profileLock = resolveProfilelessLock(normalizedApplicationStatus);
    const templateLock = resolveProfilelessTemplateLock(normalizedApplicationStatus);

    return {
      canEditProfile: false,
      canEditTemplate: false,
      profileLock,
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

function resolveProfilelessLock(status: string | null): SectionLock {
  if (hasActiveApplication(status)) {
    return {
      title: "Solicitud en revisión",
      description:
        "Ya recibimos tu información y nuestro equipo la está evaluando. Te avisaremos por mail cuando puedas continuar.",
      action: { label: "Ver solicitud", href: "/onboarding/player/apply", tone: "primary" },
    };
  }

  if (isApplicationDraft(status)) {
    return {
      title: "Solicitud en progreso",
      description:
        "Retomá el onboarding desde donde lo dejaste para completar los datos obligatorios y enviar tu perfil a revisión.",
      action: { label: "Continuar onboarding", href: "/onboarding/player/apply", tone: "primary" },
    };
  }

  if (isApplicationRejected(status)) {
    return {
      title: "Solicitud rechazada",
      description:
        "Podés revisar los comentarios del equipo y volver a enviar tu perfil cuando hayas realizado los ajustes necesarios.",
      action: { label: "Reabrir onboarding", href: "/onboarding/start", tone: "warning" },
    };
  }

  if (isApplicationApproved(status)) {
    return {
      title: "Solicitud aprobada",
      description:
        "Estamos generando tu perfil profesional. En los próximos minutos vas a poder acceder a las secciones de edición.",
      action: { label: "Ir al dashboard", href: "/dashboard", tone: "primary" },
    };
  }

  return {
    title: "Perfil de jugador no disponible",
    description:
      "Necesitás iniciar el onboarding para desbloquear la edición de datos personales, deportivos y multimedia.",
    action: { label: "Crear perfil", href: "/onboarding/start", tone: "primary" },
  };
}

function resolveProfilelessTemplateLock(status: string | null): SectionLock {
  if (hasActiveApplication(status)) {
    return {
      title: "Plantilla en espera",
      description:
        "La personalización quedará habilitada una vez que finalice la revisión de tu solicitud y se cree tu perfil de jugador.",
      action: { label: "Ver solicitud", href: "/onboarding/player/apply", tone: "primary" },
    };
  }

  if (isApplicationDraft(status)) {
    return {
      title: "Completá tu solicitud",
      description:
        "Terminá los pasos críticos del onboarding antes de elegir estilos o activar secciones del CV público.",
      action: { label: "Continuar onboarding", href: "/onboarding/player/apply", tone: "primary" },
    };
  }

  if (isApplicationRejected(status)) {
    return {
      title: "Plantilla bloqueada",
      description:
        "Necesitás reenviar la solicitud con la información corregida para volver a habilitar la configuración de tu CV.",
      action: { label: "Reabrir onboarding", href: "/onboarding/start", tone: "warning" },
    };
  }

  if (isApplicationApproved(status)) {
    return {
      title: "Perfil en preparación",
      description:
        "En breve podrás personalizar estilos y bloques. Refrescá el dashboard cuando recibas la confirmación de publicación.",
      action: { label: "Ver resumen", href: "/dashboard", tone: "primary" },
    };
  }

  return {
    title: "Plantillas bloqueadas",
    description:
      "La personalización de tu CV estará disponible una vez que generes y aprueben tu perfil de jugador.",
    action: { label: "Comenzar onboarding", href: "/onboarding/start", tone: "primary" },
  };
}
