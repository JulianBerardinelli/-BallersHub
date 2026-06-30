"use client";

// Filtros del directorio `/staff` (rol agrupado · nacionalidad · idioma).
// Server-filtered: cada cambio reescribe los searchParams y deja que el RSC
// vuelva a renderizar el grid (sin estado de lista en el cliente). Selects
// nativos → accesibles, sin JS pesado, y los crawlers ven el grid completo en
// el primer paint (los params sólo refinan).
import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
// Navegación locale-aware: usePathname devuelve el path SIN prefijo y router.push
// reinyecta el locale activo → al filtrar desde /en/staff seguimos en /en/staff.
import { useRouter, usePathname } from "@/i18n/navigation";
import { STAFF_ROLE_GROUPS, staffRoleLabel, type StaffRoleType } from "@/lib/staff/roles";

export default function StaffFilters({
  facets,
  active,
}: {
  facets: { roles: StaffRoleType[]; nationalities: string[]; languages: string[] };
  active: { role: string | null; nationality: string | null; language: string | null };
}) {
  const t = useTranslations("staff");
  const tDir = useTranslations("staff.directory");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const regionNames = React.useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);

  const facetRoles = React.useMemo(() => new Set(facets.roles), [facets.roles]);
  const hasAny = !!(active.role || active.nationality || active.language);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function clearAll() {
    router.push(pathname, { scroll: false });
  }

  const selectCls =
    "h-9 rounded-bh-md border border-white/[0.12] bg-bh-surface-1 px-3 text-[13px] text-bh-fg-1 outline-none focus:border-bh-lime/40";

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Rol (agrupado: Cuerpo Técnico / Especialistas) */}
      <select
        aria-label={tDir("filters.role")}
        value={active.role ?? ""}
        onChange={(e) => setParam("role", e.target.value)}
        className={selectCls}
      >
        <option value="">{tDir("filters.role")}: {tDir("filters.all")}</option>
        {STAFF_ROLE_GROUPS.map((group) => {
          const opts = group.roles.filter((r) => facetRoles.has(r));
          if (opts.length === 0) return null;
          return (
            <optgroup key={group.id} label={t(`groups.${group.id}`)}>
              {opts.map((r) => (
                <option key={r} value={r}>
                  {staffRoleLabel(r, (k) => t(k))}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>

      {/* Nacionalidad */}
      {facets.nationalities.length > 0 && (
        <select
          aria-label={tDir("filters.nationality")}
          value={active.nationality ?? ""}
          onChange={(e) => setParam("nationality", e.target.value)}
          className={selectCls}
        >
          <option value="">{tDir("filters.nationality")}: {tDir("filters.all")}</option>
          {facets.nationalities.map((code) => (
            <option key={code} value={code}>
              {regionNames?.of(code.toUpperCase()) ?? code.toUpperCase()}
            </option>
          ))}
        </select>
      )}

      {/* Idioma */}
      {facets.languages.length > 0 && (
        <select
          aria-label={tDir("filters.language")}
          value={active.language ?? ""}
          onChange={(e) => setParam("language", e.target.value)}
          className={selectCls}
        >
          <option value="">{tDir("filters.language")}: {tDir("filters.all")}</option>
          {facets.languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      )}

      {hasAny && (
        <button
          type="button"
          onClick={clearAll}
          className="h-9 rounded-bh-md border border-white/[0.12] px-3 text-[12px] text-bh-fg-3 transition-colors hover:border-bh-danger hover:text-bh-danger"
        >
          {tDir("filters.clear")}
        </button>
      )}
    </div>
  );
}
