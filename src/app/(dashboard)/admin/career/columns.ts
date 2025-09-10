import type { ColumnDef } from "./types";

export const careerColumns: ColumnDef[] = [
  { name: "ID", uid: "id", sortable: true, className: "w-24" },
  { name: "Solicitante", uid: "applicant", sortable: true },
  { name: "Estado", uid: "status", sortable: true },
  { name: "Fecha", uid: "created_at", sortable: true },
  { name: "Equipo actual", uid: "current_team" },
  { name: "País", uid: "country" },
  { name: "", uid: "actions" },
];
