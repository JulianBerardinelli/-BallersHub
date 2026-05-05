"use client";

// Single-step billing + payment-method form. Visual matches the Claude
// Design checkout handoff (flat dark cards, lime accents, Barlow display
// titles). Submit calls the server action which inserts the local row +
// creates the processor session, then redirects.

import { useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Lock,
  Mail,
  Shield,
  User,
} from "lucide-react";
import Link from "next/link";

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

// Flat dark inputs matching the design. Focus state lights up with lime.
const INPUT_BASE =
  "w-full rounded-[9px] border border-white/[0.12] bg-[#141414] px-3.5 py-3 text-[13px] text-white placeholder:text-bh-fg-4 transition-colors focus:border-bh-lime focus:bg-bh-surface-1 focus:outline-none focus:ring-2 focus:ring-bh-lime/20";
const SELECT_BASE =
  "appearance-none cursor-pointer pr-9 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22rgba(255,255,255,0.5)%22 stroke-width=%222%22><polyline points=%226 9 12 15 18 9%22/></svg>')] bg-no-repeat bg-[right_12px_center]";

export type CheckoutFormProps = {
  planId: CheckoutPlanId;
  currency: CheckoutCurrency;
  defaultEmail: string | null;
  defaultCountry: string;
  /** Server-side processor readiness. Used to lock the submit + show banner. */
  disabled?: boolean;
};

export default function CheckoutForm(props: CheckoutFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [country, setCountry] = useState<string>(props.defaultCountry);
  const countryMeta = COUNTRIES.find((c) => c.code === country) ?? null;

  // Currency drives the actual processor server-side, but the picker UI
  // matches the design — both options visible, the routed one selected.
  const [selectedMethod, setSelectedMethod] = useState<"stripe" | "mp">(
    props.currency === "ARS" ? "mp" : "stripe",
  );

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
      window.location.href = res.redirectUrl;
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {/* Eyebrow + title */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bh-fg-3">
          Paso 2 de 3
        </p>
        <h1 className="mt-2.5 font-bh-display text-[2.5rem] font-extrabold uppercase leading-none text-bh-fg-1 md:text-[2.75rem]">
          Finalizá tu suscripción
        </h1>
        <p className="mt-2 text-sm text-bh-fg-2">
          Completá tus datos y elegí cómo querés pagar. Podés cancelar en
          cualquier momento.
        </p>
      </div>

      {/* Card · Datos de contacto */}
      <Card title="Datos de contacto">
        <div className="grid gap-3 md:grid-cols-2">
          <Field
            label="Email de la cuenta"
            name="email"
            required
            errors={fieldErrors.email}
          >
            <InputWithIcon icon={<Mail className="h-3.5 w-3.5" />}>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="tu@email.com"
                defaultValue={props.defaultEmail ?? ""}
                className={`${INPUT_BASE} pl-9`}
              />
            </InputWithIcon>
          </Field>
          <Field
            label="Nombre completo"
            name="fullName"
            required
            errors={fieldErrors["billingAddress.fullName"]}
          >
            <InputWithIcon icon={<User className="h-3.5 w-3.5" />}>
              <input
                type="text"
                name="fullName"
                autoComplete="name"
                required
                placeholder="Juan Pérez"
                className={`${INPUT_BASE} pl-9`}
              />
            </InputWithIcon>
          </Field>
        </div>
      </Card>

      {/* Card · Datos de facturación */}
      <Card title="Datos de facturación">
        <div className="grid gap-3 md:grid-cols-2">
          <Field
            label="País"
            name="countryCode"
            required
            errors={fieldErrors["billingAddress.countryCode"]}
          >
            <select
              name="countryCode"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
              className={`${INPUT_BASE} ${SELECT_BASE}`}
            >
              {COUNTRIES.map((c: CountryOption) => (
                <option key={c.code} value={c.code} className="bg-[#141414]">
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          {countryMeta?.taxIdLabel && (
            <Field
              label={countryMeta.taxIdLabel}
              name="taxId"
              hint="Opcional"
              errors={fieldErrors["billingAddress.taxId"]}
            >
              <input
                type="text"
                name="taxId"
                placeholder={
                  countryMeta.taxIdType === "dni" ? "40.123.456" : ""
                }
                className={`${INPUT_BASE} font-bh-mono tracking-[0.04em]`}
              />
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
            className={INPUT_BASE}
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
            className={INPUT_BASE}
          />
        </Field>

        <div className="grid gap-3 md:grid-cols-3">
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
              className={INPUT_BASE}
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
              className={INPUT_BASE}
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
              placeholder="C1425"
              className={`${INPUT_BASE} font-bh-mono tracking-[0.04em]`}
            />
          </Field>
        </div>

        <Field
          label="Teléfono"
          name="phone"
          hint="Opcional"
          errors={fieldErrors["billingAddress.phone"]}
        >
          <input
            type="tel"
            name="phone"
            autoComplete="tel"
            className={INPUT_BASE}
          />
        </Field>
      </Card>

      {/* Card · Método de pago */}
      <Card
        title="Método de pago"
        right={
          <span className="inline-flex items-center gap-1.5 text-[11px] text-bh-fg-3">
            <Lock className="h-3 w-3 text-bh-lime" />
            Encriptado · PCI DSS
          </span>
        }
      >
        <div className="flex flex-col gap-2.5">
          <MethodOption
            id="stripe"
            selected={selectedMethod === "stripe"}
            disabled={props.currency === "ARS"}
            onClick={() => setSelectedMethod("stripe")}
            title="Tarjeta de crédito o débito"
            desc="Visa · Mastercard · American Express · 1-clic checkout"
            tags={["VISA", "MC", "AMEX"]}
            logo={<StripeLogo />}
          />
          <MethodOption
            id="mp"
            selected={selectedMethod === "mp"}
            disabled={props.currency !== "ARS"}
            onClick={() => setSelectedMethod("mp")}
            title="Mercado Pago"
            desc="Hasta 12 cuotas · Tarjetas locales · Dinero en cuenta"
            tags={["12x", "ARS"]}
            logo={<MpLogo />}
          />
        </div>

        <div className="mt-4 flex gap-2.5 rounded-[9px] border border-bh-blue/[0.18] bg-bh-blue/[0.05] px-3.5 py-3 text-[12px] leading-[1.5] text-bh-fg-2">
          <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bh-blue" />
          <span>
            Tus datos de pago se procesan directamente en{" "}
            <strong className="text-bh-fg-1">
              {selectedMethod === "stripe" ? "Stripe" : "Mercado Pago"}
            </strong>
            . &apos;BallersHub nunca almacena información sensible de tu
            tarjeta.
          </span>
        </div>
      </Card>

      {serverError && (
        <div className="rounded-[9px] border border-bh-danger/30 bg-bh-danger/10 px-4 py-3 text-[12.5px] text-bh-danger">
          {serverError}
        </div>
      )}

      {/* Bottom action row: Cambiar plan + Continuar al pago */}
      <div className="flex flex-col-reverse items-stretch gap-3 pt-4 md:flex-row md:items-center md:justify-between">
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center gap-2 rounded-[9px] px-3 py-2 text-[13px] font-medium text-bh-fg-2 transition-colors hover:bg-white/[0.04] hover:text-bh-fg-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Cambiar plan
        </Link>
        <button
          type="submit"
          disabled={isPending || props.disabled}
          className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-bh-lime px-7 py-3.5 font-bh-display text-[16px] font-extrabold uppercase tracking-[0.05em] text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.25)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_4px_22px_rgba(204,255,0,0.45)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Procesando…
            </>
          ) : props.disabled ? (
            <>Procesador no disponible</>
          ) : (
            <>
              Continuar al pago
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-bh-surface-1 p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-bh-display text-[18px] font-bold uppercase tracking-[0.04em] text-bh-fg-1">
          {title}
        </h3>
        {right}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
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
      <span className="flex items-center justify-between gap-2 text-[11px] font-medium uppercase tracking-[0.02em] text-bh-fg-3">
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

function InputWithIcon({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-bh-fg-3">
        {icon}
      </span>
      {children}
    </div>
  );
}

function MethodOption({
  selected,
  disabled,
  onClick,
  title,
  desc,
  tags,
  logo,
}: {
  id: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  tags: string[];
  logo: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-pressed={selected}
      disabled={disabled}
      className={`flex items-center gap-3.5 rounded-[10px] border bg-bh-surface-1 p-4 text-left transition-all duration-200 ease-[cubic-bezier(0.25,0,0,1)] ${
        selected
          ? "border-bh-lime bg-gradient-to-b from-bh-lime/[0.05] to-transparent shadow-[0_0_0_1px_rgba(204,255,0,1),_0_0_24px_rgba(204,255,0,0.08)]"
          : disabled
            ? "cursor-not-allowed border-white/[0.06] opacity-50"
            : "border-white/[0.12] hover:-translate-y-px hover:border-white/[0.22]"
      }`}
    >
      <span
        className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border ${
          selected
            ? "border-bh-lime"
            : "border-white/[0.22]"
        }`}
      >
        {selected && (
          <span className="h-2.5 w-2.5 rounded-full bg-bh-lime" />
        )}
      </span>
      <span className="grid h-9 w-12 shrink-0 place-items-center overflow-hidden rounded-md">
        {logo}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bh-display text-[15px] font-bold uppercase tracking-[0.04em] text-bh-fg-1">
          {title}
        </span>
        <span className="mt-0.5 block text-[12px] text-bh-fg-3">{desc}</span>
      </span>
      <span className="hidden shrink-0 gap-1.5 md:flex">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center rounded-[4px] border border-white/[0.06] bg-bh-surface-2 px-1.5 py-0.5 font-bh-mono text-[10px] text-bh-fg-2"
          >
            {t}
          </span>
        ))}
      </span>
    </button>
  );
}

function StripeLogo() {
  return (
    <span className="flex h-full w-full items-center justify-center bg-[#635BFF] font-bh-display text-[11px] font-extrabold tracking-[0.02em] text-white">
      stripe
    </span>
  );
}

function MpLogo() {
  return (
    <span className="flex h-full w-full items-center justify-center bg-gradient-to-b from-[#00B1EA] to-[#009EE3] font-bh-display text-[10px] font-extrabold text-white">
      MP
    </span>
  );
}

function nonEmpty(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length === 0 ? undefined : t;
}
