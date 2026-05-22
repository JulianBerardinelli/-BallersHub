/**
 * Seed local — un único jugador Pro completo para validar los fixes visuales
 * del layout Athlete Pro en localhost (worktree dev branch que arranca vacía).
 *
 * Slug fijo: `/felipe-sarra`. Theme layout = "pro" (no "free"), subscripción
 * Pro activa, hero/model urls públicos, career de 6 etapas con stats y honours,
 * 6 piezas de media (3 fotos + 3 videos YouTube).
 *
 * Uso: `npx tsx scripts/seed-felipe-pro.ts`
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { createClient } from "@supabase/supabase-js";
import * as schema from "../src/db/schema/index.js";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// Cliente admin (service role) — necesario para crear el usuario auth.users
// que satisface el FK player_profiles.user_id → auth.users(id).
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const SLUG = "felipe-sarra";
const SEED_EMAIL = "felipe.sarra+seed@ballershub.dev";

async function main() {
  console.log("→ Seeding Felipe Sarrá (Pro) en", process.env.DATABASE_URL?.replace(/:[^:@/]+@/, ":***@"));

  // Si ya existe, lo borramos para idempotencia (cascada limpia children).
  const existing = await db.query.playerProfiles.findFirst({ where: (p) => eq(p.slug, SLUG) });
  if (existing) {
    console.log("  · Player ya existe, borrando para re-seed…");
    await db.delete(schema.playerProfiles).where(eq(schema.playerProfiles.id, existing.id));
    await db.delete(schema.subscriptions).where(eq(schema.subscriptions.userId, existing.userId));
    // El auth.users.delete cascadeará gracias al ON DELETE CASCADE del FK.
    try {
      await supabaseAdmin.auth.admin.deleteUser(existing.userId);
    } catch {
      // ignore — el user puede ya no existir.
    }
  }

  // 0) Crear (o reusar) usuario auth.users para satisfacer el FK
  let userId: string;
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
  const existingAuth = list?.users?.find((u) => u.email === SEED_EMAIL);
  if (existingAuth) {
    console.log("  · Auth user ya existía, reusando id:", existingAuth.id);
    userId = existingAuth.id;
  } else {
    const created = await supabaseAdmin.auth.admin.createUser({
      email: SEED_EMAIL,
      password: randomUUID(),
      email_confirm: true,
      user_metadata: { seed: true, slug: SLUG },
    });
    if (created.error || !created.data?.user) {
      throw new Error(`No pude crear auth user: ${created.error?.message ?? "unknown"}`);
    }
    userId = created.data.user.id;
    console.log("  · Auth user creado:", userId);
  }

  // 1) Divisions
  const divFfcm = randomUUID();
  const divAr1 = randomUUID();
  const divEs3 = randomUUID();
  await db.insert(schema.divisions).values([
    { id: divFfcm, countryCode: "ES", name: "2ª Autonómica FFCM",         slug: `2-aut-ffcm-${Date.now()}`, level: 7, status: "approved" },
    { id: divAr1,  countryCode: "AR", name: "Primera División Argentina", slug: `arg-1-${Date.now()}`,     level: 1, status: "approved" },
    { id: divEs3,  countryCode: "ES", name: "Tercera Federación",         slug: `es-3-fed-${Date.now()}`,  level: 5, status: "approved" },
  ]);

  // 2) Teams
  const tManchego = randomUUID();
  const tMoralo = randomUUID();
  const tPlatense = randomUUID();
  const tInterIbiza = randomUUID();
  const tSanSeb = randomUUID();
  await db.insert(schema.teams).values([
    { id: tManchego,   slug: `cd-manchego-${Date.now()}`,      name: "CD Manchego",      country: "España",    countryCode: "ES", kind: "club", status: "approved", divisionId: divFfcm },
    { id: tMoralo,     slug: `moralo-cp-b-${Date.now()}`,      name: "Moralo CP B",      country: "España",    countryCode: "ES", kind: "club", status: "approved", divisionId: divFfcm },
    { id: tPlatense,   slug: `ca-platense-${Date.now()}`,      name: "CA Platense",      country: "Argentina", countryCode: "AR", kind: "club", status: "approved", divisionId: divAr1 },
    { id: tInterIbiza, slug: `inter-ibiza-cd-${Date.now()}`,   name: "Inter Ibiza CD",   country: "España",    countryCode: "ES", kind: "club", status: "approved", divisionId: divEs3 },
    { id: tSanSeb,     slug: `ud-san-sebastian-${Date.now()}`, name: "UD San Sebastián", country: "España",    countryCode: "ES", kind: "club", status: "approved", divisionId: divEs3 },
  ]);

  // 3) Player profile
  const playerId = randomUUID();
  await db.insert(schema.playerProfiles).values({
    id: playerId,
    userId,
    slug: SLUG,
    fullName: "Felipe Sarrá",
    birthDate: "2003-05-12",
    nationality: ["Argentina", "Italia"],
    nationalityCodes: ["AR", "IT"],
    foot: "right",
    heightCm: 178,
    weightKg: 74,
    positions: ["Segundo Delantero", "Centrodelantero"],
    currentClub: "CD Manchego",
    currentTeamId: tManchego,
    topCharacteristics: [
      "Versatilidad Ofensiva",
      "Juego Aéreo",
      "Movilidad",
      "Presión Alta",
      "Inteligencia Táctica",
      "Definición",
      "Juego de Espaldas",
      "Asociatividad",
      "Liderazgo",
      "Intensidad Competitiva",
    ],
    tacticsAnalysis:
      "Jugador inteligente y bien posicionado, con lectura constante de líneas de pase. Aporta movilidad sin balón para abrir espacios en el bloque rival y juega tanto cerca del área como cayendo a banda para combinar. Aplicado en presión coordinada, ejecuta los conceptos defensivos del equipo con disciplina.",
    physicalAnalysis:
      "Jugador ágil y dinámico, con buena aceleración en distancias cortas y capacidad para sostener esfuerzos de alta intensidad durante el partido. Presenta buena coordinación y equilibrio corporal, además de competitividad en duelos físicos y juego aéreo pese a no ser un delantero de gran estatura. Intensidad constante en presión y movimientos ofensivos.",
    mentalAnalysis:
      "Competitivo, líder de vestuario y referente para los más jóvenes. Mentalidad ganadora, mantiene foco bajo presión y le sobra carácter para sostener al equipo en momentos clave del partido.",
    techniqueAnalysis:
      "Técnica depurada con ambos perfiles. Buen juego de espaldas, calidad en el primer toque y solvencia en la definición dentro del área. Capaz de finalizar tanto a un toque como en jugadas elaboradas.",
    analysisAuthor: "Dante Curi Huespe / Stars Scout",
    planPublic: "pro",
    transfermarktUrl: "https://www.transfermarkt.com/felipe-sarra/profil/spieler/000000",
    beSoccerUrl: "https://es.besoccer.com/jugador/felipe-sarra",
    bio: "Delantero argentino-italiano con base técnica y mentalidad ganadora. Formado en el sub-20 de CA Platense, recaló en España en 2021 para sumar minutos en el Inter Ibiza CD. Tras pasos por UD San Sebastián y Moralo CP B, hoy es referente ofensivo del CD Manchego donde aporta goles, asistencias y carácter en cada partido.",
    heroUrl: "https://erdvpcfjynkhcrqktozd.supabase.co/storage/v1/object/public/player-media/gallery/abadfb88-4692-4cca-91bf-1459480425b2/heroUrl-3f608a7f-a1b1-448e-b8ef-949c99833f56-4bahbi.png",
    modelUrl1: "https://erdvpcfjynkhcrqktozd.supabase.co/storage/v1/object/public/player-media/gallery/abadfb88-4692-4cca-91bf-1459480425b2/heroUrl-3f608a7f-a1b1-448e-b8ef-949c99833f56-4bahbi.png",
    avatarUrl: "/images/player-default.jpg",
    visibility: "public",
    status: "approved",
  });

  // 4) Theme settings — layout pro + paleta azul como en los screenshots
  await db.insert(schema.profileThemeSettings).values({
    playerId,
    layout: "pro",
    primaryColor: "#3B82F6",
    secondaryColor: "#1E3A8A",
    accentColor: "#60A5FA",
    backgroundColor: "#050B18",
    typography: "syncopate",
  });

  // 5) Sections visibility
  await db.insert(schema.profileSectionsVisibility).values([
    { playerId, section: "biography",       visible: true },
    { playerId, section: "tactics",         visible: true },
    { playerId, section: "career-timeline", visible: true },
    { playerId, section: "press",           visible: true },
    { playerId, section: "gallery",         visible: true },
    { playerId, section: "stats",           visible: true },
  ]);

  // 6) Subscription Pro
  await db.insert(schema.subscriptions).values({
    userId,
    plan: "pro",
    status: "active",
    limitsJson: { max_photos: 100, max_videos: 100 },
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    planId: "pro-player",
    currency: "USD",
    processor: "stripe",
    statusV2: "active",
    cancelAtPeriodEnd: false,
  });

  // 7) Career items
  const cPlatense = randomUUID();
  const cInterIbiza = randomUUID();
  const cSanSeb = randomUUID();
  const cManchego1 = randomUUID();
  const cMoralo = randomUUID();
  const cManchego2 = randomUUID();
  await db.insert(schema.careerItems).values([
    { id: cPlatense,    playerId, teamId: tPlatense,   club: "CA Platense",      division: "Primera División Argentina", divisionId: divAr1,  startDate: "2015-01-01", endDate: "2021-06-30" },
    { id: cInterIbiza,  playerId, teamId: tInterIbiza, club: "Inter Ibiza CD",   division: "Tercera Federación",         divisionId: divEs3,  startDate: "2021-07-01", endDate: "2022-06-30" },
    { id: cSanSeb,      playerId, teamId: tSanSeb,     club: "UD San Sebastián", division: "Tercera Federación",         divisionId: divEs3,  startDate: "2022-07-01", endDate: "2023-06-30" },
    { id: cManchego1,   playerId, teamId: tManchego,   club: "CD Manchego",      division: "2ª Autonómica FFCM",         divisionId: divFfcm, startDate: "2023-07-01", endDate: "2024-12-31" },
    { id: cMoralo,      playerId, teamId: tMoralo,     club: "Moralo CP B",      division: "2ª Autonómica FFCM",         divisionId: divFfcm, startDate: "2025-01-01", endDate: "2025-06-30" },
    { id: cManchego2,   playerId, teamId: tManchego,   club: "CD Manchego",      division: "2ª Autonómica FFCM",         divisionId: divFfcm, startDate: "2025-07-01", endDate: null },
  ]);

  // 8) Stats por season
  await db.insert(schema.statsSeasons).values([
    { playerId, season: "2020-21", matches: 22, starts: 18, goals:  8, assists: 3, minutes: 1620, yellowCards: 4, redCards: 0, competition: "Reserva Argentina",  team: "CA Platense",      careerItemId: cPlatense },
    { playerId, season: "2021-22", matches: 28, starts: 24, goals: 10, assists: 5, minutes: 2160, yellowCards: 6, redCards: 0, competition: "Tercera Federación", team: "Inter Ibiza CD",   careerItemId: cInterIbiza },
    { playerId, season: "2022-23", matches: 26, starts: 21, goals:  7, assists: 6, minutes: 1880, yellowCards: 5, redCards: 1, competition: "Tercera Federación", team: "UD San Sebastián", careerItemId: cSanSeb },
    { playerId, season: "2023-24", matches: 30, starts: 27, goals: 12, assists: 8, minutes: 2430, yellowCards: 4, redCards: 0, competition: "2ª Autonómica",      team: "CD Manchego",      careerItemId: cManchego1 },
    { playerId, season: "2024-25", matches: 14, starts: 12, goals:  5, assists: 2, minutes: 1020, yellowCards: 2, redCards: 0, competition: "2ª Autonómica",      team: "Moralo CP B",      careerItemId: cMoralo },
    { playerId, season: "2025-26", matches: 18, starts: 17, goals:  3, assists: 4, minutes: 1213, yellowCards: 3, redCards: 0, competition: "2ª Autonómica",      team: "CD Manchego",      careerItemId: cManchego2 },
  ]);

  // 9) Media
  await db.insert(schema.playerMedia).values([
    { playerId, type: "photo", url: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1400&q=80", title: "Sarrá en acción",            altText: "Felipe Sarrá rematando al arco rival", isPrimary: false, isApproved: true },
    { playerId, type: "photo", url: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=1400&q=80", title: "Celebración del gol",         altText: "Felipe Sarrá celebrando un gol",       isPrimary: false, isApproved: true },
    { playerId, type: "photo", url: "https://images.unsplash.com/photo-1486116736668-33d99c6f2c2c?w=1400&q=80", title: "Concentración",                altText: "Felipe Sarrá en el partido",           isPrimary: false, isApproved: true },
    { playerId, type: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",                              title: "Highlights 2024-25",          altText: null,                                  isPrimary: true,  isApproved: true, provider: "youtube" },
    { playerId, type: "video", url: "https://www.youtube.com/watch?v=9bZkp7q19f0",                              title: "Goles destacados Moralo",     altText: null,                                  isPrimary: false, isApproved: true, provider: "youtube" },
    { playerId, type: "video", url: "https://www.youtube.com/watch?v=L_jWHffIx5E",                              title: "Highlights UD San Sebastián", altText: null,                                  isPrimary: false, isApproved: true, provider: "youtube" },
  ]);

  // 10) External links
  await db.insert(schema.playerLinks).values([
    { playerId, label: "Perfil oficial", url: "https://www.transfermarkt.com/felipe-sarra/profil/spieler/000000", kind: "transfermarkt", isPrimary: true  },
    { playerId, label: "Perfil oficial", url: "https://es.besoccer.com/jugador/felipe-sarra",                     kind: "besoccer",      isPrimary: false },
  ]);

  // 11) Honours
  await db.insert(schema.playerHonours).values([
    { playerId, title: "Botín de oro",    competition: "Tercera Federación", season: "2021-22", careerItemId: cInterIbiza, description: "Máximo goleador del campeonato" },
    { playerId, title: "MVP de la fecha", competition: "2ª Autonómica",      season: "2024-25", careerItemId: cManchego1,  description: "Doblete en el clásico" },
  ]);

  console.log(`✓ Seed completo. Visit http://localhost:3002/${SLUG}`);
  await sql.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
