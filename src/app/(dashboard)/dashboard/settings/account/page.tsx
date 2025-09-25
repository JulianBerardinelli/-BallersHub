import Link from "next/link";
import { redirect } from "next/navigation";
import FormField from "@/components/dashboard/client/FormField";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { createSupabaseServerRSC } from "@/lib/supabase/server";

type UserProfileRole = {
  role: string;
  created_at: string;
};

export default async function AccountSettingsPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/dashboard/settings/account");

  const { data: profileRoleRaw } = await supabase
    .from("user_profiles")
    .select("role, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const profileRole = (profileRoleRaw as UserProfileRole | null) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración de la cuenta"
        description="Gestioná tus credenciales, seguridad y preferencias generales del panel."
      />

      <SectionCard
        title="Información de acceso"
        description="Estos datos definen cómo ingresás a tu cuenta. Pronto podrás gestionarlos directamente desde aquí."
      >
        <form className="grid gap-4 md:grid-cols-2">
          <FormField id="email" label="Correo electrónico" defaultValue={user.email ?? ""} />
          <FormField id="password" label="Contraseña" placeholder="********" description="La actualización de contraseña se habilitará en la próxima iteración." />
          <FormField
            id="role"
            label="Rol de la cuenta"
            defaultValue={profileRole?.role ?? "member"}
            description="El rol define permisos dentro del ecosistema BallersHub."
          />
          <FormField
            id="created_at"
            label="Alta de la cuenta"
            defaultValue={profileRole?.created_at ? new Date(profileRole.created_at).toLocaleDateString() : ""}
          />
        </form>
      </SectionCard>

      <SectionCard
        title="Seguridad"
        description="Planes para autenticar de forma segura y monitorear accesos."
      >
        <div className="space-y-3 text-sm text-neutral-300">
          <div className="flex items-start justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
            <div>
              <p className="font-semibold text-white">Autenticación en dos pasos</p>
              <p className="text-xs text-neutral-400">
                Podrás habilitar códigos temporales o aplicaciones de autenticación para fortalecer la seguridad.
              </p>
            </div>
            <span className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-500">Próximamente</span>
          </div>
          <div className="flex items-start justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
            <div>
              <p className="font-semibold text-white">Accesos federados</p>
              <p className="text-xs text-neutral-400">Configurar inicio de sesión con Google, Apple u otros proveedores.</p>
            </div>
            <span className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-500">En roadmap</span>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Notificaciones"
        description="Definí cómo querés recibir alertas sobre tu perfil, solicitudes y suscripción."
      >
        <div className="space-y-3 text-sm text-neutral-300">
          {[
            {
              id: "profile-updates",
              label: "Cambios en mi perfil",
              description: "Alertas cuando un miembro del staff actualice mi información",
            },
            {
              id: "applications",
              label: "Estado de solicitudes",
              description: "Notificaciones sobre revisión de cuentas o nuevos requerimientos",
            },
            {
              id: "subscription",
              label: "Facturación y pagos",
              description: "Avisos de próximas renovaciones o problemas con el cobro",
            },
          ].map((item) => (
            <label
              key={item.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-950/40 p-4"
            >
              <div>
                <p className="font-semibold text-white">{item.label}</p>
                <p className="text-xs text-neutral-400">{item.description}</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="mt-1 h-5 w-5 cursor-not-allowed rounded border-neutral-700 bg-neutral-900 text-primary"
              />
            </label>
          ))}
        </div>
        <p className="text-xs text-neutral-500">
          Podrás seleccionar canales (email, WhatsApp, app) y frecuencia personalizada en próximas versiones.
        </p>
      </SectionCard>

      <SectionCard
        title="Sesiones activas"
        description="Visualizá dispositivos con acceso para gestionar cierres remotos."
      >
        <div className="space-y-3 text-sm text-neutral-300">
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
            <p className="font-semibold text-white">Sesión actual</p>
            <p className="text-xs text-neutral-400">Dispositivo actual (detalles disponibles próximamente)</p>
          </div>
          <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-4 text-xs text-neutral-500">
            El detalle de dispositivos y la opción de cerrar sesiones se integrará con Supabase Auth Management.
          </div>
        </div>
        <p className="text-xs text-neutral-500">
          Si detectás actividad sospechosa contactanos en{' '}
          <Link href="mailto:soporte@ballershub.com" className="text-primary underline">
            soporte@ballershub.com
          </Link>
          .
        </p>
      </SectionCard>
    </div>
  );
}
