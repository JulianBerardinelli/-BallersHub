import { db } from "@/lib/db";
import { careerItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function CareerTimelineModule({ playerId }: { playerId: string }) {
  // Fetch career asynchronously
  const career = await db.select().from(careerItems).where(eq(careerItems.playerId, playerId));

  return (
    <section id="career" className="relative z-40 bg-transparent py-16 px-6 md:px-12 max-w-[1400px] w-full mx-auto">
      <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10" />
      <div className="relative z-10 p-12">
        <h3 className="text-4xl font-heading font-black text-white">CAREER TIMELINE</h3>
        <div className="space-y-4 mt-8">
           {career.length > 0 ? career.map((c) => (
             <div key={c.id} className="text-white/80">{c.club} - {c.startDate}</div>
           )) : <p className="text-white/30">Sin historial registrado.</p>}
        </div>
      </div>
    </section>
  );
}
