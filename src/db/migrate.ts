import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const runMigration = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  // If DATABASE_URL points at the pooler, rewrite it to the direct
  // connection — Supabase's pooler in session mode does not support all the
  // protocol features `drizzle-kit migrate` needs.
  // Project ref is derived from the username (e.g. `postgres.<project_ref>`).
  let migrationUrl = process.env.DATABASE_URL;
  if (migrationUrl.includes(".pooler.supabase.com")) {
    const userMatch = migrationUrl.match(/\/\/postgres\.([a-z0-9]+):/);
    const projectRef = userMatch?.[1];
    if (!projectRef) {
      throw new Error(
        "Cannot derive Supabase project ref from DATABASE_URL — expected username `postgres.<project_ref>`",
      );
    }
    migrationUrl = migrationUrl.replace(
      /aws-[0-9]-[a-z]+-[a-z]+-[0-9]+\.pooler\.supabase\.com:\d+/,
      `db.${projectRef}.supabase.co:5432`,
    );
    migrationUrl = migrationUrl.replace(`postgres.${projectRef}`, "postgres");
  }

  const migrationClient = postgres(migrationUrl, { max: 1 });
  const db = drizzle(migrationClient);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "src/db/migrations" });
  console.log("Migrations applied successfully!");

  await migrationClient.end();
  process.exit(0);
};

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
