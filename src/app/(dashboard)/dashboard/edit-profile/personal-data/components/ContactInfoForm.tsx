"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Controller, useForm, type UseFormSetError } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { updateContactInfo } from "../actions";
import { contactInfoSchema, type ContactInfoInput } from "../schemas";
import type { CountryOption } from "./BasicInfoForm";

const inputClassName =
  "w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-700 disabled:cursor-not-allowed disabled:opacity-60";

const labelClassName = "space-y-1.5 text-sm text-neutral-300";
const labelTitleClassName = "font-medium text-neutral-200";

type Props = {
  playerId: string;
  email: string | null;
  phone: string | null;
  languages: string[] | null;
  documentType: string | null;
  documentNumber: string | null;
  documentCountryCode: string | null;
  countries: CountryOption[];
};

type FormValues = {
  phone: string;
  languages: string;
  documentType: string;
  documentNumber: string;
  documentCountryCode: string;
};

type StatusState = { type: "success" | "error"; message: string } | null;

export default function ContactInfoForm({
  playerId,
  email,
  phone,
  languages,
  documentType,
  documentNumber,
  documentCountryCode,
  countries,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusState>(null);
  const [pending, startTransition] = useTransition();

  const defaultValues = useMemo<FormValues>(
    () => ({
      phone: phone ?? "",
      languages: Array.isArray(languages) ? languages.join(", ") : "",
      documentType: documentType ?? "",
      documentNumber: documentNumber ?? "",
      documentCountryCode: documentCountryCode ?? "",
    }),
    [phone, languages, documentType, documentNumber, documentCountryCode],
  );

  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const sortedCountries = useMemo(
    () => [...countries].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [countries],
  );

  const onSubmit = handleSubmit((values) => {
    setStatus(null);

    const parsed = contactInfoSchema.safeParse({
      playerId,
      phone: values.phone,
      languages: values.languages,
      documentType: values.documentType,
      documentNumber: values.documentNumber,
      documentCountryCode: values.documentCountryCode,
    });

    if (!parsed.success) {
      reflectValidationErrors(parsed.error, setError, setStatus);
      return;
    }

    startTransition(async () => {
      const result = await updateContactInfo(parsed.data);
      if (!result.success) {
        setStatus({ type: "error", message: result.message });
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            if (!message) return;
            if (!(field in values)) return;
            setError(field as keyof FormValues, { type: "manual", message });
          });
        }
        return;
      }

      const sanitizedValues: FormValues = {
        phone: parsed.data.phone ?? "",
        languages: parsed.data.languages.join(", "),
        documentType: parsed.data.documentType ?? "",
        documentNumber: parsed.data.documentNumber ?? "",
        documentCountryCode: parsed.data.documentCountryCode ?? "",
      };

      setStatus({ type: "success", message: "Datos de contacto actualizados." });
      reset(sanitizedValues);
      router.refresh();
    });
  });

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClassName}>
          <span className={labelTitleClassName}>Email principal</span>
          <input
            type="email"
            value={email ?? ""}
            readOnly
            className={`${inputClassName} text-neutral-400`}
          />
          <HelperText>Gestioná tu email desde Configuración &gt; Cuenta.</HelperText>
        </label>
        <label className={labelClassName}>
          <span className={labelTitleClassName}>Teléfono de contacto</span>
          <input
            {...register("phone")}
            type="tel"
            placeholder="Ej: +34 600 000 000"
            className={inputClassName}
            disabled={pending}
          />
          {errors.phone ? <FieldError message={errors.phone.message} /> : null}
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClassName}>
          <span className={labelTitleClassName}>Idiomas</span>
          <input
            {...register("languages")}
            type="text"
            placeholder="Ej: Español, Inglés"
            className={inputClassName}
            disabled={pending}
          />
          <HelperText>Separá cada idioma con coma. Máximo 8 idiomas.</HelperText>
          {errors.languages ? <FieldError message={errors.languages.message} /> : null}
        </label>
        <label className={labelClassName}>
          <span className={labelTitleClassName}>Tipo de documento</span>
          <input
            {...register("documentType")}
            type="text"
            placeholder="Ej: Pasaporte UE"
            className={inputClassName}
            disabled={pending}
          />
          {errors.documentType ? <FieldError message={errors.documentType.message} /> : null}
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClassName}>
          <span className={labelTitleClassName}>Número de documento</span>
          <input
            {...register("documentNumber")}
            type="text"
            placeholder="Ej: AA123456"
            className={inputClassName}
            disabled={pending}
          />
          {errors.documentNumber ? <FieldError message={errors.documentNumber.message} /> : null}
        </label>
        <Controller
          control={control}
          name="documentCountryCode"
          render={({ field }) => (
            <label className={labelClassName}>
              <span className={labelTitleClassName}>País emisor</span>
              <select
                value={field.value ?? ""}
                onChange={(event) => field.onChange(event.target.value)}
                className={inputClassName}
                disabled={pending}
              >
                <option value="">Seleccioná un país</option>
                {sortedCountries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
              <HelperText>Indica el país que emite tu documento principal.</HelperText>
              {errors.documentCountryCode ? <FieldError message={errors.documentCountryCode.message} /> : null}
            </label>
          )}
        />
      </div>

      {status ? <FormStatus status={status} /> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="inline-flex items-center rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
        >
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={() => {
            reset();
            setStatus(null);
          }}
          className="inline-flex items-center rounded-md border border-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-300 transition hover:border-neutral-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending || !isDirty}
        >
          Restablecer
        </button>
      </div>
    </form>
  );
}

function reflectValidationErrors(
  error: z.ZodError<ContactInfoInput>,
  setError: UseFormSetError<FormValues>,
  setStatus: (status: StatusState) => void,
) {
  const fieldErrors = error.flatten().fieldErrors as FlattenFieldErrors<ContactInfoInput>;
  Object.entries(fieldErrors).forEach(([field, messages]) => {
    if (!messages || messages.length === 0) return;
    if (field === "playerId") return;
    setError(field as keyof FormValues, { type: "manual", message: messages[0] });
  });
  setStatus({ type: "error", message: "Revisá los datos del formulario." });
}

type FlattenFieldErrors<T> = ReturnType<z.ZodError<T>["flatten"]>["fieldErrors"];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-400">{message}</p>;
}

function HelperText({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="text-xs text-neutral-500">{children}</p>;
}

function FormStatus({ status }: { status: StatusState }) {
  const baseClass = "rounded-md border px-3 py-2 text-xs font-medium";
  const variantClass =
    status.type === "success"
      ? "border-emerald-800 bg-emerald-900/20 text-emerald-300"
      : "border-red-900/60 bg-red-950/40 text-red-300";
  return <p className={`${baseClass} ${variantClass}`}>{status.message}</p>;
}
