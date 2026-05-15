import { db } from './src/lib/db';
async function test() {
  const players = await db.query.playerProfiles.findMany({ limit: 10 });
  for (const p of players) {
    if (p.positions) console.log(p.positions);
  }
  process.exit(0);
}
test();
