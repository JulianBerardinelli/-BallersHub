"use server";

import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  agencyProfiles,
  agencyTeamRelations,
  agencyTeamRelationSubmissions,
  agencyTeamRelationProposals,
  teams,
  userProfiles,
} from "@/db/schema";
import { isAdmin } from "@/lib/admin/auth";

async function resolveManagerAgency() {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, user.id),
  });

  if (!profile || profile.role !== "manager" || !profile.agencyId) {
    throw new Error("Solo un mánager activo puede gestionar equipos.");
  }

  return { user, profile, agencyId: profile.agencyId };
}

async function resolveAdmin() {
  const supabase = await createSupabaseServerRoute();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const ok = await isAdmin(user.id);
  if (!ok) throw new Error("Acceso restringido a administradores.");
  return { user };
}

const proposalItemSchema = z.object({
  teamId: z.string().uuid().nullable().optional(),
  proposedTeamName: z.string().max(120).nullable().optional(),
  proposedTeamCountry: z.string().max(80).nullable().optional(),
  proposedTeamCountryCode: z.string().length(2).nullable().optional(),
  proposedTeamDivision: z.string().max(120).nullable().optional(),
  proposedTeamTransfermarktUrl: z.string().url().max(400).nullable().optional(),
  relationKind: z.enum(["current", "past"]).default("past"),
  description: z.string().max(800).nullable().optional(),
});

const submissionSchema = z.object({
  note: z.string().max(800).nullable().optional(),
  items: z.array(proposalItemSchema).min(1).max(15),
});

/**
 * Manager submits a batch of team proposals. Each item is either an existing
 * team_id OR a proposed_* set of fields. Admins receive the submission and
 * approve/reject the whole envelope (with optional per-item override).
 */
export async function createAgencyTeamSubmissionAction(payload: {
  note?: string | null;
  items: Array<{
    teamId?: string | null;
    proposedTeamName?: string | null;
    proposedTeamCountry?: string | null;
    proposedTeamCountryCode?: string | null;
    proposedTeamDivision?: string | null;
    proposedTeamTransfermarktUrl?: string | null;
    relationKind?: "current" | "past";
    description?: string | null;
  }>;
}) {
  const { agencyId, user } = await resolveManagerAgency();
  const safe = submissionSchema.parse(payload);

  // Each item must either reference an existing team_id OR carry a proposed name.
  for (const item of safe.items) {
    if (!item.teamId && !item.proposedTeamName?.trim()) {
      throw new Error(
        "Cada equipo debe tener un team_id existente o un nombre propuesto.",
      );
    }
  }

  const [submission] = await db
    .insert(agencyTeamRelationSubmissions)
    .values({
      agencyId,
      submittedByUserId: user.id,
      status: "pending",
      note: safe.note?.trim() || null,
    })
    .returning();

  await db.insert(agencyTeamRelationProposals).values(
    safe.items.map((it) => ({
      submissionId: submission.id,
      teamId: it.teamId ?? null,
      proposedTeamName: it.proposedTeamName?.trim() || null,
      proposedTeamCountry: it.proposedTeamCountry?.trim() || null,
      proposedTeamCountryCode: it.proposedTeamCountryCode?.toUpperCase() || null,
      proposedTeamDivision: it.proposedTeamDivision?.trim() || null,
      proposedTeamTransfermarktUrl:
        it.proposedTeamTransfermarktUrl?.trim() || null,
      relationKind: it.relationKind ?? "past",
      description: it.description?.trim() || null,
    })),
  );

  revalidatePath("/dashboard/agency");
  revalidatePath("/admin/agency-team-proposals");

  return { success: true, submissionId: submission.id };
}

export async function cancelAgencyTeamSubmissionAction(submissionId: string) {
  const { agencyId, user } = await resolveManagerAgency();

  const submission = await db.query.agencyTeamRelationSubmissions.findFirst({
    where: eq(agencyTeamRelationSubmissions.id, submissionId),
  });

  if (!submission) throw new Error("Solicitud no encontrada.");
  if (submission.agencyId !== agencyId) {
    throw new Error("No podés cancelar solicitudes de otra agencia.");
  }
  if (submission.status !== "pending") {
    throw new Error("Solo se pueden cancelar solicitudes pendientes.");
  }

  await db
    .update(agencyTeamRelationSubmissions)
    .set({
      status: "cancelled",
      reviewedAt: new Date(),
      reviewedByUserId: user.id,
      resolutionNote: "Cancelada por el mánager.",
    })
    .where(eq(agencyTeamRelationSubmissions.id, submissionId));

  revalidatePath("/dashboard/agency");
  revalidatePath("/admin/agency-team-proposals");
  return { success: true };
}

export async function deleteAgencyTeamRelationAction(relationId: string) {
  const { agencyId } = await resolveManagerAgency();

  const rel = await db.query.agencyTeamRelations.findFirst({
    where: eq(agencyTeamRelations.id, relationId),
  });
  if (!rel) throw new Error("Equipo no encontrado.");
  if (rel.agencyId !== agencyId) {
    throw new Error("No podés borrar equipos de otra agencia.");
  }

  await db.delete(agencyTeamRelations).where(eq(agencyTeamRelations.id, relationId));

  const agency = await db.query.agencyProfiles.findFirst({
    where: eq(agencyProfiles.id, agencyId),
    columns: { slug: true },
  });

  revalidatePath("/dashboard/agency");
  if (agency?.slug) revalidatePath(`/agency/${agency.slug}`);
  return { success: true };
}

const reviewItemSchema = z.object({
  proposalId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
});

const reviewSchema = z.object({
  submissionId: z.string().uuid(),
  resolutionNote: z.string().max(800).nullable().optional(),
  items: z.array(reviewItemSchema).min(1),
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

async function ensureUniqueSlug(base: string) {
  const root = base || "team";
  let candidate = root;
  let attempt = 1;
  while (true) {
    const existing = await db.query.teams.findFirst({
      where: eq(teams.slug, candidate),
      columns: { id: true },
    });
    if (!existing) return candidate;
    attempt += 1;
    candidate = `${root}-${attempt}`;
    if (attempt > 50) {
      candidate = `${root}-${Date.now().toString(36)}`;
      return candidate;
    }
  }
}

/**
 * Admin reviews a submission. Per-item statuses determine which proposals
 * become real agency_team_relations. New teams get materialized in the
 * teams table (status = pending so admin can later edit/approve them via
 * the existing teams admin queue).
 */
export async function reviewAgencyTeamSubmissionAction(payload: {
  submissionId: string;
  resolutionNote?: string | null;
  items: Array<{ proposalId: string; status: "approved" | "rejected" }>;
}) {
  const { user } = await resolveAdmin();
  const safe = reviewSchema.parse(payload);

  const submission = await db.query.agencyTeamRelationSubmissions.findFirst({
    where: eq(agencyTeamRelationSubmissions.id, safe.submissionId),
  });
  if (!submission) throw new Error("Solicitud no encontrada.");
  if (submission.status !== "pending") {
    throw new Error("Esta solicitud ya fue resuelta.");
  }

  const proposals = await db.query.agencyTeamRelationProposals.findMany({
    where: eq(agencyTeamRelationProposals.submissionId, submission.id),
  });

  const proposalsById = new Map(proposals.map((p) => [p.id, p]));
  const approvedCount = safe.items.filter((i) => i.status === "approved").length;

  for (const item of safe.items) {
    const proposal = proposalsById.get(item.proposalId);
    if (!proposal) continue;

    if (item.status === "rejected") {
      await db
        .update(agencyTeamRelationProposals)
        .set({ status: "rejected", updatedAt: new Date() })
        .where(eq(agencyTeamRelationProposals.id, proposal.id));
      continue;
    }

    // Approved → materialize.
    let teamId = proposal.teamId;
    if (!teamId && proposal.proposedTeamName) {
      const slug = await ensureUniqueSlug(slugify(proposal.proposedTeamName));
      const [created] = await db
        .insert(teams)
        .values({
          slug,
          name: proposal.proposedTeamName,
          country: proposal.proposedTeamCountry,
          countryCode: proposal.proposedTeamCountryCode,
          transfermarktUrl: proposal.proposedTeamTransfermarktUrl,
          status: "pending", // admin moderates further if needed
          requestedByUserId: submission.submittedByUserId,
        })
        .returning();
      teamId = created.id;
    }

    if (!teamId) {
      // Couldn't resolve a team — mark proposal rejected so it doesn't dangle.
      await db
        .update(agencyTeamRelationProposals)
        .set({ status: "rejected", updatedAt: new Date() })
        .where(eq(agencyTeamRelationProposals.id, proposal.id));
      continue;
    }

    // Resolve country code: prefer team's country code, fall back to proposal.
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
      columns: { countryCode: true },
    });

    // Upsert the agency_team_relation. (agency_id, team_id) is unique.
    const existingRelation = await db.query.agencyTeamRelations.findFirst({
      where: and(
        eq(agencyTeamRelations.agencyId, submission.agencyId),
        eq(agencyTeamRelations.teamId, teamId),
      ),
    });

    if (existingRelation) {
      await db
        .update(agencyTeamRelations)
        .set({
          relationKind: proposal.relationKind,
          description: proposal.description,
          countryCode: team?.countryCode ?? proposal.proposedTeamCountryCode ?? null,
          approvedByUserId: user.id,
          approvedAt: new Date(),
        })
        .where(eq(agencyTeamRelations.id, existingRelation.id));
    } else {
      await db.insert(agencyTeamRelations).values({
        agencyId: submission.agencyId,
        teamId,
        relationKind: proposal.relationKind,
        description: proposal.description,
        countryCode: team?.countryCode ?? proposal.proposedTeamCountryCode ?? null,
        approvedByUserId: user.id,
      });
    }

    await db
      .update(agencyTeamRelationProposals)
      .set({
        status: "approved",
        materializedTeamId: teamId,
        updatedAt: new Date(),
      })
      .where(eq(agencyTeamRelationProposals.id, proposal.id));
  }

  // Envelope status: approved if at least one item approved, else rejected.
  const overallStatus = approvedCount > 0 ? "approved" : "rejected";
  await db
    .update(agencyTeamRelationSubmissions)
    .set({
      status: overallStatus,
      resolutionNote: safe.resolutionNote?.trim() || null,
      reviewedAt: new Date(),
      reviewedByUserId: user.id,
    })
    .where(eq(agencyTeamRelationSubmissions.id, submission.id));

  // Revalidate the public portfolio for the agency.
  const agency = await db.query.agencyProfiles.findFirst({
    where: eq(agencyProfiles.id, submission.agencyId),
    columns: { slug: true },
  });

  revalidatePath("/admin/agency-team-proposals");
  revalidatePath("/dashboard/agency");
  if (agency?.slug) revalidatePath(`/agency/${agency.slug}`);

  return { success: true, status: overallStatus };
}

/**
 * Admin: list pending submissions with hydrated proposal items + agency name.
 * Used by the moderation queue.
 */
export async function listPendingAgencyTeamSubmissionsAction() {
  await resolveAdmin();

  const submissions = await db.query.agencyTeamRelationSubmissions.findMany({
    where: eq(agencyTeamRelationSubmissions.status, "pending"),
    orderBy: desc(agencyTeamRelationSubmissions.submittedAt),
  });

  const enriched = await Promise.all(
    submissions.map(async (s) => {
      const [agency, items] = await Promise.all([
        db.query.agencyProfiles.findFirst({
          where: eq(agencyProfiles.id, s.agencyId),
          columns: { id: true, name: true, slug: true, logoUrl: true },
        }),
        db.query.agencyTeamRelationProposals.findMany({
          where: eq(agencyTeamRelationProposals.submissionId, s.id),
        }),
      ]);

      const itemsWithTeam = await Promise.all(
        items.map(async (it) => {
          if (!it.teamId) return { ...it, team: null };
          const team = await db.query.teams.findFirst({
            where: eq(teams.id, it.teamId),
            columns: { id: true, name: true, country: true, countryCode: true, crestUrl: true, slug: true },
          });
          return { ...it, team };
        }),
      );

      return { submission: s, agency, items: itemsWithTeam };
    }),
  );

  return enriched;
}
