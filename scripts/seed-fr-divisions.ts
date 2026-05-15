import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema/index.js";
import { eq } from "drizzle-orm";

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const frenchDivisions = [
  { name: "Ligue 1", level: 1 },
  { name: "Ligue 2", level: 2 },
  { name: "Championnat National", level: 3 },
  { name: "Championnat National 2", level: 4 },
  { name: "Championnat National 3", level: 5 },
];

async function main() {
  console.log("Seeding French Divisions...");
  
  for (const div of frenchDivisions) {
    const slug = div.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + "-fr";
    
    // Check if it exists
    const existing = await db.query.divisions.findFirst({
      where: (d, { eq }) => eq(d.slug, slug)
    });

    if (!existing) {
      console.log(`Inserting: ${div.name}`);
      await db.insert(schema.divisions).values({
        countryCode: "FR",
        name: div.name,
        slug: slug,
        level: div.level,
        status: "approved",
        isYouth: false,
      });
    } else {
      console.log(`Skipping ${div.name}, already exists.`);
      // Update just in case
      await db.update(schema.divisions)
        .set({ status: "approved", level: div.level, isYouth: false })
        .where(eq(schema.divisions.slug, slug));
    }
  }

  console.log("Done seeding leagues.");
  process.exit(0);
}

main().catch(e => {
  console.error("Error seeding:", e);
  process.exit(1);
});
