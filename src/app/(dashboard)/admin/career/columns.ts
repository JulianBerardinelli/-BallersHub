import type { ColumnDef } from "./types";

export const careerColumns: ColumnDef[] = [
  { name: "ID", uid: "id", sortable: true, className: "w-14" },
  {
    name: "Solicitante",
    uid: "applicant",
    sortable: true,
    className: "md:w-[28%] max-w-0",
  },
  { name: "Estado", uid: "status", sortable: true, className: "md:w-[12%]" },
  {
    name: "Fecha",
    uid: "created_at",
    sortable: true,
    className: "hidden md:table-cell md:w-[16%]",
  },
  {
    name: "Equipo actual",
    uid: "current_team",
    className: "hidden md:table-cell md:w-[20%] max-w-0",
  },
  {
    name: "País",
    uid: "country",
    className: "hidden md:table-cell md:w-[10%]",
  },
  { name: "Acciones", uid: "actions", className: "md:w-[10%]" },
];