import type { ColumnDef } from "./types";

export const columns: ColumnDef[] = [
  {
    name: "Jugador",
    uid: "full_name",
    sortable: true,
    className: "md:w-[25%] max-w-0",
  },
  { name: "Plan", uid: "plan", sortable: true, className: "md:w-[10%]" },
  { name: "Estado", uid: "status", sortable: true, className: "md:w-[10%]" },
  {
    name: "Valor (EUR)",
    uid: "market_value_eur",
    sortable: true,
    className: "hidden md:table-cell md:w-[15%]",
  },
  {
    name: "Equipo Actual",
    uid: "current_team",
    className: "hidden md:table-cell md:w-[25%] max-w-0",
  },
  { name: "Acciones", uid: "actions", className: "md:w-[15%] text-right" },
];