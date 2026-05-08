"use server";

// Public server actions for the /checkout flow. Wraps the lower-level
// `createCheckout` helper with auth + zod validation so the route handlers
// don't need to repeat that work.

import { z } from "zod";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import {
  createCheckout,
  type BillingAddressInput,
} from "@/lib/billing/createCheckout";
import {
  isCheckoutCurrency,
  isCheckoutPlanId,
} from "@/lib/billing/plans";

const billingAddressSchema = z.object({
  fullName: z.string().min(2, "Nombre requerido").max(120),
  taxId: z.string().max(40).optional().or(z.literal("")),
  taxIdType: z
    .enum(["dni", "cuit", "cuil", "nie", "nif", "vat", "other"])
    .optional(),
  countryCode: z.string().length(2, "Código de país ISO-2"),
  state: z.string().max(120).optional().or(z.literal("")),
  city: z.string().min(1).max(120),
  postalCode: z.string().min(1).max(20),
  streetLine1: z.string().min(1).max(200),
  streetLine2: z.string().max(200).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
});

const inputSchema = z.object({
  planId: z.string().refine(isCheckoutPlanId, "Plan inválido"),
  currency: z.string().refine(isCheckoutCurrency, "Moneda inválida"),
  email: z.string().email("Email inválido"),
  billingAddress: billingAddressSchema,
});

export type CreateCheckoutActionInput = z.infer<typeof inputSchema>;

export type CreateCheckoutActionResult =
  | {
      ok: true;
      checkoutSessionId: string;
      redirectUrl: string;
      processor: "stripe" | "mercado_pago";
    }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createCheckoutAction(
  raw: unknown,
): Promise<CreateCheckoutActionResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // Zod's `refine` validates but doesn't narrow — assert via the guards we
  // already use elsewhere so the call to createCheckout is fully typed.
  const planId = parsed.data.planId as import("@/lib/billing/plans").CheckoutPlanId;
  const currency = parsed.data.currency as import("@/lib/billing/plans").CheckoutCurrency;
  const { email, billingAddress } = parsed.data;

  // Auth is optional — guests can complete checkout and we'll attach the
  // resulting subscription on the success callback after they log in.
  let userId: string | null = null;
  try {
    const supabase = await createSupabaseServerRSC();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // ignore — proceed as guest
  }

  const normalisedAddress: BillingAddressInput = {
    fullName: billingAddress.fullName.trim(),
    taxId: emptyToNull(billingAddress.taxId),
    taxIdType: billingAddress.taxIdType ?? null,
    countryCode: billingAddress.countryCode.toUpperCase(),
    state: emptyToNull(billingAddress.state),
    city: billingAddress.city.trim(),
    postalCode: billingAddress.postalCode.trim(),
    streetLine1: billingAddress.streetLine1.trim(),
    streetLine2: emptyToNull(billingAddress.streetLine2),
    phone: emptyToNull(billingAddress.phone),
  };

  try {
    const result = await createCheckout({
      planId,
      currency,
      userId,
      email,
      billingAddress: normalisedAddress,
    });
    return {
      ok: true,
      checkoutSessionId: result.checkoutSessionId,
      redirectUrl: result.redirectUrl,
      processor: result.processor,
    };
  } catch (err) {
    // Multi-line logger that survives Vercel/MCP truncation. Both Error
    // instances and plain objects (which the MP SDK throws) get the
    // same treatment: read every interesting top-level field and log
    // it on its own console.error line, capped at 800 chars so it fits
    // in the runtime-logs viewer.
    logCheckoutError(err);

    const fallback = "Error desconocido al crear el checkout";
    let message = fallback;
    if (err instanceof Error && err.message) {
      message = err.message;
    } else if (
      err &&
      typeof err === "object" &&
      "message" in err &&
      typeof (err as { message: unknown }).message === "string"
    ) {
      message = (err as { message: string }).message;
    }
    return { ok: false, error: message };
  }
}

function logCheckoutError(err: unknown): void {
  console.error("[checkout/createCheckoutAction] FAILED");
  console.error("  typeof:", typeof err);

  if (err === null || err === undefined) {
    console.error("  value:", String(err));
    return;
  }

  // Plain primitives — log directly.
  if (typeof err !== "object") {
    console.error("  value:", String(err).slice(0, 800));
    return;
  }

  const e = err as Record<string, unknown> & { stack?: string };

  // Common diagnostic fields. Order matches what the MP/Stripe SDKs
  // typically populate, most-useful first.
  for (const field of [
    "name",
    "status",
    "statusCode",
    "message",
    "error",
    "code",
    "cause",
    "body",
    "response",
    "data",
  ] as const) {
    if (e[field] === undefined) continue;
    const value = e[field];
    if (typeof value === "string" || typeof value === "number") {
      console.error(`  ${field}:`, String(value).slice(0, 800));
    } else {
      try {
        console.error(`  ${field}:`, JSON.stringify(value).slice(0, 800));
      } catch {
        console.error(`  ${field} (toString):`, String(value).slice(0, 800));
      }
    }
  }

  // Whole-object dump as a last resort — captures fields we didn't
  // enumerate above. Capped to keep the log line readable.
  try {
    const fullDump = JSON.stringify(e);
    if (fullDump && fullDump !== "{}") {
      console.error("  raw:", fullDump.slice(0, 1500));
    }
  } catch {
    // Circular reference, function values, etc. — skip whole-object dump.
  }

  if (typeof e.stack === "string") {
    console.error("  stack:", e.stack.split("\n").slice(0, 5).join(" | "));
  }
}

function emptyToNull(v: string | undefined | null): string | null {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}
