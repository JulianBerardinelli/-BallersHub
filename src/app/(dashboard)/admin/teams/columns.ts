// src/app/(dashboard)/admin/teams/columns.ts
import type { ColumnDef } from "./types";

export const teamColumns: ColumnDef[] = [
  { name: "Equipo",     uid: "name",       sortable: true,  className: "md:w-[30%] max-w-0" },
  { name: "País",       uid: "country",    sortable: true,  className: "hidden md:table-cell md:w-[14%] max-w-0" },
  { name: "Categoría",  uid: "category",   sortable: true,  className: "hidden md:table-cell md:w-[14%] max-w-0" },
  { name: "Estado",     uid: "status",     sortable: true,  className: "md:w-[12%]" },
  { name: "Solicitado", uid: "created_at", sortable: true,  className: "hidden md:table-cell md:w-[18%]" },
  { name: "Acciones",   uid: "actions",    sortable: false, align: "end", className: "md:w-[12%]" },
];
