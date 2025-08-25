"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Input, Button, Chip, Spinner } from "@heroui/react";

export type TeamLite = {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  crest_url: string | null;
};

export type TeamPickerValue =
  | { mode: "approved"; teamId: string; teamName: string; country?: string | null }
  | { mode: "new"; name: string; country?: string | null }
  | { mode: "free" };

export default function TeamPicker({
  applicationId,                   // si existe, lo usamos para auto-crear request
  defaultValue,
  onChange,
}: {
  applicationId?: string;          // opcional: si lo pasás y elige "nuevo", disparamos RPC
  defaultValue?: TeamPickerValue;  // opcional para edición
  onChange: (v: TeamPickerValue) => void;
}) {
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TeamLite[]>([]);
  const [picked, setPicked] = useState<TeamPickerValue | null>(defaultValue ?? null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!defaultValue) return;
    setPicked(defaultValue);
    if (defaultValue.mode === "approved") {
      setQ(defaultValue.teamName);
      setCountry(defaultValue.country ?? "");
    }
    if (defaultValue.mode === "new") {
      setQ(defaultValue.name);
      setCountry(defaultValue.country ?? "");
    }
  }, [defaultValue]);

  const doSearch = useCallback(async (term: string) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const trimmed = term.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("search_teams", { p_q: trimmed, p_limit: 8 });
    if (ctrl.signal.aborted) return;
    setLoading(false);
    if (error) {
      console.error("search_teams error:", error.message);
      setResults([]);
      return;
    }
    setResults((data ?? []) as TeamLite[]);
  }, []);

  // debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => { doSearch(q); }, 300);
    return () => clearTimeout(t);
  }, [q, doSearch]);

  const onPickApproved = (t: TeamLite) => {
    const v: TeamPickerValue = { mode: "approved", teamId: t.id, teamName: t.name, country: t.country ?? undefined };
    setPicked(v);
    onChange(v);
  };

  const onPickNew = async () => {
    const name = q.trim();
    const ctry = country.trim() || undefined;
    if (!name) return;
    const v: TeamPickerValue = { mode: "new", name, country: ctry };
    setPicked(v);
    onChange(v);

    // Si tenemos applicationId, generamos la solicitud (RPC) de inmediato
    if (applicationId) {
      const { error } = await supabase.rpc("request_team_from_application", {
        p_application_id: applicationId,
        p_name: name,
        p_country: ctry ?? null,
      });
      if (error) console.error("request_team_from_application error:", error.message);
      // No necesitamos el id del team ahora; el admin lo verá en /admin/teams
    }
  };

  const onPickFree = () => {
    const v: TeamPickerValue = { mode: "free" };
    setPicked(v);
    onChange(v);
  };

  const hasMatches = results.length > 0;
  const showNewOption = q.trim().length > 1 && (!hasMatches || !results.some(r => r.name.toLowerCase() === q.trim().toLowerCase()));

  return (
    <div className="grid gap-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Equipo actual"
            description="Buscá tu equipo por nombre. Si no existe, podés proponerlo."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ej: Boca Juniors"
          />
        </div>
        <div className="w-44">
          <Input
            label="País (opcional)"
            description="Ej: Argentina / AR"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Argentina"
          />
        </div>
      </div>

      <div className="rounded-md border border-neutral-800 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-400">Resultados</p>
          {loading && <Spinner size="sm" />}
        </div>

        {!loading && hasMatches && (
          <ul className="mt-2 grid gap-2">
            {results.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-md bg-neutral-900 p-2">
                <div className="flex items-center gap-3">
                  {/* crest opcional */}
                  <img
                    src={t.crest_url || "/images/team-default.svg"}
                    alt=""
                    width={24}
                    height={24}
                    className="h-6 w-6 rounded-sm object-cover"
                  />
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-neutral-500">
                      {t.country ?? "—"} · @{t.slug}
                    </p>
                  </div>
                </div>
                <Button size="sm" onPress={() => onPickApproved(t)}>
                  Elegir
                </Button>
              </li>
            ))}
          </ul>
        )}

        {!loading && !hasMatches && q.trim() && (
          <p className="mt-2 text-sm text-neutral-500">No encontramos equipos con “{q.trim()}”.</p>
        )}

        {showNewOption && (
          <div className="mt-3">
            <Button variant="flat" onPress={onPickNew}>
              Proponer equipo nuevo: “{q.trim()}”
            </Button>
            <p className="mt-1 text-xs text-neutral-500">
              El equipo no está en nuestra base. Con tu solicitud lo crearemos y verificaremos.
            </p>
          </div>
        )}

        <div className="mt-3">
          <Button variant="bordered" onPress={onPickFree}>
            Soy jugador libre (sin equipo)
          </Button>
        </div>
      </div>

      {picked?.mode === "approved" && (
        <Chip color="success" variant="flat">
          Seleccionado: {picked.teamName} {picked.country ? `· ${picked.country}` : ""}
        </Chip>
      )}
      {picked?.mode === "new" && (
        <Chip color="warning" variant="flat">
          Equipo propuesto: {picked.name} {picked.country ? `· ${picked.country}` : ""}
        </Chip>
      )}
      {picked?.mode === "free" && (
        <Chip color="default" variant="flat">
          Jugador libre
        </Chip>
      )}
    </div>
  );
}
