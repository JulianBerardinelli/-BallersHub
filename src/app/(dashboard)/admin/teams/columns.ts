// src/app/(dashboard)/admin/teams/columns.ts
import type { ColumnDef } from "./types";

export const teamColumns: ColumnDef[] = [
  { name: "Equipo",     uid: "name",       sortable: true,  className: "w-[34%] max-w-0" },
  { name: "País",       uid: "country",    sortable: true,  className: "w-[16%] max-w-0" },
  { name: "Categoría",  uid: "category",   sortable: true,  className: "w-[16%] max-w-0" },
  { name: "Estado",     uid: "status",     sortable: true,  className: "w-[14%]" },
  { name: "Solicitado", uid: "created_at", sortable: true,  className: "w-[20%]" },
  { name: "Acciones",   uid: "actions",    sortable: false, align: "end", className: "w-[14%]" },
];
