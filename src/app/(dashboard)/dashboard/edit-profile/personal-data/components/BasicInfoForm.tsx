"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Controller, useForm, type UseFormSetError } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { updateBasicInfo } from "../actions";
import { basicInfoSchema, type BasicInfoInput } from "../schemas";

const inputClassName =
  "w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-700 disabled:cursor-not-allowed disabled:opacity-60";

const labelClassName = "space-y-1.5 text-sm text-neutral-300";
const labelTitleClassName = "font-medium text-neutral-200";

export type CountryOption = { code: string; name: string };

type Props = {
  playerId: string;
  fullName: string;
  birthDate: string | null;
  nationalityCodes: string[];
  residenceCity: string | null;
  residenceCountryCode: string | null;
  heightCm: number | null;
  weightKg: number | null;
  bio: string | null;
  countries: CountryOption[];
};

type FormValues = {
  fullName: string;
  birthDate: string;
  nationalityCodes: string[];
  residenceCity: string;
  residenceCountryCode: string;
  heightCm: string;
  weightKg: string;
  bio: string;
};

type StatusState = { type: "success" | "error"; message: string } | null;

export default function BasicInfoForm({
  playerId,
  fullName,
  birthDate,
  nationalityCodes,
  residenceCity,
  residenceCountryCode,
  heightCm,
  weightKg,
  bio,
  countries,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusState>(null);
  const [pending, startTransition] = useTransition();

  const defaultValues = useMemo<FormValues>(
    () => ({
      fullName: fullName ?? "",
      birthDate: birthDate ?? "",
      nationalityCodes: nationalityCodes && nationalityCodes.length > 0 ? nationalityCodes : [],
      residenceCity: residenceCity ?? "",
      residenceCountryCode: residenceCountryCode ?? "",
      heightCm: heightCm != null ? String(heightCm) : "",
      weightKg: weightKg != null ? String(weightKg) : "",
      bio: bio ?? "",
    }),
    [fullName, birthDate, nationalityCodes, residenceCity, residenceCountryCode, heightCm, weightKg, bio],
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

    const parsed = basicInfoSchema.safeParse({
      playerId,
      fullName: values.fullName,
      birthDate: values.birthDate,
      nationalityCodes: values.nationalityCodes,
      residenceCity: values.residenceCity,
      residenceCountryCode: values.residenceCountryCode,
      heightCm: values.heightCm,
      weightKg: values.weightKg,
      bio: values.bio,
    });

    if (!parsed.success) {
      reflectValidationErrors(parsed.error, setError, setStatus);
      return;
    }

    const sanitizedValues = toFormValues(parsed.data);

    startTransition(async () => {
      const result = await updateBasicInfo(parsed.data);
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

      setStatus({ type: "success", message: "Información básica actualizada." });
      reset(sanitizedValues);
      router.refresh();
    });
  });

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClassName}>
          <span className={labelTitleClassName}>Nombre completo</span>
          <input
            {...register("fullName")}
            type="text"
            placeholder="Ej: Lionel Andrés Messi"
            className={inputClassName}
            disabled={pending}
          />
          {errors.fullName ? <FieldError message={errors.fullName.message} /> : null}
        </label>
        <label className={labelClassName}>
          <span className={labelTitleClassName}>Fecha de nacimiento</span>
          <input
            {...register("birthDate")}
            type="date"
            className={inputClassName}
            max={new Date().toISOString().slice(0, 10)}
            disabled={pending}
          />
          {errors.birthDate ? <FieldError message={errors.birthDate.message} /> : null}
        </label>
      </div>

      <Controller
        control={control}
        name="nationalityCodes"
        render={({ field }) => (
          <div className="grid gap-2">
            <label className="text-sm font-medium text-neutral-200">Nacionalidades</label>
            <select
              multiple
              value={field.value}
              onChange={(event) => {
                const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
                field.onChange(selected);
              }}
              className={`${inputClassName} h-40`}
              disabled={pending}
            >
              {sortedCountries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
            <HelperText>Podés seleccionar hasta tres nacionalidades.</HelperText>
            {errors.nationalityCodes ? <FieldError message={errors.nationalityCodes.message as string} /> : null}
          </div>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClassName}>
          <span className={labelTitleClassName}>Ciudad de residencia</span>
          <input
            {...register("residenceCity")}
            type="text"
            placeholder="Ej: Rosario"
            className={inputClassName}
            disabled={pending}
          />
          {errors.residenceCity ? <FieldError message={errors.residenceCity.message} /> : null}
        </label>
        <Controller
          control={control}
          name="residenceCountryCode"
          render={({ field }) => (
            <label className={labelClassName}>
              <span className={labelTitleClassName}>País de residencia</span>
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
              <HelperText>Definí dónde desarrollás tu carrera actualmente.</HelperText>
              {errors.residenceCountryCode ? (
                <FieldError message={errors.residenceCountryCode.message} />
              ) : null}
            </label>
          )}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClassName}>
          <span className={labelTitleClassName}>Altura (cm)</span>
          <input
            {...register("heightCm")}
            type="number"
            placeholder="Ej: 180"
            className={inputClassName}
            disabled={pending}
            min={120}
            max={230}
            step={1}
          />
          {errors.heightCm ? <FieldError message={errors.heightCm.message} /> : null}
        </label>
        <label className={labelClassName}>
          <span className={labelTitleClassName}>Peso (kg)</span>
          <input
            {...register("weightKg")}
            type="number"
            placeholder="Ej: 76"
            className={inputClassName}
            disabled={pending}
            min={40}
            max={150}
            step={0.5}
          />
          {errors.weightKg ? <FieldError message={errors.weightKg.message} /> : null}
        </label>
      </div>

      <label className={labelClassName}>
        <span className={labelTitleClassName}>Biografía</span>
        <textarea
          {...register("bio")}
          rows={4}
          placeholder="Contá tu trayectoria y objetivos profesionales."
          className={`${inputClassName} min-h-24`}
          disabled={pending}
        />
        <HelperText>Máximo 480 caracteres. Mostralo en tu perfil público.</HelperText>
        {errors.bio ? <FieldError message={errors.bio.message} /> : null}
      </label>

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
  error: z.ZodError<BasicInfoInput>,
  setError: UseFormSetError<FormValues>,
  setStatus: (status: StatusState) => void,
) {
  const fieldErrors = error.flatten().fieldErrors as FlattenFieldErrors<BasicInfoInput>;
  Object.entries(fieldErrors).forEach(([field, messages]) => {
    if (!messages || messages.length === 0) return;
    if (field === "playerId") return;
    setError(field as keyof FormValues, { type: "manual", message: messages[0] });
  });
  setStatus({ type: "error", message: "Revisá los datos del formulario." });
}

type FlattenFieldErrors<T> = ReturnType<z.ZodError<T>["flatten"]>["fieldErrors"];

function toFormValues(input: BasicInfoInput): FormValues {
  return {
    fullName: input.fullName,
    birthDate: input.birthDate ?? "",
    nationalityCodes: input.nationalityCodes,
    residenceCity: input.residenceCity ?? "",
    residenceCountryCode: input.residenceCountryCode ?? "",
    heightCm: input.heightCm != null ? String(input.heightCm) : "",
    weightKg: input.weightKg != null ? String(input.weightKg) : "",
    bio: input.bio ?? "",
  };
}

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
