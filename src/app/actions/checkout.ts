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
    console.error("[checkout/createCheckoutAction] failed", err);
    const message =
      err instanceof Error ? err.message : "Error desconocido al crear el checkout";
    return { ok: false, error: message };
  }
}

function emptyToNull(v: string | undefined | null): string | null {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}
