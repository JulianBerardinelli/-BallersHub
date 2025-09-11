import type { ColumnDef } from "./types";

export const applicationColumns: ColumnDef[] = [
  { name: "ID", uid: "id", sortable: true, className: "w-14" },
  {
    name: "Solicitante",
    uid: "applicant",
    sortable: true,
    className: "md:w-[24%] max-w-0",
  },
  { name: "Plan", uid: "plan", sortable: true, className: "md:w-[10%]" },
  { name: "Estado", uid: "status", sortable: true, className: "md:w-[12%]" },
  {
    name: "Fecha",
    uid: "created_at",
    sortable: true,
    className: "hidden md:table-cell md:w-[16%]",
  },
  {
    name: "Equipo",
    uid: "current_team",
    className: "hidden md:table-cell md:w-[20%] max-w-0",
  },
  { name: "Tareas", uid: "tasks", className: "hidden md:table-cell md:w-[8%]" },
  { name: "Acciones", uid: "actions", className: "md:w-[12%] text-right" },
];
