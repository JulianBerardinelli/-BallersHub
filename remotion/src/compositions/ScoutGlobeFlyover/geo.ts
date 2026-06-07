// Atlas del mundo (igual que el componente real `src/components/scouting/ScoutGlobe.tsx`):
// world-atlas topojson → FeatureCollection de países + retícula.
import { geoGraticule10 } from "d3-geo";
import type { FeatureCollection } from "geojson";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";

type AtlasTopology = Parameters<typeof feature>[0];
const TOPO = worldAtlas as unknown as AtlasTopology;

export const COUNTRIES = feature(
  TOPO,
  TOPO.objects.countries,
) as unknown as FeatureCollection;

export const GRATICULE = geoGraticule10();
