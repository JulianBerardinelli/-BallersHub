import Link from "next/link";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import DashboardStatusSummary, {
  type DashboardStatusSummaryProps,
} from "@/components/dashboard/client/overview/DashboardStatusSummary";

type ManagerApp = {
  status: string;
  agency_name: string | null;
  created_at: string;
} | null;

type AgencyData = {
  slug: string;
  playersCount: number;
  staffCount: number;
} | null;

const QUICK_ACTIONS = [
  {
    id: "agency",
    title: "Editar Perfil de Agencia",
    description: "Modifica información pública, contacto y logo.",
    href: "/dashboard/agency",
  },
  {
    id: "template-styles",
    title: "Plantilla del Portfolio",
    description: "Elegí Pro o Clásica, paleta de marca y tipografía.",
    href: "/dashboard/agency/edit-template/styles",
  },
  {
    id: "players",
    title: "Cartera de Jugadores",
    description: "Administra tu roster y asigna tareas pendientes.",
    href: "/dashboard/players",
  },
  {
    id: "staff",
    title: "Equipo Staff",
    description: "Invita colegas y visualiza miembros activos.",
    href: "/dashboard/agency/staff",
  },
];

export default function ManagerOverview({ managerApp, role, agencyData }: { managerApp: ManagerApp, role: string, agencyData: AgencyData }) {
  const isPending = managerApp?.status === "pending";
  const isApproved = managerApp?.status === "approved" || role === "manager";
  const isRejected = managerApp?.status === "rejected";

  const getStatusProps = (): DashboardStatusSummaryProps => {
    if (isPending) {
      return {
        profileStatus: {
          code: "pending",
          label: "En revisión",
          message: "Tu solicitud para operar una agencia está siendo evaluada por administración.",
          color: "warning" as const
        },
        visibility: null,
        publicUrl: null,
        updatedAt: null,
        applicationStatus: null,
      };
    }

    if (isApproved) {
      const cta = agencyData?.slug ? {
        label: "Ver perfil público de agencia",
        href: `/agency/${agencyData.slug}`,
        variant: "solid" as const,
        color: "primary" as const,
      } : {
        label: "Configurar URL Pública",
        href: "/dashboard/agency",
        variant: "solid" as const,
        color: "warning" as const,
      };

      return {
        profileStatus: {
          code: "approved",
          label: "Agencia Activa y Validada",
          message: `Representas a ${managerApp?.agency_name ?? "tu Agencia"}. Mantén tu perfil actualizado para lograr mayor exposición con clubes y reclutadores.`,
          color: "success" as const
        },
        visibility: "public",
        publicUrl: agencyData?.slug ? `/agency/${agencyData.slug}` : null,
        updatedAt: null,
        applicationStatus: null,
        cta
      };
    }

    return {
      profileStatus: {
        code: "rejected",
        label: "Solicitud Rechazada",
        message: "Tu permiso operativo dentro del sistema fue rechazado. Contáctanos para más detalles.",
        color: "danger" as const
      },
      visibility: null,
      publicUrl: null,
      updatedAt: null,
      applicationStatus: null,
    };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resumen general de Agencia"
        description="Visualizá el estado de tu empresa, tu cartera de jugadores y accesos rápidos."
      />

      <SectionCard
        title="Estado Operativo"
        description="Controlá tu visibilidad pública y el estado de tu licencia institucional."
      >
        <DashboardStatusSummary {...getStatusProps()} />
      </SectionCard>

      {isApproved && (
         <div className="grid gap-6 md:grid-cols-2">
            <SectionCard title="Directorio de Jugadores" description="Tus jugadores representados activos.">
               <div className="flex flex-col items-center justify-center p-6 text-center text-neutral-400 gap-2 border border-dashed border-neutral-800 rounded-lg bg-neutral-950/40">
                  <span className="text-4xl font-bold text-white shadow-xl">
                    {agencyData?.playersCount || 0}
                  </span>
                  <span className="text-sm font-medium">Jugadores Vinculados</span>
                  <Link href="/dashboard/players" className="mt-2 text-primary text-sm font-semibold hover:underline">
                    Ver directorio completo →
                  </Link>
               </div>
            </SectionCard>
            
            <SectionCard title="Equipo de Representación" description="Mánagers pertenecientes a la institución.">
               <div className="flex flex-col items-center justify-center p-6 text-center text-neutral-400 gap-2 border border-dashed border-neutral-800 rounded-lg bg-neutral-950/40">
                 <span className="text-4xl font-bold text-white shadow-xl">
                    {agencyData?.staffCount || 1}
                  </span>
                  <span className="text-sm font-medium">Agentes Activos</span>
                  <Link href="/dashboard/agency/staff" className="mt-2 text-primary text-sm font-semibold hover:underline">
                    Gestionar Staff →
                  </Link>
               </div>
            </SectionCard>
         </div>
      )}

      {isApproved && (
        <SectionCard
          title="Atajos rápidos"
          description="Accedé directamente a las secciones operativas que vas a utilizar con mayor frecuencia."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className="flex h-full flex-col justify-between rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 transition-colors hover:border-neutral-700 hover:bg-neutral-900/50"
              >
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-white">{action.title}</p>
                  <p className="text-xs text-neutral-400">{action.description}</p>
                </div>
                <span className="mt-4 text-xs font-medium text-primary">Ir a la sección →</span>
              </Link>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
