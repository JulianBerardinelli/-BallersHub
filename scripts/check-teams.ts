import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema/index.js";
import { ilike } from "drizzle-orm";
const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  const t = await db.query.teams.findMany({
    where: ilike(schema.teams.slug, '%independiente%'),
    columns: { id: true, slug: true, name: true }
  });
  console.log(t);
  process.exit(0);
}
main();
