// Enlaces externos del coach (taxonomía + validador). Espeja el modelo de
// player_links (kinds + schema zod) pero acotado a los kinds que ya tiene
// estilados el portfolio público (EXT_THEMES en CoachFreeLayout.tsx §04 y la
// fila branded del CoachBioModule Pro): transfermarkt, instagram, youtube,
// linkedin, twitter y custom.
//
// Server + client safe — sin importes con efectos. La action server-only
// (src/app/actions/coach-links.ts) reusa este schema; el manager client lo
// reusa para validar antes de llamar la action.

import { z } from "zod";

export const COACH_LINK_KINDS = [
  "transfermarkt",
  "instagram",
  "youtube",
  "linkedin",
  "twitter",
  "custom",
] as const;

export type CoachLinkKind = (typeof COACH_LINK_KINDS)[number];

// Para tener parámetros estables aunque entre algo legacy (ej. "besoccer" o
// "highlight" si llegasen a aparecer): los aceptamos pero la UI los mapea a
// "custom" para el render.
export function isCoachLinkKind(value: unknown): value is CoachLinkKind {
  return (
    typeof value === "string" &&
    (COACH_LINK_KINDS as readonly string[]).includes(value)
  );
}

export const coachLinkMutationSchema = z.object({
  id: z.string().uuid("El identificador es inválido.").optional(),
  label: z
    .union([z.string().trim().max(120, "Máximo 120 caracteres."), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
    .nullable(),
  url: z
    .string({ message: "Ingresá una URL válida." })
    .trim()
    .url({ message: "Ingresá una URL válida." })
    // Sin javascript:/data: en URLs públicas (XSS al renderizar como href).
    .refine((v) => /^https?:\/\//i.test(v), {
      message: "El enlace debe empezar con http:// o https://.",
    }),
  kind: z.enum(COACH_LINK_KINDS, {
    message: "Seleccioná un tipo de enlace.",
  }),
  isPrimary: z.boolean().optional().default(false),
});

export type CoachLinkMutationInput = z.infer<typeof coachLinkMutationSchema>;

// Labels en español (locale nativo). El editor del dashboard del coach corre
// 100% en es por convención del módulo (igual que methodology/licencias).
export const COACH_LINK_LABELS_ES: Record<CoachLinkKind, string> = {
  transfermarkt: "Transfermarkt",
  instagram: "Instagram",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  custom: "Sitio web",
};

export const COACH_LINK_DESCRIPTIONS_ES: Record<CoachLinkKind, string> = {
  transfermarkt: "Perfil oficial del entrenador en Transfermarkt.",
  instagram: "Perfil personal o profesional en Instagram.",
  youtube: "Canal con clips, charlas o entrenamientos.",
  linkedin: "Perfil profesional en LinkedIn.",
  twitter: "Perfil en X / Twitter.",
  custom: "Cualquier otro sitio: blog, podcast, página personal, etc.",
};
