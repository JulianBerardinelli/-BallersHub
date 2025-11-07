import { z } from "zod";

const optionalTrimmedString = (options?: { max?: number }) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value, ctx) => {
      if (value === null || value === undefined) return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      if (options?.max && trimmed.length > options.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_big,
          type: "string",
          maximum: options.max,
          inclusive: true,
          message: `Ingresá un texto de hasta ${options.max} caracteres.`,
        });
        return z.NEVER;
      }
      return trimmed;
    })
    .nullable();

const optionalCountryCode = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.toUpperCase();
  })
  .nullable();

const optionalNumericField = (label: string, min: number, max: number) =>
  z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((value, ctx) => {
      if (value === null || value === undefined) return null;
      if (typeof value === "number") {
        if (Number.isNaN(value)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Ingresá un ${label.toLowerCase()} válido.` });
          return z.NEVER;
        }
        return value;
      }
      const trimmed = value.trim();
      if (!trimmed) return null;
      const numeric = Number(trimmed.replace(/,/g, "."));
      if (Number.isNaN(numeric)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Ingresá un ${label.toLowerCase()} válido.` });
        return z.NEVER;
      }
      return numeric;
    })
    .refine((value) => value === null || (value >= min && value <= max), {
      message: `${label} debe estar entre ${min} y ${max}.`,
    })
    .nullable();

const birthDateField = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value, ctx) => {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ingresá una fecha válida." });
      return z.NEVER;
    }
    return trimmed.slice(0, 10);
  })
  .nullable();

const languagesField = z
  .union([z.string(), z.array(z.string()), z.null(), z.undefined()])
  .transform((value, ctx) => {
    if (value === null || value === undefined) return [] as string[];
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0);
    }
    const parts = value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    if (parts.length > 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        type: "array",
        maximum: 8,
        inclusive: true,
        message: "Podés registrar hasta 8 idiomas.",
      });
      return z.NEVER;
    }
    return parts;
  })
  .refine((languages) => languages.every((lang) => lang.length <= 40), {
    message: "Cada idioma debe tener hasta 40 caracteres.",
  });

const nationalityCodesField = z
  .array(z.string().trim().length(2, "Seleccioná nacionalidades válidas.").transform((value) => value.toUpperCase()))
  .min(1, { message: "Seleccioná al menos una nacionalidad." })
  .max(3, { message: "Podés registrar hasta 3 nacionalidades." });

export const basicInfoSchema = z.object({
  playerId: z.string().uuid({ message: "Jugador no reconocido." }),
  fullName: z
    .string({ required_error: "Ingresá tu nombre completo." })
    .trim()
    .min(3, { message: "El nombre debe tener al menos 3 caracteres." })
    .max(120, { message: "El nombre debe tener como máximo 120 caracteres." }),
  birthDate: birthDateField,
  nationalityCodes: nationalityCodesField,
  residenceCity: optionalTrimmedString({ max: 120 }),
  residenceCountryCode: optionalCountryCode,
  heightCm: optionalNumericField("Altura", 120, 230),
  weightKg: optionalNumericField("Peso", 40, 150),
  bio: optionalTrimmedString({ max: 480 }),
});

export type BasicInfoInput = z.infer<typeof basicInfoSchema>;

export const contactInfoSchema = z.object({
  playerId: z.string().uuid({ message: "Jugador no reconocido." }),
  phone: optionalTrimmedString({ max: 48 }),
  languages: languagesField,
  documentType: optionalTrimmedString({ max: 60 }),
  documentNumber: optionalTrimmedString({ max: 60 }),
  documentCountryCode: optionalCountryCode,
});

export type ContactInfoInput = z.infer<typeof contactInfoSchema>;
