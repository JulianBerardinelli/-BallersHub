import { defineConfig } from "drizzle-kit";
import fs from "fs";

try {
  const envLocal = fs.readFileSync(".env.local", "utf-8");
  const match = envLocal.match(/DATABASE_URL=(.*)/);
  if (match) {
    process.env.DATABASE_URL = match[1].trim();
  }
} catch (e) {}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL! },
  verbose: true,
  strict: true,
});
