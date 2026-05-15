import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema/index.js";
import { eq } from "drizzle-orm";
const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  await db.update(schema.divisions).set({ crestUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Logo_Ligue_1_McDonald%27s_2024.svg" }).where(eq(schema.divisions.slug, "ligue-1-fr"));
  await db.update(schema.divisions).set({ crestUrl: "https://upload.wikimedia.org/wikipedia/commons/3/38/Logo_Ligue_2_BKT_2024.svg" }).where(eq(schema.divisions.slug, "ligue-2-fr"));
  await db.update(schema.divisions).set({ crestUrl: "https://upload.wikimedia.org/wikipedia/commons/7/70/Championnat_National.png" }).where(eq(schema.divisions.slug, "championnat-national-fr"));
  await db.update(schema.divisions).set({ crestUrl: "https://upload.wikimedia.org/wikipedia/commons/6/67/Championnat_National_2.png" }).where(eq(schema.divisions.slug, "championnat-national-2-fr"));
  await db.update(schema.divisions).set({ crestUrl: "https://upload.wikimedia.org/wikipedia/commons/4/49/Championnat_National_3.png" }).where(eq(schema.divisions.slug, "championnat-national-3-fr"));
  
  console.log("Updated FR crests!");
  process.exit(0);
}
main();
