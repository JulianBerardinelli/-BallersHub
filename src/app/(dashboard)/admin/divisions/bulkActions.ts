"use server";

import { createSupabaseServerRoute } from "@/lib/supabase/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema/index";
import { sql } from "drizzle-orm";
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

export async function bulkUpsertDivisions(rows: any[]) {
  try {
    const supabase = await createSupabaseServerRoute();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const { data: profile } = await supabase.from("user_profiles").select("role").eq("user_id", user.id).single();
    if (profile?.role !== "admin") throw new Error("No autorizado");

    let successCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      if (!row.name || !row.country_code) {
        errorCount++;
        continue;
      }

      const slug = slugify(row.name) + "-" + row.country_code.toLowerCase();
      
      const payload: any = {
        slug,
        name: row.name,
        countryCode: row.country_code.toUpperCase().substring(0, 2),
        level: row.level ? parseInt(row.level) : null,
        isYouth: row.is_youth === "true" || row.is_youth === "1",
        crestUrl: row.crest_url || "/images/team-default.svg",
        referenceUrl: row.reference_url || null,
        status: "approved",
      };

      try {
        await db.insert(schema.divisions)
          .values(payload)
          .onConflictDoUpdate({
            target: schema.divisions.slug,
            set: {
              name: payload.name,
              level: payload.level,
              isYouth: payload.isYouth,
              crestUrl: payload.crestUrl !== "/images/team-default.svg" ? payload.crestUrl : sql`crest_url`,
              referenceUrl: payload.referenceUrl,
              status: "approved"
            }
          });
        successCount++;
      } catch (err) {
        console.error("Bulk Upsert Error on division:", row.name, err);
        errorCount++;
      }
    }

    revalidatePath("/admin/divisions");
    return { success: successCount, errors: errorCount, message: `Se insertaron/actualizaron ${successCount} divisiones.` };
  } catch (error: any) {
    throw new Error(error.message || "Error procesando el Bulk Upsert de Divisiones.");
  }
}
