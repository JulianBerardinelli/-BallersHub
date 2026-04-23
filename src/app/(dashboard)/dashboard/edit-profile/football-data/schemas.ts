import { z } from "zod";

export const LINK_KINDS = [
  "highlight",
  "transfermarkt",
  "besoccer",
  "flashscore",
  "youtube",
  "instagram",
  "linkedin",
  "custom",
] as const;

export type LinkKind = (typeof LINK_KINDS)[number];

export const linkMutationSchema = z.object({
  id: z.string().uuid({ message: "El identificador es inválido." }).optional(),
  playerId: z.string().uuid({ message: "Jugador no reconocido." }),
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
    .url({ message: "Ingresá una URL válida." }),
  kind: z.enum(LINK_KINDS, {
    message: "Seleccioná un tipo de enlace.",
  }),
  isPrimary: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type LinkMutationInput = z.infer<typeof linkMutationSchema>;

const optionalUuid = (message: string) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value, ctx) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      const parsed = z.string().uuid({ message }).safeParse(trimmed);
      if (!parsed.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
        return z.NEVER;
      }
      return parsed.data;
    })
    .nullable();

export const honourMutationSchema = z.object({
  id: z.string().uuid({ message: "El identificador es inválido." }).optional(),
  playerId: z.string().uuid({ message: "Jugador no reconocido." }),
  title: z
    .string({ message: "Ingresá un título." })
    .trim()
    .min(3, "El título debe tener al menos 3 caracteres."),
  competition: z
    .union([z.string().trim().max(120, "Máximo 120 caracteres."), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
    .nullable(),
  season: z
    .union([z.string().trim().max(32, "Máximo 32 caracteres."), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
    .nullable(),
  awardedOn: z
    .union([z.string().trim(), z.literal(""), z.null(), z.undefined()])
    .transform((value, ctx) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (trimmed.length === 0) return null;
      const date = new Date(trimmed);
      if (Number.isNaN(date.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ingresá una fecha válida.",
        });
        return z.NEVER;
      }
      return trimmed;
    })
    .nullable(),
  description: z
    .union([z.string().trim().max(280, "Máximo 280 caracteres."), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
    .nullable(),
  careerItemId: optionalUuid("Seleccioná una etapa de trayectoria válida."),
});

export type HonourMutationInput = z.infer<typeof honourMutationSchema>;

const numericField = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") return Number.isNaN(value) ? null : value;
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    const numeric = Number(trimmed.replace(/,/g, "."));
    return Number.isNaN(numeric) ? NaN : numeric;
  })
  .refine((value) => value === null || (!Number.isNaN(value) && value >= 0), {
    message: "Ingresá un número válido mayor o igual a 0.",
  })
  .nullable();

export const seasonStatMutationSchema = z.object({
  id: z.string().uuid({ message: "El identificador es inválido." }).optional(),
  playerId: z.string().uuid({ message: "Jugador no reconocido." }),
  season: z
    .string({ message: "Indicá la temporada." })
    .trim()
    .min(3, "La temporada debe tener al menos 3 caracteres."),
  competition: z
    .union([z.string().trim().max(120, "Máximo 120 caracteres."), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
    .nullable(),
  team: z
    .union([z.string().trim().max(120, "Máximo 120 caracteres."), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
    .nullable(),
  matches: numericField,
  starts: numericField,
  minutes: numericField,
  goals: numericField,
  assists: numericField,
  yellowCards: numericField,
  redCards: numericField,
  careerItemId: optionalUuid("Seleccioná la temporada asociada a tu trayectoria."),
}).superRefine((data, ctx) => {
  if (data.matches && data.minutes) {
    if (data.minutes > data.matches * 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Demasiados minutos para la cantidad de partidos (máx aprox. 100 min/partido).",
        path: ["minutes"],
      });
    }
  }

  if (data.matches !== null && data.matches !== undefined && data.starts !== null && data.starts !== undefined) {
    if (data.starts > data.matches) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Las titularidades no pueden superar los partidos jugados.",
        path: ["starts"],
      });
    }
  }
});

export type SeasonStatMutationInput = z.infer<typeof seasonStatMutationSchema>;

const yearField = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") {
      return Number.isNaN(value) ? null : Math.trunc(value);
    }
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed);
    return Number.isNaN(numeric) ? NaN : Math.trunc(numeric);
  })
  .refine((value) => value === null || (!Number.isNaN(value) && value >= 1900 && value <= new Date().getFullYear() + 1), {
    message: "Ingresá un año válido.",
  })
  .nullable();

export const careerStageInputSchema = z.object({
  id: z.string().uuid().optional(),
  originalId: optionalUuid("Etapa original inválida."),
  club: z
    .string({ message: "Ingresá el nombre del club." })
    .trim()
    .min(2, "El club debe tener al menos 2 caracteres."),
  division: z
    .union([z.string().trim().max(120, "Máximo 120 caracteres."), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (!value) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
    .nullable(),
  divisionId: optionalUuid("Seleccioná una división válida."),
  startYear: yearField,
  endYear: yearField,
  teamId: optionalUuid("Seleccioná un equipo válido."),
  proposedTeam: z
    .union([
      z.object({
        name: z
          .string({ message: "Ingresá el nombre del equipo." })
          .trim()
          .min(2, "El nombre debe tener al menos 2 caracteres."),
        countryCode: z
          .union([z.string().length(2), z.null(), z.undefined()])
          .transform((value, ctx) => {
            if (!value) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Seleccioná el país del equipo." });
              return z.NEVER;
            }
            return value.toUpperCase();
          }),
        countryName: z
          .union([z.string().trim().max(80), z.null(), z.undefined()])
          .transform((value) => {
            if (!value) return null;
            const trimmed = value.trim();
            return trimmed.length === 0 ? null : trimmed;
          })
          .nullable(),
        transfermarktUrl: z
          .union([z.string().trim(), z.null(), z.undefined()])
          .transform((value, ctx) => {
            if (!value) return null;
            const trimmed = value.trim();
            if (!trimmed) return null;
            if (!/^https?:\/\/[^ "<>]+$/i.test(trimmed)) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ingresá una URL válida de Transfermarkt." });
              return z.NEVER;
            }
            return trimmed;
          })
          .nullable(),
      }),
      z.null(),
      z.undefined(),
    ])
    .nullable(),
});

export type CareerStageInput = z.infer<typeof careerStageInputSchema>;

export const careerRevisionSubmissionSchema = z
  .object({
    playerId: z.string().uuid({ message: "Jugador no reconocido." }),
    items: z.array(careerStageInputSchema),
    note: z
      .union([z.string().trim().max(500, "Máximo 500 caracteres."), z.literal(""), z.null(), z.undefined()])
      .transform((value) => {
        if (!value) return null;
        const trimmed = value.trim();
        return trimmed.length === 0 ? null : trimmed;
      })
      .nullable(),
    stats: z.array(seasonStatMutationSchema).optional(),
  })
  .refine(
    (data) => {
      const hasItems = data.items.length > 0;
      const hasStats = data.stats && data.stats.length > 0;
      return hasItems || hasStats;
    },
    {
      message: "Tenés que agregar al menos una etapa de trayectoria o estadística para enviar a revisión.",
      path: ["items"],
    },
  );

export type CareerRevisionSubmissionInput = z.infer<typeof careerRevisionSubmissionSchema>;
