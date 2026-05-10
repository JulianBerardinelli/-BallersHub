import type { ColumnDef } from "./types";

export const columns: ColumnDef[] = [
  { name: "", uid: "expander", className: "w-[36px]" },
  {
    name: "Agencia",
    uid: "name",
    sortable: true,
    className: "md:w-[28%] max-w-0",
  },
  {
    name: "Estado",
    uid: "is_approved",
    sortable: true,
    className: "md:w-[10%]",
  },
  {
    name: "Agentes",
    uid: "agent_count",
    sortable: true,
    className: "hidden md:table-cell md:w-[10%]",
    align: "center",
  },
  {
    name: "Jugadores",
    uid: "player_count",
    sortable: true,
    className: "hidden md:table-cell md:w-[10%]",
    align: "center",
  },
  {
    name: "Sede",
    uid: "headquarters",
    sortable: true,
    className: "hidden md:table-cell md:w-[16%] max-w-0",
  },
  {
    name: "Creada",
    uid: "created_at",
    sortable: true,
    className: "hidden md:table-cell md:w-[12%]",
  },
  { name: "Acciones", uid: "actions", className: "md:w-[14%] text-right" },
];
