"use client";

import * as React from "react";
import TeamsTableUI from "./TeamsTableUI";
import type { TeamRow } from "./types";

export default function TeamsPanel({ initialItems }: { initialItems: TeamRow[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Equipos</h2>
        <p className="text-sm text-neutral-500">
          Listado completo. Ordená por columna y gestioná solicitudes pendientes.
        </p>
      </div>
      <TeamsTableUI items={initialItems} />
    </div>
  );
}
