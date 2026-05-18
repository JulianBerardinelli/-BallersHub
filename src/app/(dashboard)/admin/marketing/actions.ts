"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { marketingCampaigns, marketingSends } from "@/db/schema";
import {
  filterByFrequencyCap,
  resolveAudience,
  runCampaign,
  type AudienceFilter,
} from "@/lib/marketing";
import {
  renderTemplate,
  TEMPLATE_DESCRIPTORS,
  type TemplateKey,
} from "@/emails";
import { siteUrl } from "@/emails/tokens";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

/**
 * Server actions for the marketing admin UI.
 *
 * Auth: every action enforces admin role. Non-admins get a 403-equivalent
 * by being redirected back to the dashboard.
 *
 * Mutations always revalidate `/admin/marketing` so the table refreshes
 * without a manual reload.
 */

const ADMIN_PATH = "/admin/marketing";

async function ensureAdmin(): Promise<{ userId: string }> {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/admin/marketing");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle<{ role: string }>();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }
  return { userId: user.id };
}

// ----------------------------------------------------------------------------
// AUDIENCE ESTIMATE
// ----------------------------------------------------------------------------

const audienceFilterSchema: z.ZodType<AudienceFilter> = z.object({
  segment: z.enum([
    "all_subscribed",
    "registered_no_profile",
    "pro_players_active",
    "leads_recent",
    "custom",
  ]),
  withinDays: z.number().int().positive().optional(),
  requireConsent: z.enum(["product", "offers", "pro_features"]).optional(),
  emails: z.array(z.string().email()).optional(),
});

export type AudienceEstimate = {
  totalCandidates: number;
  afterSuppression: number;
  afterFrequencyCap: number;
  cappedDays: number;
};

const ESTIMATE_FREQUENCY_CAP_DAYS = 5;

export async function estimateAudience(filterInput: AudienceFilter): Promise<AudienceEstimate> {
  await ensureAdmin();

  const filter = audienceFilterSchema.parse(filterInput);

  // Resolve raw candidates (without suppression) + with suppression separately
  // to give the admin visibility into how much each filter trims.
  const rawCandidates = await collectRawCandidates(filter);
  const afterSuppression = await resolveAudience(filter); // already trims suppressed
  const afterFreq = await filterByFrequencyCap(afterSuppression, ESTIMATE_FREQUENCY_CAP_DAYS);

  return {
    totalCandidates: rawCandidates.length,
    afterSuppression: afterSuppression.length,
    afterFrequencyCap: afterFreq.length,
    cappedDays: ESTIMATE_FREQUENCY_CAP_DAYS,
  };
}

async function collectRawCandidates(filter: AudienceFilter): Promise<string[]> {
  // Mirrors `audiences.ts` candidate fetching but without the suppression
  // pass, so the admin can see how many are pruned by suppression alone.
  const { sql: rawSql } = await import("drizzle-orm");

  switch (filter.segment) {
    case "all_subscribed": {
      const rows = await db.execute<{ email: string }>(
        rawSql`select distinct email from marketing_subscriptions`,
      );
      return rowsToEmails(rows);
    }
    case "registered_no_profile": {
      const rows = await db.execute<{ email: string }>(rawSql`
        select au.email
        from auth.users au
        left join public.player_profiles pp on pp.user_id = au.id
        where pp.id is null
          and au.email is not null
      `);
      return rowsToEmails(rows);
    }
    case "pro_players_active": {
      const rows = await db.execute<{ email: string }>(rawSql`
        select au.email
        from public.player_profiles pp
        join auth.users au on au.id = pp.user_id
        where pp.status = 'approved'
          and pp.visibility = 'public'
          and au.email is not null
      `);
      return rowsToEmails(rows);
    }
    case "leads_recent": {
      const days = Math.max(1, Math.floor(filter.withinDays ?? 30));
      const rows = await db.execute<{ email: string }>(rawSql`
        select distinct email
        from public.portfolio_leads
        where created_at >= now() - (${days}::int || ' days')::interval
      `);
      return rowsToEmails(rows);
    }
    case "custom": {
      const list = filter.emails ?? [];
      return Array.from(new Set(list.map((e) => e.trim().toLowerCase()).filter(Boolean)));
    }
  }
}

function rowsToEmails(result: unknown): string[] {
  const arr =
    (result as { rows?: Array<{ email: string }> }).rows ??
    (result as Array<{ email: string }>);
  return Array.from(
    new Set((arr ?? []).map((r) => (r.email ?? "").trim().toLowerCase()).filter(Boolean)),
  );
}

// ----------------------------------------------------------------------------
// TEMPLATE PREVIEW
// ----------------------------------------------------------------------------

const previewSchema = z.object({
  templateKey: z.string(),
  templateProps: z.record(z.string(), z.unknown()).default({}),
  recipientEmail: z.string().email().optional(),
});

export async function previewTemplate(input: z.infer<typeof previewSchema>): Promise<string> {
  await ensureAdmin();
  const parsed = previewSchema.parse(input);

  const descriptor = TEMPLATE_DESCRIPTORS.find((t) => t.key === parsed.templateKey);
  if (!descriptor) throw new Error(`Unknown template: ${parsed.templateKey}`);

  // Provide sane sample props for the preview so it never crashes when
  // rendered with partial data from the wizard.
  const sampleProps = buildSampleProps(parsed.templateKey as TemplateKey, parsed.templateProps);
  sampleProps.recipientEmail = parsed.recipientEmail ?? "preview@ballershub.co";

  return renderTemplate(parsed.templateKey as TemplateKey, sampleProps as never);
}

function buildSampleProps(
  key: TemplateKey,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const dashboardUrl = `${siteUrl}/dashboard`;
  const sampleSlug = "sample-player";

  switch (key) {
    case "welcome_player":
      return { playerName: "Lautaro Sample", dashboardUrl, ...overrides };
    case "welcome_agency":
      return { managerName: "Sofía Manager", dashboardUrl, ...overrides };
    case "lead_welcome":
      return {
        playerName: "Lautaro Sample",
        portfolioUrl: `${siteUrl}/${sampleSlug}`,
        signUpUrl: `${siteUrl}/auth/sign-up`,
        ...overrides,
      };
    case "profile_completion":
      return { firstName: "Lautaro", dashboardUrl, missingSections: 3, ...overrides };
    case "agency_staff_invite":
      return {
        managerName: "Sofía Manager",
        agencyName: "Sample FC Agency",
        inviteUrl: `${siteUrl}/onboarding/accept-invite?token=preview`,
        ...overrides,
      };
    case "player_agency_invite":
      return {
        managerName: "Sofía Manager",
        agencyName: "Sample FC Agency",
        inviteUrl: `${siteUrl}/onboarding/accept-invite?token=preview`,
        contractEndDate: "30/06/2027",
        ...overrides,
      };
    case "player_disconnect":
      return { playerName: "Lautaro Sample", agencyName: "Sample FC Agency", ...overrides };
    case "custom_broadcast":
      return {
        eyebrow: "Anuncio",
        headline: "Título de la campaña",
        body: "Primer párrafo del cuerpo. Acá va el mensaje principal.\n\nSegundo párrafo opcional.",
        ctaLabel: "Acción",
        ctaUrl: `${siteUrl}/`,
        ...overrides,
      };
    case "subscription_welcome":
      return {
        displayName: "Lautaro Sample",
        planId: "pro-player",
        formattedAmount: "USD 85",
        trialEndsAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        nextChargeAt: new Date(Date.now() + 365 * 86_400_000).toISOString(),
        dashboardUrl,
        manageSubscriptionUrl: `${siteUrl}/dashboard/settings/subscription`,
        ...overrides,
      };
    case "comp_grant_welcome":
      return {
        displayName: "Lautaro Sample",
        planId: "pro-player",
        expiresAt: new Date(Date.now() + 90 * 86_400_000).toISOString(),
        variant: "grant",
        dashboardUrl,
        manageSubscriptionUrl: `${siteUrl}/dashboard/settings/subscription`,
        ...overrides,
      };
    case "payment_failed":
      return {
        displayName: "Lautaro Sample",
        planId: "pro-player",
        formattedAmount: "USD 85",
        nextRetryAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
        updatePaymentUrl: `${siteUrl}/dashboard/settings/subscription`,
        ...overrides,
      };
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

// ----------------------------------------------------------------------------
// CREATE / UPDATE / DELETE
// ----------------------------------------------------------------------------

const createCampaignSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones."),
  subject: z.string().min(1).max(150),
  preheader: z.string().max(180).optional(),
  templateKey: z.string(),
  templateProps: z.record(z.string(), z.unknown()).default({}),
  audienceFilter: audienceFilterSchema,
  scheduledAt: z.string().datetime().optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type CreateCampaignResult =
  | { ok: true; campaignId: string }
  | { ok: false; error: string };

export async function createCampaign(
  input: CreateCampaignInput,
): Promise<CreateCampaignResult> {
  const { userId } = await ensureAdmin();
  const parsed = createCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const data = parsed.data;
  const status = data.scheduledAt ? "scheduled" : "draft";

  try {
    const [row] = await db
      .insert(marketingCampaigns)
      .values({
        slug: data.slug,
        name: data.name,
        subject: data.subject,
        preheader: data.preheader ?? null,
        templateKey: data.templateKey,
        templateProps: data.templateProps,
        audienceFilter: data.audienceFilter,
        status,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        createdBy: userId,
      })
      .returning({ id: marketingCampaigns.id });

    revalidatePath(ADMIN_PATH);
    return { ok: true, campaignId: row.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : "No se pudo crear la campaña.";
    if (/duplicate key/i.test(message)) {
      return { ok: false, error: "Ya existe una campaña con ese slug." };
    }
    return { ok: false, error: message };
  }
}

const dispatchSchema = z.object({
  campaignId: z.string().uuid(),
  applyFrequencyCap: z.boolean().default(true),
});

export type DispatchResult =
  | { ok: true; sent: number; failed: number }
  | { ok: false; error: string };

export async function dispatchCampaignNow(
  input: z.infer<typeof dispatchSchema>,
): Promise<DispatchResult> {
  await ensureAdmin();
  const parsed = dispatchSchema.parse(input);

  const campaign = await db.query.marketingCampaigns.findFirst({
    where: eq(marketingCampaigns.id, parsed.campaignId),
  });
  if (!campaign) return { ok: false, error: "Campaña no encontrada." };

  if (campaign.status === "sending") {
    return { ok: false, error: "La campaña ya está enviándose." };
  }
  if (campaign.status === "sent") {
    return { ok: false, error: "La campaña ya fue enviada." };
  }

  // Resolve audience (suppression already applied) + optional frequency cap
  let recipients = await resolveAudience(campaign.audienceFilter as AudienceFilter);
  if (parsed.applyFrequencyCap) {
    recipients = await filterByFrequencyCap(recipients, ESTIMATE_FREQUENCY_CAP_DAYS);
  }

  if (recipients.length === 0) {
    await db
      .update(marketingCampaigns)
      .set({ status: "sent", finishedAt: new Date(), totalRecipients: 0 })
      .where(eq(marketingCampaigns.id, campaign.id));
    revalidatePath(ADMIN_PATH);
    return { ok: true, sent: 0, failed: 0 };
  }

  const result = await runCampaign({
    campaignId: campaign.id,
    recipients,
    renderHtmlForRecipient: async ({ email, unsubscribeToken }) => {
      const baseProps = (campaign.templateProps ?? {}) as Record<string, unknown>;
      const props = { ...baseProps, recipientEmail: email, unsubscribeToken };
      return renderTemplate(campaign.templateKey as TemplateKey, props as never);
    },
  });

  revalidatePath(ADMIN_PATH);
  revalidatePath(`${ADMIN_PATH}/${campaign.id}`);

  return { ok: true, sent: result.totalSent, failed: result.totalFailed };
}

const deleteSchema = z.object({ campaignId: z.string().uuid() });

export async function deleteCampaign(
  input: z.infer<typeof deleteSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureAdmin();
  const parsed = deleteSchema.parse(input);

  const campaign = await db.query.marketingCampaigns.findFirst({
    where: eq(marketingCampaigns.id, parsed.campaignId),
  });
  if (!campaign) return { ok: false, error: "Campaña no encontrada." };

  // Only deletable while in draft or scheduled (not yet sent).
  if (!["draft", "scheduled", "failed"].includes(campaign.status)) {
    return {
      ok: false,
      error: "Solo se pueden eliminar campañas en estado borrador, agendadas o fallidas.",
    };
  }

  // Wipe queued sends first (cascade should cover, but be explicit).
  await db.delete(marketingSends).where(eq(marketingSends.campaignId, campaign.id));
  await db.delete(marketingCampaigns).where(eq(marketingCampaigns.id, campaign.id));

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

// ----------------------------------------------------------------------------
// GLOBAL STATS
// ----------------------------------------------------------------------------

export type MarketingGlobalStats = {
  subscribers: number;
  unsubscribes: number;
  sent30d: number;
  delivered30d: number;
  opened30d: number;
  clicked30d: number;
  openRate30d: number;
  clickRate30d: number;
};

export async function fetchGlobalStats(): Promise<MarketingGlobalStats> {
  await ensureAdmin();

  // Migrated from `db.execute(sql\`…\`)` (Drizzle/postgres-js) to
  // Supabase REST to avoid the ClientRead zombie bug on the pooler
  // when this runs in a Vercel function. See PERFORMANCE_PLAN.md.
  //
  // Counts are HEAD requests with status filters — exact in the DB,
  // zero rows transferred. Earlier iteration of this migration used a
  // single `select("status").gte("sent_at", since)` + JS aggregation,
  // but PostgREST caps responses at ~1000 rows by default so the JS
  // counts would silently undercount once 30-day volume crossed that
  // threshold (Codex flagged this on PR #73). Pulling counts per
  // status keeps the precision the original SQL `count(*) filter`
  // had, without re-introducing postgres-js.
  const { createSupabaseAdmin } = await import("@/lib/supabase/admin");
  const supabase = createSupabaseAdmin();

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    subsRes,
    unsubsRes,
    sentRes,
    deliveredRes,
    openedRes,
    clickedRes,
  ] = await Promise.all([
    supabase
      .from("marketing_subscriptions")
      .select("email", { count: "exact", head: true }),
    supabase
      .from("marketing_unsubscribes")
      .select("email", { count: "exact", head: true }),
    supabase
      .from("marketing_sends")
      .select("id", { count: "exact", head: true })
      .gte("sent_at", since)
      .in("status", ["sent", "delivered", "opened", "clicked", "bounced"]),
    supabase
      .from("marketing_sends")
      .select("id", { count: "exact", head: true })
      .gte("sent_at", since)
      .in("status", ["delivered", "opened", "clicked"]),
    supabase
      .from("marketing_sends")
      .select("id", { count: "exact", head: true })
      .gte("sent_at", since)
      .in("status", ["opened", "clicked"]),
    supabase
      .from("marketing_sends")
      .select("id", { count: "exact", head: true })
      .gte("sent_at", since)
      .eq("status", "clicked"),
  ]);

  const subscribers = subsRes.count ?? 0;
  const unsubscribes = unsubsRes.count ?? 0;
  const sent = sentRes.count ?? 0;
  const delivered = deliveredRes.count ?? 0;
  const opened = openedRes.count ?? 0;
  const clicked = clickedRes.count ?? 0;

  return {
    subscribers,
    unsubscribes,
    sent30d: sent,
    delivered30d: delivered,
    opened30d: opened,
    clicked30d: clicked,
    openRate30d: delivered > 0 ? Math.round((opened / delivered) * 1000) / 10 : 0,
    clickRate30d: delivered > 0 ? Math.round((clicked / delivered) * 1000) / 10 : 0,
  };
}
