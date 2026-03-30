import postgres from "postgres";
import fs from "fs";

const run = async () => {
  let migrationUrl = process.env.DATABASE_URL!;
  if (migrationUrl.includes(".pooler.supabase.com")) {
      migrationUrl = migrationUrl.replace(/aws-[0-9]-[a-z]+\-[a-z]+\-[0-9]+\.pooler\.supabase\.com/, "db.ygansmlplzzwkjdmlqtu.supabase.co");
      migrationUrl = migrationUrl.replace("postgres.ygansmlplzzwkjdmlqtu", "postgres");
  }

  const sql = postgres(migrationUrl, { max: 1 });
  try {
      const fileContent = fs.readFileSync("src/db/migrations/0014_careful_micromacro.sql", "utf-8");
      const queries = fileContent.split("--> statement-breakpoint");
      for (const q of queries) {
         if (q.trim()) {
             await sql.unsafe(q);
             console.log("Executed SQL statement successfully.");
         }
      }
      console.log("Migration 0014 applied!");
  } catch (err) {
      console.error(err);
  } finally {
      await sql.end();
      process.exit(0);
  }
};

run();
