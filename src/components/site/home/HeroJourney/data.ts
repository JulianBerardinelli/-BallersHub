// HeroJourney — sample scouting data for the globe + floating player tags.
// Ported from the Claude Design prototype (self-contained mock). Swap for real
// Supabase data later; shapes are intentionally small/independent.

export type ScoutCity = { lat: number; lon: number; name: string; country: string; cc: string };
export type ScoutPlayer = {
  id: number;
  name: string;
  age: number;
  pos: string;
  club: string;
  league: string;
  city: string;
  nationality: string;
  contract: "free" | "contracted";
  foot: "D" | "I";
  height: number;
  rating: number;
  init: string;
};
export type ScoutCountry = { code: string; name: string };

export const SCOUT_CITIES: Record<string, ScoutCity> = {
  buenos_aires: { lat: -34.61, lon: -58.38, name: "Buenos Aires", country: "Argentina", cc: "AR" },
  la_plata: { lat: -34.92, lon: -57.95, name: "La Plata", country: "Argentina", cc: "AR" },
  rosario: { lat: -32.94, lon: -60.65, name: "Rosario", country: "Argentina", cc: "AR" },
  rio: { lat: -22.91, lon: -43.17, name: "Rio de Janeiro", country: "Brasil", cc: "BR" },
  sao_paulo: { lat: -23.55, lon: -46.63, name: "São Paulo", country: "Brasil", cc: "BR" },
  porto_alegre: { lat: -30.03, lon: -51.23, name: "Porto Alegre", country: "Brasil", cc: "BR" },
  santos: { lat: -23.96, lon: -46.33, name: "Santos", country: "Brasil", cc: "BR" },
  montevideo: { lat: -34.9, lon: -56.19, name: "Montevideo", country: "Uruguay", cc: "UY" },
  asuncion: { lat: -25.3, lon: -57.64, name: "Asunción", country: "Paraguay", cc: "PY" },
  santiago: { lat: -33.45, lon: -70.66, name: "Santiago", country: "Chile", cc: "CL" },
  lima: { lat: -12.05, lon: -77.04, name: "Lima", country: "Perú", cc: "PE" },
  bogota: { lat: 4.71, lon: -74.07, name: "Bogotá", country: "Colombia", cc: "CO" },
  medellin: { lat: 6.25, lon: -75.58, name: "Medellín", country: "Colombia", cc: "CO" },
  quito: { lat: -0.18, lon: -78.47, name: "Quito", country: "Ecuador", cc: "EC" },
  madrid: { lat: 40.42, lon: -3.7, name: "Madrid", country: "España", cc: "ES" },
  barcelona: { lat: 41.39, lon: 2.17, name: "Barcelona", country: "España", cc: "ES" },
  sevilla: { lat: 37.39, lon: -5.99, name: "Sevilla", country: "España", cc: "ES" },
  san_sebastian: { lat: 43.32, lon: -1.98, name: "San Sebastián", country: "España", cc: "ES" },
  manchester: { lat: 53.48, lon: -2.24, name: "Manchester", country: "Inglaterra", cc: "GB" },
  liverpool: { lat: 53.41, lon: -2.99, name: "Liverpool", country: "Inglaterra", cc: "GB" },
  london: { lat: 51.51, lon: -0.13, name: "Londres", country: "Inglaterra", cc: "GB" },
  munich: { lat: 48.14, lon: 11.58, name: "Múnich", country: "Alemania", cc: "DE" },
  dortmund: { lat: 51.51, lon: 7.47, name: "Dortmund", country: "Alemania", cc: "DE" },
  leipzig: { lat: 51.34, lon: 12.37, name: "Leipzig", country: "Alemania", cc: "DE" },
  milan: { lat: 45.47, lon: 9.19, name: "Milán", country: "Italia", cc: "IT" },
  turin: { lat: 45.07, lon: 7.69, name: "Turín", country: "Italia", cc: "IT" },
  rome: { lat: 41.9, lon: 12.5, name: "Roma", country: "Italia", cc: "IT" },
  naples: { lat: 40.84, lon: 14.25, name: "Nápoles", country: "Italia", cc: "IT" },
  paris: { lat: 48.86, lon: 2.35, name: "París", country: "Francia", cc: "FR" },
  lyon: { lat: 45.76, lon: 4.84, name: "Lyon", country: "Francia", cc: "FR" },
  marseille: { lat: 43.3, lon: 5.37, name: "Marsella", country: "Francia", cc: "FR" },
  porto: { lat: 41.15, lon: -8.61, name: "Porto", country: "Portugal", cc: "PT" },
  lisbon: { lat: 38.72, lon: -9.14, name: "Lisboa", country: "Portugal", cc: "PT" },
  amsterdam: { lat: 52.37, lon: 4.89, name: "Amsterdam", country: "Países Bajos", cc: "NL" },
  istanbul: { lat: 41.01, lon: 28.98, name: "Estambul", country: "Turquía", cc: "TR" },
  brussels: { lat: 50.85, lon: 4.35, name: "Bruselas", country: "Bélgica", cc: "BE" },
};

export const SCOUT_PLAYERS: ScoutPlayer[] = [
  { id: 1, name: "Mateo Albornoz", age: 19, pos: "EXI", club: "River Plate", league: "Liga Profesional", city: "buenos_aires", nationality: "AR", contract: "free", foot: "D", height: 178, rating: 86, init: "MA" },
  { id: 2, name: "Tomás Vázquez", age: 21, pos: "MCO", club: "Boca Juniors", league: "Liga Profesional", city: "buenos_aires", nationality: "AR", contract: "contracted", foot: "I", height: 175, rating: 84, init: "TV" },
  { id: 3, name: "Iván Soler", age: 23, pos: "DC", club: "Vélez Sarsfield", league: "Liga Profesional", city: "buenos_aires", nationality: "AR", contract: "contracted", foot: "D", height: 184, rating: 87, init: "IS" },
  { id: 4, name: "Lucas Bermúdez", age: 18, pos: "DFC", club: "Estudiantes", league: "Liga Profesional", city: "la_plata", nationality: "AR", contract: "free", foot: "D", height: 187, rating: 81, init: "LB" },
  { id: 5, name: "Joaquín Roldán", age: 20, pos: "MC", club: "Newell's", league: "Liga Profesional", city: "rosario", nationality: "AR", contract: "contracted", foot: "D", height: 180, rating: 82, init: "JR" },
  { id: 6, name: "Bruno Castillo", age: 22, pos: "LI", club: "Independiente", league: "Liga Profesional", city: "buenos_aires", nationality: "AR", contract: "free", foot: "I", height: 176, rating: 80, init: "BC" },
  { id: 7, name: "Rafael Moura", age: 19, pos: "EXD", club: "Flamengo", league: "Brasileirão", city: "rio", nationality: "BR", contract: "contracted", foot: "I", height: 174, rating: 88, init: "RM" },
  { id: 8, name: "João Pedro Lima", age: 20, pos: "DC", club: "Palmeiras", league: "Brasileirão", city: "sao_paulo", nationality: "BR", contract: "contracted", foot: "D", height: 182, rating: 85, init: "JL" },
  { id: 9, name: "Vinícius Andrade", age: 24, pos: "MCD", club: "São Paulo FC", league: "Brasileirão", city: "sao_paulo", nationality: "BR", contract: "contracted", foot: "D", height: 183, rating: 83, init: "VA" },
  { id: 10, name: "Caio Mendes", age: 17, pos: "MCO", club: "Santos", league: "Brasileirão", city: "santos", nationality: "BR", contract: "free", foot: "I", height: 172, rating: 79, init: "CM" },
  { id: 11, name: "Gabriel Souza", age: 22, pos: "POR", club: "Internacional", league: "Brasileirão", city: "porto_alegre", nationality: "BR", contract: "contracted", foot: "D", height: 191, rating: 84, init: "GS" },
  { id: 12, name: "Diego Cabrera", age: 21, pos: "DC", club: "Peñarol", league: "Primera UY", city: "montevideo", nationality: "UY", contract: "free", foot: "D", height: 180, rating: 83, init: "DC" },
  { id: 13, name: "Martín Ferreira", age: 19, pos: "MC", club: "Nacional", league: "Primera UY", city: "montevideo", nationality: "UY", contract: "contracted", foot: "D", height: 178, rating: 81, init: "MF" },
  { id: 14, name: "Ramón Núñez", age: 18, pos: "EXI", club: "Olimpia", league: "Primera PY", city: "asuncion", nationality: "PY", contract: "free", foot: "D", height: 173, rating: 79, init: "RN" },
  { id: 15, name: "Cristóbal Rojas", age: 23, pos: "DFC", club: "Univ. de Chile", league: "Primera CL", city: "santiago", nationality: "CL", contract: "contracted", foot: "D", height: 188, rating: 82, init: "CR" },
  { id: 16, name: "Sebastián Vargas", age: 20, pos: "LD", club: "Colo-Colo", league: "Primera CL", city: "santiago", nationality: "CL", contract: "free", foot: "D", height: 177, rating: 80, init: "SV" },
  { id: 17, name: "Juan David Restrepo", age: 21, pos: "EXD", club: "Atl. Nacional", league: "Liga BetPlay", city: "medellin", nationality: "CO", contract: "contracted", foot: "I", height: 175, rating: 83, init: "JR" },
  { id: 18, name: "Andrés Quintero", age: 22, pos: "MCO", club: "Millonarios", league: "Liga BetPlay", city: "bogota", nationality: "CO", contract: "contracted", foot: "I", height: 177, rating: 82, init: "AQ" },
  { id: 19, name: "Luis Pacheco", age: 24, pos: "DC", club: "LDU Quito", league: "LigaPro EC", city: "quito", nationality: "EC", contract: "free", foot: "D", height: 185, rating: 81, init: "LP" },
  { id: 20, name: "Felipe Aragón", age: 20, pos: "MCD", club: "Sporting Cristal", league: "Liga 1 PE", city: "lima", nationality: "PE", contract: "contracted", foot: "D", height: 181, rating: 80, init: "FA" },
  { id: 21, name: "Pablo Iniesta", age: 22, pos: "MCO", club: "Real Madrid", league: "LaLiga", city: "madrid", nationality: "ES", contract: "contracted", foot: "D", height: 178, rating: 89, init: "PI" },
  { id: 22, name: "Álvaro Núñez", age: 25, pos: "DC", club: "Atl. Madrid", league: "LaLiga", city: "madrid", nationality: "ES", contract: "contracted", foot: "D", height: 186, rating: 87, init: "AN" },
  { id: 23, name: "Eric Camps", age: 19, pos: "EXI", club: "FC Barcelona", league: "LaLiga", city: "barcelona", nationality: "ES", contract: "contracted", foot: "D", height: 174, rating: 86, init: "EC" },
  { id: 24, name: "Iker Sáez", age: 23, pos: "DFC", club: "Real Sociedad", league: "LaLiga", city: "san_sebastian", nationality: "ES", contract: "free", foot: "I", height: 189, rating: 84, init: "IS" },
  { id: 25, name: "Hugo Sevilla", age: 21, pos: "MC", club: "Sevilla FC", league: "LaLiga", city: "sevilla", nationality: "ES", contract: "contracted", foot: "D", height: 180, rating: 82, init: "HS" },
  { id: 26, name: "Jamie Whitlock", age: 20, pos: "EXD", club: "Manchester City", league: "Premier League", city: "manchester", nationality: "GB", contract: "contracted", foot: "I", height: 176, rating: 87, init: "JW" },
  { id: 27, name: "Owen Bradley", age: 22, pos: "MCD", club: "Liverpool FC", league: "Premier League", city: "liverpool", nationality: "GB", contract: "contracted", foot: "D", height: 184, rating: 85, init: "OB" },
  { id: 28, name: "Theo Aldridge", age: 18, pos: "DC", club: "Arsenal", league: "Premier League", city: "london", nationality: "GB", contract: "contracted", foot: "D", height: 188, rating: 84, init: "TA" },
  { id: 29, name: "Lukas Brandt", age: 21, pos: "MCO", club: "Bayern Múnich", league: "Bundesliga", city: "munich", nationality: "DE", contract: "contracted", foot: "D", height: 181, rating: 88, init: "LB" },
  { id: 30, name: "Niklas Wagner", age: 19, pos: "LD", club: "B. Dortmund", league: "Bundesliga", city: "dortmund", nationality: "DE", contract: "free", foot: "D", height: 179, rating: 83, init: "NW" },
  { id: 31, name: "Felix Krüger", age: 23, pos: "EXD", club: "RB Leipzig", league: "Bundesliga", city: "leipzig", nationality: "DE", contract: "contracted", foot: "I", height: 175, rating: 84, init: "FK" },
  { id: 32, name: "Marco Brescia", age: 24, pos: "DC", club: "AC Milan", league: "Serie A", city: "milan", nationality: "IT", contract: "contracted", foot: "D", height: 187, rating: 86, init: "MB" },
  { id: 33, name: "Davide Conti", age: 21, pos: "MC", club: "Inter Milán", league: "Serie A", city: "milan", nationality: "IT", contract: "contracted", foot: "D", height: 182, rating: 85, init: "DC" },
  { id: 34, name: "Andrea Bellucci", age: 20, pos: "EXI", club: "Juventus", league: "Serie A", city: "turin", nationality: "IT", contract: "free", foot: "D", height: 173, rating: 82, init: "AB" },
  { id: 35, name: "Riccardo Vento", age: 22, pos: "POR", club: "AS Roma", league: "Serie A", city: "rome", nationality: "IT", contract: "contracted", foot: "D", height: 192, rating: 84, init: "RV" },
  { id: 36, name: "Salvatore Greco", age: 19, pos: "MCO", club: "SSC Napoli", league: "Serie A", city: "naples", nationality: "IT", contract: "free", foot: "I", height: 176, rating: 81, init: "SG" },
  { id: 37, name: "Hugo Lefèvre", age: 23, pos: "DC", club: "PSG", league: "Ligue 1", city: "paris", nationality: "FR", contract: "contracted", foot: "D", height: 184, rating: 87, init: "HL" },
  { id: 38, name: "Theo Bernard", age: 18, pos: "EXD", club: "Olympique Lyon", league: "Ligue 1", city: "lyon", nationality: "FR", contract: "free", foot: "I", height: 174, rating: 80, init: "TB" },
  { id: 39, name: "Tiago Alves", age: 20, pos: "MC", club: "FC Porto", league: "Primeira Liga", city: "porto", nationality: "PT", contract: "contracted", foot: "D", height: 179, rating: 83, init: "TA" },
  { id: 40, name: "Diogo Pimenta", age: 21, pos: "EXI", club: "SL Benfica", league: "Primeira Liga", city: "lisbon", nationality: "PT", contract: "contracted", foot: "I", height: 177, rating: 85, init: "DP" },
];

export const SCOUT_COUNTRIES: ScoutCountry[] = [
  { code: "AR", name: "Argentina" },
  { code: "BR", name: "Brasil" },
  { code: "UY", name: "Uruguay" },
  { code: "PY", name: "Paraguay" },
  { code: "CL", name: "Chile" },
  { code: "PE", name: "Perú" },
  { code: "CO", name: "Colombia" },
  { code: "EC", name: "Ecuador" },
  { code: "ES", name: "España" },
  { code: "GB", name: "Inglaterra" },
  { code: "DE", name: "Alemania" },
  { code: "IT", name: "Italia" },
  { code: "FR", name: "Francia" },
  { code: "PT", name: "Portugal" },
  { code: "NL", name: "Países Bajos" },
  { code: "TR", name: "Turquía" },
  { code: "BE", name: "Bélgica" },
];

export const byId = (id: number): ScoutPlayer | undefined => SCOUT_PLAYERS.find((p) => p.id === id);

// Featured players anchored to cities — one floating tag shows for whichever
// featured city is most face-on as the globe turns.
export type Featured = { city: string; id: number; place: "tr" | "bl" };
export const HJ_FEATURED: Featured[] = [
  { city: "buenos_aires", id: 3, place: "tr" },
  { city: "sao_paulo", id: 8, place: "bl" },
  { city: "madrid", id: 21, place: "tr" },
  { city: "manchester", id: 26, place: "bl" },
];

// ── Normalized globe payload (real or mock feed the SAME shape) ──────────────
/** The fields a floating PlayerTag needs, pre-normalized (market value already formatted). */
export type TagPlayer = {
  name: string;
  nationality: string | null; // ISO-2
  pos: string; // position code
  club: string | null;
  age: number | null;
  foot: "D" | "I" | "A" | null;
  contract: "free" | "contracted";
  init: string;
  marketLabel: string; // e.g. "€444K" / "€1.2M"
  /** Real player photo (Supabase) — null/undefined → gradient + initials fallback. */
  avatarUrl?: string | null;
  /** Real club crest (Supabase) — null/undefined → generated shield fallback. */
  crestUrl?: string | null;
};

/** Everything the globe + tags need, independent of where the data came from. */
export type HeroGlobeData = {
  /** One entry per player, for the country-density heat (only `nationality` is read). */
  players: { nationality: string | null }[];
  /** city key → coordinates + name + country (ISO-2). */
  cities: Record<string, { lat: number; lon: number; name: string; cc: string }>;
  /** Curated cards anchored to cities (one shows at a time as the globe turns). */
  featured: { city: string; place: "tr" | "bl"; player: TagPlayer }[];
};

// mock market value (deterministic from rating/age) — only seeds the mock payload
const mockMarketLabel = (rating: number, age: number) => {
  const m = Math.max(8, Math.round(Math.pow(Math.max(0, rating - 72), 2) * 2.2 - age * 3 + 18));
  return m >= 1000 ? `€${(m / 1000).toFixed(1)}M` : `€${m}K`;
};

/** Fallback payload shown when real scouting data has no geo yet. */
export const MOCK_GLOBE_DATA: HeroGlobeData = {
  players: SCOUT_PLAYERS.map((p) => ({ nationality: p.nationality })),
  cities: Object.fromEntries(
    Object.entries(SCOUT_CITIES).map(([k, c]) => [k, { lat: c.lat, lon: c.lon, name: c.name, cc: c.cc }]),
  ),
  featured: HJ_FEATURED.flatMap((f) => {
    const p = byId(f.id);
    if (!p) return [];
    return [
      {
        city: f.city,
        place: f.place,
        player: {
          name: p.name, nationality: p.nationality, pos: p.pos, club: p.club,
          age: p.age, foot: p.foot, contract: p.contract, init: p.init,
          marketLabel: mockMarketLabel(p.rating, p.age),
        },
      },
    ];
  }),
};
