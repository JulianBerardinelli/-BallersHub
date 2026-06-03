"use client";

// CityPicker — cascading country→city combobox (scouting Phase 2).
//
// Given a team's ISO-2 country, searches that country's cities (with coords)
// via /api/cities and, on selection, hands back the city name + lat/lon so the
// caller can persist the team's location. The heavy cities dataset stays
// server-side; this only fetches the handful of matches as the admin types.

import * as React from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/react";

export type CitySelection = {
  city: string;
  latitude: number;
  longitude: number;
};

type CityOption = {
  name: string;
  state: string | null;
  latitude: number;
  longitude: number;
};

const cityKey = (c: CityOption) => `${c.name}|${c.latitude}|${c.longitude}`;

export default function CityPicker({
  countryCode,
  city,
  onSelect,
  isDisabled,
}: {
  /** ISO-2 of the team's country. Empty → picker disabled. */
  countryCode: string | null | undefined;
  /** Currently stored city name (initial input value). */
  city: string | null | undefined;
  onSelect: (selection: CitySelection) => void;
  isDisabled?: boolean;
}) {
  const cc = (countryCode ?? "").toUpperCase().slice(0, 2);
  const [items, setItems] = React.useState<CityOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = React.useCallback(
    (q: string) => {
      if (timer.current) clearTimeout(timer.current);
      if (!/^[A-Z]{2}$/.test(cc)) {
        setItems([]);
        return;
      }
      timer.current = setTimeout(async () => {
        setLoading(true);
        try {
          const res = await fetch(
            `/api/cities?country=${cc}&q=${encodeURIComponent(q)}&limit=25`,
          );
          const json = (await res.json()) as { cities?: CityOption[] };
          setItems(Array.isArray(json.cities) ? json.cities : []);
        } catch {
          setItems([]);
        } finally {
          setLoading(false);
        }
      }, 250);
    },
    [cc],
  );

  return (
    <Autocomplete
      // Remount when the country changes so the picker resets cleanly.
      key={cc || "no-country"}
      size="sm"
      label="Ciudad del club"
      placeholder={cc ? "Buscá la ciudad…" : "Elegí primero el código país"}
      isDisabled={isDisabled || !cc}
      defaultInputValue={city ?? ""}
      isLoading={loading}
      items={items}
      allowsCustomValue
      onInputChange={search}
      onSelectionChange={(key) => {
        if (key == null) return;
        const sel = items.find((c) => cityKey(c) === key);
        if (sel) {
          onSelect({
            city: sel.name,
            latitude: sel.latitude,
            longitude: sel.longitude,
          });
        }
      }}
      description="Define la ubicación del club en el globo de scouting."
    >
      {(c: CityOption) => (
        <AutocompleteItem key={cityKey(c)} textValue={c.name}>
          {c.state ? `${c.name} · ${c.state}` : c.name}
        </AutocompleteItem>
      )}
    </Autocomplete>
  );
}
