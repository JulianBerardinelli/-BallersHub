import { loadEnvConfig } from '@next/env';
loadEnvConfig('./');
import { db } from "./src/lib/db";
import { agencyProfiles } from "./src/db/schema/agencies";

async function run() {
  try {
    const agencies = await db.select().from(agencyProfiles);
    console.log("Agencies in DB:", agencies.map(a => ({ id: a.id, name: a.name, slug: a.slug })));
  } catch (err) {
    console.error("DB Query failed:", (err as Error).message);
  }
  process.exit(0);
}
run();
