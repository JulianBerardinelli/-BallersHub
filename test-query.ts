import { db } from "./src/lib/db";

async function main() {
  try {
    const user = { id: "79c5777d-5a0e-416a-a7d7-bfbfec9e3c89" };
    const up = await db.query.userProfiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.userId, user.id),
      with: { agency: true },
    });
    console.log(up);
  } catch (e) {
    console.error("ERROR:", e);
  }
  process.exit(0);
}
main();
