import { db } from "@/lib/db";

export default async function StatsAndMarketModule({ playerId }: { playerId: string }) {
  // Fetch stats asynchronously
  const stats = await db.query.statsSeasons.findMany({
    where: (s, { eq }) => eq(s.playerId, playerId),
  });

  return (
    <section id="stats" className="relative z-40 bg-transparent py-16 px-6 md:px-12 max-w-[1400px] w-full mx-auto">
      <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10" />
      <div className="relative z-10 p-12">
        <h3 className="text-4xl font-heading font-black text-white">STATISTICS</h3>
        <p className="text-white/50">{stats.length > 0 ? JSON.stringify(stats) : "No stats registered."}</p>
      </div>
    </section>
  );
}
