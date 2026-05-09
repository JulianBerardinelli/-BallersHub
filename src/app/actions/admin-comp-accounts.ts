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
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { subscriptions, auditLogs } from "@/db/schema";
import { isAdmin } from "@/lib/admin/auth";

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

async function findActiveSubscription(userId: string) {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.statusV2, ["trialing", "active", "past_due"]),
      ),
    )
    .orderBy(desc(subscriptions.createdAt))
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

  const existing = await findActiveSubscription(targetUserId);
  if (existing) {
    if (existing.processor !== null) {
      // Real paying user — refuse to overwrite. Admin should revoke
      // their paid sub via Stripe/MP first if they really want to swap.
      return {
        ok: false,
        error:
          "El usuario ya tiene una suscripción paga activa (Stripe o Mercado Pago). No es posible otorgar comp encima.",
      };
    }
    if (isCompProcessorSubscriptionId(existing.processorSubscriptionId)) {
      // Already has comp — extend or update instead of creating a duplicate.
      return {
        ok: false,
        error:
          "Este usuario ya tiene una cuenta de cortesía activa. Usá 'Extender' o 'Modificar' en lugar de otorgar otra.",
      };
    }
    return {
      ok: false,
      error: "El usuario ya tiene una suscripción activa de tipo desconocido.",
    };
  }

  const periodEnd =
    durationMonths === null || durationMonths === undefined
      ? null
      : new Date(Date.now() + durationMonths * 30 * 24 * 3600 * 1000);

  const [row] = await db
    .insert(subscriptions)
    .values({
      userId: targetUserId,
      plan: "pro",
      status: "active",
      statusV2: "active",
      planId,
      processor: null,
      processorSubscriptionId: `${COMP_GRANT_PREFIX}${auth.actorId}`,
      processorCustomerId: null,
      currentPeriodStartsAt: new Date(),
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      trialEndsAt: null,
    })
    .returning({ id: subscriptions.id });

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
