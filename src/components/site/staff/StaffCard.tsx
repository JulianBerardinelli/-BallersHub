// Card de un perfil del directorio `/staff`. Server component — el <Link> es un
// ancla real en el HTML (superficie de internal-linking para SEO). Reusa la
// taxonomía de roles (staffRolesSummary) y banderas via flag-icons (CSS global).
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { staffRolesSummary } from "@/lib/staff/roles";
import type { StaffDirectoryItem } from "@/lib/staff/directory";

export default async function StaffCard({ item }: { item: StaffDirectoryItem }) {
  const tStaff = await getTranslations("staff");
  const tDir = await getTranslations("staff.directory");
  const roleLabel =
    staffRolesSummary(item.primaryRole, item.secondaryRoles, (k) => tStaff(k)) || null;
  // Avatar de Supabase pasa por el optimizer; el default local también. Otros
  // hosts externos no deberían darse (el avatar se sube a coach-media).
  const optimizable = item.avatarUrl.startsWith("/") || /\.supabase\.co\//.test(item.avatarUrl);

  return (
    <Link
      href={`/staff/${item.slug}`}
      className="group flex flex-col overflow-hidden rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 transition-colors duration-150 hover:border-bh-lime/40"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-bh-surface-2">
        <Image
          src={item.avatarUrl}
          alt={item.fullName}
          fill
          unoptimized={!optimizable}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {item.nationalityCodes.length > 0 && (
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1">
            {item.nationalityCodes.slice(0, 3).map((code) => (
              <span
                key={code}
                className={`fi fi-${code} h-3.5 w-5 rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.3)]`}
                title={code.toUpperCase()}
                aria-hidden
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <h3 className="font-bh-display text-[15px] font-bold uppercase leading-tight tracking-[-0.005em] text-bh-fg-1">
          {item.fullName}
        </h3>
        {roleLabel && (
          <p className="text-[12px] font-medium leading-snug text-bh-lime">{roleLabel}</p>
        )}
        {item.currentClub && (
          <p className="mt-0.5 text-[11px] text-bh-fg-4">
            <span className="uppercase tracking-[0.08em]">{tDir("currentClub")}:</span>{" "}
            <span className="text-bh-fg-3">{item.currentClub}</span>
          </p>
        )}
        {item.languages.length > 0 && (
          <p className="mt-auto pt-2 text-[11px] text-bh-fg-4">
            {item.languages.slice(0, 4).join(" · ")}
          </p>
        )}
      </div>
    </Link>
  );
}
