"use client";

// Single-step billing form. On submit it calls the server action,
// which creates the local checkout_session row + the processor session
// (Stripe / MP) and returns a URL we redirect the browser to.

import { useState, useTransition } from "react";
import { ArrowRight, ChevronDown, Loader2, ShieldCheck } from "lucide-react";
import {
  createCheckoutAction,
  type CreateCheckoutActionInput,
  type CreateCheckoutActionResult,
} from "@/app/actions/checkout";
import type {
  CheckoutPlanId,
  CheckoutCurrency,
} from "@/lib/billing/plans";
import { COUNTRIES, type CountryOption } from "./data";

type FormValues = CreateCheckoutActionInput;

const FIELD_BASE =
  "w-full rounded-bh-md border border-white/[0.10] bg-white/[0.02] px-4 py-2.5 text-[13.5px] text-bh-fg-1 placeholder:text-bh-fg-4 focus:border-bh-lime/40 focus:bg-white/[0.04] focus:outline-none";

export type CheckoutFormProps = {
  planId: CheckoutPlanId;
  currency: CheckoutCurrency;
  defaultEmail: string | null;
  defaultCountry: string;
};

export default function CheckoutForm(props: CheckoutFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [country, setCountry] = useState<string>(props.defaultCountry);
  const countryMeta = COUNTRIES.find((c) => c.code === country) ?? null;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const fd = new FormData(e.currentTarget);
    const input: FormValues = {
      planId: props.planId,
      currency: props.currency,
      email: String(fd.get("email") ?? ""),
      billingAddress: {
        fullName: String(fd.get("fullName") ?? ""),
        taxId: nonEmpty(fd.get("taxId")),
        taxIdType: countryMeta?.taxIdType ?? "other",
        countryCode: country,
        state: nonEmpty(fd.get("state")),
        city: String(fd.get("city") ?? ""),
        postalCode: String(fd.get("postalCode") ?? ""),
        streetLine1: String(fd.get("streetLine1") ?? ""),
        streetLine2: nonEmpty(fd.get("streetLine2")),
        phone: nonEmpty(fd.get("phone")),
      },
    };

    startTransition(async () => {
      const res: CreateCheckoutActionResult =
        await createCheckoutAction(input);
      if (!res.ok) {
        setServerError(res.error);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        return;
      }
      // Redirect to processor (Stripe Checkout / MP Checkout Pro).
      window.location.href = res.redirectUrl;
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bh-glass relative flex flex-col gap-7 rounded-bh-xl p-6 md:p-7"
      noValidate
    >
      {/* Step 1 — Account / contact */}
      <Section
        eyebrow="Paso 1 · Contacto"
        title="¿Dónde te enviamos la factura?"
        description="Usamos este email para mandarte el recibo y los recordatorios del trial."
      >
        <Field label="Email" name="email" required errors={fieldErrors.email}>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="tu@email.com"
            defaultValue={props.defaultEmail ?? ""}
            required
            className={FIELD_BASE}
          />
        </Field>
        <Field
          label="Nombre completo"
          name="fullName"
          required
          errors={fieldErrors["billingAddress.fullName"]}
        >
          <input
            type="text"
            name="fullName"
            autoComplete="name"
            required
            placeholder="Juan Pérez"
            className={FIELD_BASE}
          />
        </Field>
      </Section>

      {/* Step 2 — Billing address */}
      <Section
        eyebrow="Paso 2 · Dirección de facturación"
        title="Datos para la factura"
        description="Necesario para procesar el pago en algunos países."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field
            label="País"
            name="countryCode"
            required
            errors={fieldErrors["billingAddress.countryCode"]}
          >
            <CountrySelect value={country} onChange={setCountry} />
          </Field>
          {countryMeta?.taxIdLabel && (
            <Field
              label={countryMeta.taxIdLabel}
              name="taxId"
              hint="Opcional"
              errors={fieldErrors["billingAddress.taxId"]}
            >
              <input type="text" name="taxId" className={FIELD_BASE} />
            </Field>
          )}
        </div>

        <Field
          label="Dirección"
          name="streetLine1"
          required
          errors={fieldErrors["billingAddress.streetLine1"]}
        >
          <input
            type="text"
            name="streetLine1"
            autoComplete="address-line1"
            required
            placeholder="Calle y número"
            className={FIELD_BASE}
          />
        </Field>
        <Field
          label="Departamento, piso, etc."
          name="streetLine2"
          hint="Opcional"
          errors={fieldErrors["billingAddress.streetLine2"]}
        >
          <input
            type="text"
            name="streetLine2"
            autoComplete="address-line2"
            className={FIELD_BASE}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field
            label="Ciudad"
            name="city"
            required
            errors={fieldErrors["billingAddress.city"]}
          >
            <input
              type="text"
              name="city"
              autoComplete="address-level2"
              required
              className={FIELD_BASE}
            />
          </Field>
          <Field
            label="Provincia / Estado"
            name="state"
            errors={fieldErrors["billingAddress.state"]}
          >
            <input
              type="text"
              name="state"
              autoComplete="address-level1"
              className={FIELD_BASE}
            />
          </Field>
          <Field
            label="Código postal"
            name="postalCode"
            required
            errors={fieldErrors["billingAddress.postalCode"]}
          >
            <input
              type="text"
              name="postalCode"
              autoComplete="postal-code"
              required
              className={FIELD_BASE}
            />
          </Field>
        </div>

        <Field
          label="Teléfono"
          name="phone"
          hint="Opcional. Solo lo usamos si hay un problema con el pago."
          errors={fieldErrors["billingAddress.phone"]}
        >
          <input
            type="tel"
            name="phone"
            autoComplete="tel"
            className={FIELD_BASE}
          />
        </Field>
      </Section>

      {serverError && (
        <div className="rounded-bh-md border border-bh-danger/30 bg-bh-danger/10 px-4 py-3 text-[12.5px] text-bh-danger">
          {serverError}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-bh-md bg-bh-lime px-6 py-3.5 text-[14px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)] disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Procesando…
            </>
          ) : (
            <>
              Continuar al pago
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-bh-fg-3">
          <ShieldCheck className="h-3 w-3" />
          Te redirigimos al procesador de pagos seguro
        </p>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-bh-fg-4">
          {eyebrow}
        </span>
        <span className="block font-bh-heading text-base font-bold text-bh-fg-1">
          {title}
        </span>
        {description && (
          <span className="block text-[12px] text-bh-fg-3">{description}</span>
        )}
      </legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  name,
  hint,
  required,
  errors,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  required?: boolean;
  errors?: string[];
  children: React.ReactNode;
}) {
  const hasError = !!errors && errors.length > 0;
  return (
    <label htmlFor={name} className="block space-y-1.5">
      <span className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.10em] text-bh-fg-3">
        <span>
          {label}
          {required && <span className="ml-0.5 text-bh-danger">*</span>}
        </span>
        {hint && !hasError && (
          <span className="font-normal lowercase tracking-normal text-bh-fg-4">
            {hint}
          </span>
        )}
      </span>
      {children}
      {hasError && (
        <span className="block text-[11px] text-bh-danger">{errors[0]}</span>
      )}
    </label>
  );
}

function CountrySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        name="countryCode"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className={`${FIELD_BASE} appearance-none pr-10`}
      >
        {COUNTRIES.map((c: CountryOption) => (
          <option key={c.code} value={c.code} className="bg-bh-black">
            {c.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bh-fg-3" />
    </div>
  );
}

function nonEmpty(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length === 0 ? undefined : t;
}
