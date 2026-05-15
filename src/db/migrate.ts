import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const runMigration = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  let migrationUrl = process.env.DATABASE_URL;
  if (migrationUrl.includes(".pooler.supabase.com")) {
      migrationUrl = migrationUrl.replace(/aws-[0-9]-[a-z]+\-[a-z]+\-[0-9]+\.pooler\.supabase\.com/, "db.ygansmlplzzwkjdmlqtu.supabase.co");
      // Fix auth: remove the project ref from the username for direct connection
      migrationUrl = migrationUrl.replace("postgres.ygansmlplzzwkjdmlqtu", "postgres");
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
