"use server";

// Comp accounts (cuentas de cortesía) — admin-only Pro grants without
// going through Stripe / Mercado Pago. Useful for friends, team members,
// influencers, partners.
//
// Data shape (no schema changes required):
//   subscriptions.plan                    = 'pro'
//   subscriptions.status                  = 'active'
//   subscriptions.status_v2               = 'active'
//   subscriptions.plan_id                 = 'pro-player' | 'pro-agency'
//   subscriptions.processor               = NULL  (distinguishes from Stripe/MP)
//   subscriptions.processor_subscription_id = 'admin_grant:<actorId>'
//   subscriptions.processor_customer_id   = NULL
//   subscriptions.current_period_end      = future ISO | NULL (permanente)
//   subscriptions.canceled_at             = NULL until revoked
//
// Every grant / extend / revoke writes an audit_logs row including the
// actor IP and a free-text reason for traceability.
//
// Real paying users (processor IN ('stripe','mercado_pago')) are NEVER
// touched by these actions — see `assertNotPaidSubscription` below.

import { z } from "zod";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { subscriptions, auditLogs } from "@/db/schema";
import { isAdmin } from "@/lib/admin/auth";
import { runSubscriptionSideEffects } from "@/lib/billing/subscriptionSideEffects";

const COMP_GRANT_PREFIX = "admin_grant:";

const planIdSchema = z.enum(["pro-player", "pro-agency"]);

// Whole months. NULL means permanent (no expiry).
const durationSchema = z
  .union([z.literal(1), z.literal(3), z.literal(6), z.literal(12), z.null()])
  .optional()
  .nullable();

export type GrantInput = {
  targetUserId: string;
  planId: "pro-player" | "pro-agency";
  durationMonths: 1 | 3 | 6 | 12 | null;
  reason?: string;
};

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ---------------------------------------------------------------
// Auth + audit helpers
// ---------------------------------------------------------------

async function ensureAdmin(): Promise<
  | { ok: true; actorId: string; actorIp: string | null }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };
  const allowed = await isAdmin(user.id);
  if (!allowed) return { ok: false, error: "Solo administradores" };

  const h = await headers();
  const actorIp =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null;

  return { ok: true, actorId: user.id, actorIp };
}

async function logAudit(input: {
  actorId: string;
  actorIp: string | null;
  action: string;
  subjectId: string;
  meta: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: input.actorId,
      actorIp: input.actorIp,
      action: input.action,
      subjectTable: "subscriptions",
      subjectId: input.subjectId,
      meta: input.meta,
    });
  } catch (err) {
    console.warn(
      "[admin-comp] audit log write failed (non-fatal):",
      err instanceof Error ? err.message : err,
    );
  }
}

// ---------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------

function isCompProcessorSubscriptionId(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(COMP_GRANT_PREFIX);
}

// `subscriptions.user_id` is UNIQUE in the DB (constraint
// `subscriptions_user_id_key`), so a user can only ever have one row.
// Pull whatever row exists — regardless of status_v2, plan, or
// processor — so the grant flow can decide between INSERT (no row)
// and UPDATE (any row).
//
// IMPORTANT: do NOT filter by `status_v2 IN ('trialing','active',...)`
// here. Common cases that filter would miss:
//   1. A free user signed up via /onboarding/player/apply → their row
//      is created with `status='active'` but `status_v2 = NULL` (the
//      v2 enum was added later and old paths haven't been backfilled).
//   2. A previously-revoked comp → row has `status_v2='canceled'`.
// Both cases would still hit the UNIQUE(user_id) constraint on INSERT,
// so we MUST find them and UPDATE in-place. The grant flow then
// rejects only true-active paid subs and true-active stacked comps.
async function findAnySubscription(userId: string) {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

// ---------------------------------------------------------------
// Grant Pro (idempotent)
// ---------------------------------------------------------------

const grantSchema = z.object({
  targetUserId: z.string().uuid(),
  planId: planIdSchema,
  durationMonths: durationSchema,
  reason: z.string().max(300).optional(),
});

export async function grantProAccess(
  input: GrantInput,
): Promise<ActionResult<{ subscriptionId: string }>> {
  const auth = await ensureAdmin();
  if (!auth.ok) return auth;

  const parsed = grantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { targetUserId, planId, durationMonths, reason } = parsed.data;

  // `subscriptions.user_id` is UNIQUE — every user has at most one row.
  // We need to look at ALL subs (not just active ones) because the row
  // for a user that's never paid might exist with a "free / canceled"
  // status that our active-only filter misses, but the UNIQUE constraint
  // would still reject a fresh INSERT.
  const anyExisting = await findAnySubscription(targetUserId);

  // Refuse to touch real paying users (live Stripe/MP). Admin should
  // revoke via the processor first if they really want to swap.
  if (
    anyExisting?.processor !== null &&
    anyExisting?.processor !== undefined &&
    anyExisting?.statusV2 &&
    ["trialing", "active", "past_due"].includes(anyExisting.statusV2)
  ) {
    return {
      ok: false,
      error:
        "El usuario ya tiene una suscripción paga activa (Stripe o Mercado Pago). No es posible otorgar comp encima.",
    };
  }

  // Refuse stacking: if there's already an ACTIVE comp, force the admin
  // to use the extend/modify flow instead of creating a "second" one.
  if (
    anyExisting?.processor === null &&
    isCompProcessorSubscriptionId(anyExisting?.processorSubscriptionId) &&
    anyExisting?.statusV2 === "active"
  ) {
    return {
      ok: false,
      error:
        "Este usuario ya tiene una cuenta de cortesía activa. Usá 'Extender' o 'Modificar' en lugar de otorgar otra.",
    };
  }

  const periodEnd =
    durationMonths === null || durationMonths === undefined
      ? null
      : new Date(Date.now() + durationMonths * 30 * 24 * 3600 * 1000);

  const compFields = {
    plan: "pro" as const,
    status: "active" as const,
    statusV2: "active" as const,
    planId,
    processor: null,
    processorSubscriptionId: `${COMP_GRANT_PREFIX}${auth.actorId}`,
    processorCustomerId: null,
    currency: null,
    currentPeriodStartsAt: new Date(),
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
    trialEndsAt: null,
    canceledAt: null,
    billingAddressId: null,
    updatedAt: new Date(),
  };

  let subscriptionId: string;
  if (anyExisting) {
    // UPDATE in-place: covers free→comp upgrade and reactivating a
    // previously-revoked comp. The UNIQUE(user_id) constraint forces
    // this path; otherwise we'd 23505.
    await db
      .update(subscriptions)
      .set(compFields)
      .where(eq(subscriptions.id, anyExisting.id));
    subscriptionId = anyExisting.id;
  } else {
    // No prior row — clean INSERT.
    const [inserted] = await db
      .insert(subscriptions)
      .values({
        userId: targetUserId,
        ...compFields,
      })
      .returning({ id: subscriptions.id });
    subscriptionId = inserted.id;
  }
  const row = { id: subscriptionId };

  await logAudit({
    actorId: auth.actorId,
    actorIp: auth.actorIp,
    action: "admin.grant_pro",
    subjectId: row.id,
    meta: {
      targetUserId,
      planId,
      durationMonths: durationMonths ?? "permanent",
      reason: reason ?? null,
      currentPeriodEnd: periodEnd?.toISOString() ?? null,
    },
  });

  await runSubscriptionSideEffects({
    userId: targetUserId,
    previousPlan: anyExisting?.plan ?? null,
    nextPlan: "pro",
    source: "admin_grant",
  });

  revalidatePath("/admin/comp-accounts");
  return { ok: true, data: { subscriptionId: row.id } };
}

// ---------------------------------------------------------------
// Extend an existing comp by N months
// ---------------------------------------------------------------

const extendSchema = z.object({
  subscriptionId: z.string().uuid(),
  additionalMonths: z.union([
    z.literal(1),
    z.literal(3),
    z.literal(6),
    z.literal(12),
  ]),
});

export async function extendProAccess(
  input: z.infer<typeof extendSchema>,
): Promise<ActionResult<{ newPeriodEnd: string | null }>> {
  const auth = await ensureAdmin();
  if (!auth.ok) return auth;

  const parsed = extendSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { subscriptionId, additionalMonths } = parsed.data;

  const guard = await assertCompSubscription(subscriptionId);
  if (!guard.ok) return guard;

  const sub = guard.data;
  const base =
    sub.currentPeriodEnd && sub.currentPeriodEnd > new Date()
      ? sub.currentPeriodEnd
      : new Date();
  const newEnd = new Date(
    base.getTime() + additionalMonths * 30 * 24 * 3600 * 1000,
  );

  await db
    .update(subscriptions)
    .set({ currentPeriodEnd: newEnd, updatedAt: new Date() })
    .where(eq(subscriptions.id, subscriptionId));

  await logAudit({
    actorId: auth.actorId,
    actorIp: auth.actorIp,
    action: "admin.extend_pro",
    subjectId: subscriptionId,
    meta: {
      additionalMonths,
      previousPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      newPeriodEnd: newEnd.toISOString(),
    },
  });

  revalidatePath("/admin/comp-accounts");
  return { ok: true, data: { newPeriodEnd: newEnd.toISOString() } };
}

// ---------------------------------------------------------------
// Make permanent (drop expiry)
// ---------------------------------------------------------------

export async function makeProPermanent(
  input: { subscriptionId: string },
): Promise<ActionResult<null>> {
  const auth = await ensureAdmin();
  if (!auth.ok) return auth;

  const guard = await assertCompSubscription(input.subscriptionId);
  if (!guard.ok) return guard;

  await db
    .update(subscriptions)
    .set({ currentPeriodEnd: null, updatedAt: new Date() })
    .where(eq(subscriptions.id, input.subscriptionId));

  await logAudit({
    actorId: auth.actorId,
    actorIp: auth.actorIp,
    action: "admin.make_pro_permanent",
    subjectId: input.subscriptionId,
    meta: {
      previousPeriodEnd: guard.data.currentPeriodEnd?.toISOString() ?? null,
    },
  });

  revalidatePath("/admin/comp-accounts");
  return { ok: true, data: null };
}

// ---------------------------------------------------------------
// Revoke
// ---------------------------------------------------------------

const revokeSchema = z.object({
  subscriptionId: z.string().uuid(),
  reason: z.string().max(300).optional(),
});

export async function revokeProAccess(
  input: z.infer<typeof revokeSchema>,
): Promise<ActionResult<null>> {
  const auth = await ensureAdmin();
  if (!auth.ok) return auth;

  const parsed = revokeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { subscriptionId, reason } = parsed.data;

  const guard = await assertCompSubscription(subscriptionId);
  if (!guard.ok) return guard;

  await db
    .update(subscriptions)
    .set({
      statusV2: "canceled",
      status: "canceled",
      plan: "free",
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscriptionId));

  await logAudit({
    actorId: auth.actorId,
    actorIp: auth.actorIp,
    action: "admin.revoke_pro",
    subjectId: subscriptionId,
    meta: { reason: reason ?? null },
  });

  await runSubscriptionSideEffects({
    userId: guard.data.userId,
    previousPlan: guard.data.plan ?? null,
    nextPlan: "free",
    source: "admin_revoke",
  });

  revalidatePath("/admin/comp-accounts");
  return { ok: true, data: null };
}

// ---------------------------------------------------------------
// Guard: never operate on real paying subscriptions
// ---------------------------------------------------------------

async function assertCompSubscription(
  subscriptionId: string,
): Promise<
  | { ok: true; data: typeof subscriptions.$inferSelect }
  | { ok: false; error: string }
> {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);

  if (!sub) return { ok: false, error: "Suscripción no encontrada" };

  if (sub.processor !== null) {
    return {
      ok: false,
      error:
        "No se puede modificar una suscripción paga (Stripe / Mercado Pago) desde este panel. Usá la cuenta del procesador.",
    };
  }
  if (!isCompProcessorSubscriptionId(sub.processorSubscriptionId)) {
    return {
      ok: false,
      error:
        "Esta suscripción no fue otorgada como cortesía. No se puede modificar desde este panel.",
    };
  }
  return { ok: true, data: sub };
}

// ---------------------------------------------------------------
// Read API for the page
// ---------------------------------------------------------------

export type CompAccountRow = {
  subscriptionId: string;
  userId: string;
  email: string | null;
  fullName: string | null;
  planId: string | null;
  statusV2: string | null;
  grantedAt: string;
  grantedByUserId: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
};

export async function listCompAccounts(): Promise<
  ActionResult<CompAccountRow[]>
> {
  const auth = await ensureAdmin();
  if (!auth.ok) return auth;

  // Pull subs whose processor_subscription_id starts with the comp prefix.
  // Drizzle doesn't expose `LIKE` ergonomically across all dialects, so we
  // build it via the `sql` template tag.
  const rows = await db
    .select({
      subscriptionId: subscriptions.id,
      userId: subscriptions.userId,
      planId: subscriptions.planId,
      statusV2: subscriptions.statusV2,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      canceledAt: subscriptions.canceledAt,
      createdAt: subscriptions.createdAt,
      processorSubscriptionId: subscriptions.processorSubscriptionId,
    })
    .from(subscriptions)
    .where(
      and(
        isNull(subscriptions.processor),
        sql`${subscriptions.processorSubscriptionId} LIKE ${COMP_GRANT_PREFIX + "%"}`,
      ),
    )
    .orderBy(desc(subscriptions.createdAt));

  if (rows.length === 0) return { ok: true, data: [] };

  // Resolve email / full name via Supabase admin API (best-effort, soft-fails).
  const { createSupabaseAdmin } = await import("@/lib/supabase/admin");
  const admin = createSupabaseAdmin();

  const result: CompAccountRow[] = [];
  for (const r of rows) {
    let email: string | null = null;
    let fullName: string | null = null;
    try {
      const { data } = await admin.auth.admin.getUserById(r.userId);
      email = data?.user?.email ?? null;
      fullName =
        (data?.user?.user_metadata?.full_name as string | undefined) ?? null;
    } catch {
      /* ignore */
    }
    const grantedByUserId = r.processorSubscriptionId?.replace(
      COMP_GRANT_PREFIX,
      "",
    ) ?? null;

    result.push({
      subscriptionId: r.subscriptionId,
      userId: r.userId,
      email,
      fullName,
      planId: r.planId,
      statusV2: r.statusV2,
      grantedAt: r.createdAt.toISOString(),
      grantedByUserId,
      currentPeriodEnd: r.currentPeriodEnd?.toISOString() ?? null,
      canceledAt: r.canceledAt?.toISOString() ?? null,
    });
  }

  return { ok: true, data: result };
}

// ---------------------------------------------------------------
// User search (typeahead) for the grant form
// ---------------------------------------------------------------

const userSearchSchema = z.object({
  query: z.string().min(2).max(120),
});

export async function searchUsersForGrant(
  input: z.infer<typeof userSearchSchema>,
): Promise<
  ActionResult<{ userId: string; email: string | null; fullName: string | null }[]>
> {
  const auth = await ensureAdmin();
  if (!auth.ok) return auth;

  const parsed = userSearchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Búsqueda inválida" };
  }

  // Search in Supabase Auth (by email substring).
  try {
    const { createSupabaseAdmin } = await import("@/lib/supabase/admin");
    const admin = createSupabaseAdmin();
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const q = parsed.data.query.toLowerCase();
    const matches = (data?.users ?? [])
      .filter((u) => {
        const email = (u.email ?? "").toLowerCase();
        const name = (
          (u.user_metadata?.full_name as string | undefined) ?? ""
        ).toLowerCase();
        return email.includes(q) || name.includes(q);
      })
      .slice(0, 20)
      .map((u) => ({
        userId: u.id,
        email: u.email ?? null,
        fullName: (u.user_metadata?.full_name as string | undefined) ?? null,
      }));
    return { ok: true, data: matches };
  } catch (err) {
    console.error("[admin-comp/search] failed", err);
    return { ok: false, error: "Error buscando usuarios" };
  }
}
