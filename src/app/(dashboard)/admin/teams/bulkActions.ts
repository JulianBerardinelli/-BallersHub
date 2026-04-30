"use server";

import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema/index";
import { sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const connection = postgres(process.env.DATABASE_URL!);
const db = drizzle(connection, { schema });

function slugify(input: string) {
  return (input || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const dnEs = new Intl.DisplayNames(["es"], { type: "region", fallback: "code" });

export async function bulkUpsertTeams(rows: any[]) {
  try {
    const supabase = await createSupabaseServerRoute();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const { data: profile } = await supabase.from("user_profiles").select("role").eq("user_id", user.id).single();
    if (profile?.role !== "admin") throw new Error("No autorizado");

    let successCount = 0;
    let errorCount = 0;

    // 1. Resolve Division Slugs to Division IDs
    const divisionSlugs = [...new Set(rows.map(r => r.division_slug).filter(Boolean))];
    
    let divisionMap: Record<string, string> = {}; // { slug: id }
    if (divisionSlugs.length > 0) {
      const matchedDivisions = await db.query.divisions.findMany({
        where: inArray(schema.divisions.slug, divisionSlugs),
        columns: { id: true, slug: true }
      });
      for (const div of matchedDivisions) {
        if (div.slug) divisionMap[div.slug] = div.id;
      }
    }

    // 2. Resolve Existing Teams by Name to prevent duplicates when slug is not provided
    const teamNames = [...new Set(rows.map(r => r.name).filter(Boolean))];
    let existingTeamsMap: Record<string, string> = {}; // { "name-countryCode": slug }
    if (teamNames.length > 0) {
      const matchedTeams = await db.query.teams.findMany({
        where: inArray(schema.teams.name, teamNames),
        columns: { slug: true, name: true, countryCode: true }
      });
      for (const t of matchedTeams) {
        existingTeamsMap[`${t.name.toLowerCase()}-${t.countryCode?.toLowerCase()}`] = t.slug;
      }
    }

    for (const row of rows) {
      if (!row.name || !row.country_code) {
        errorCount++;
        continue;
      }

      // If user provided a slug explicitly in CSV, use it. 
      // Otherwise, check if a team with exact name & country already exists in DB to use its slug.
      // If not found, generate a new safe slug with country suffix.
      let slug = row.slug ? slugify(row.slug) : null;
      if (!slug) {
        const exactMatchSlug = existingTeamsMap[`${row.name.toLowerCase()}-${row.country_code.toLowerCase()}`];
        slug = exactMatchSlug || slugify(row.name) + "-" + row.country_code.toLowerCase();
      }
      
      const divisionId = row.division_slug ? divisionMap[row.division_slug] || null : null;

      const payload: any = {
        slug,
        name: row.name,
        country: dnEs.of(row.country_code.toUpperCase().substring(0, 2)) || null,
        countryCode: row.country_code.toUpperCase().substring(0, 2),
        category: row.category || null,
        divisionId,
        transfermarktUrl: row.transfermarkt_url || null,
        crestUrl: row.crest_url || "/images/team-default.svg",
        status: "approved",
      };

      try {
        await db.insert(schema.teams)
          .values(payload)
          .onConflictDoUpdate({
            target: schema.teams.slug,
            set: {
              name: payload.name,
              country: payload.country,
              countryCode: payload.countryCode,
              category: payload.category,
              divisionId: payload.divisionId,
              transfermarktUrl: payload.transfermarktUrl,
              crestUrl: payload.crestUrl !== "/images/team-default.svg" ? payload.crestUrl : sql`crest_url`,
              status: "approved"
            }
          });
        successCount++;
      } catch (err) {
        console.error("Bulk Upsert Error on team:", row.name, err);
        errorCount++;
      }
    }

    revalidatePath("/admin/teams");
    return { success: successCount, errors: errorCount, message: `Se insertaron/actualizaron ${successCount} equipos.` };
  } catch (error: any) {
    throw new Error(error.message || "Error procesando el Bulk Upsert de Equipos.");
  }
}
