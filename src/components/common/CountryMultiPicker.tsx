"use client";

import * as React from "react";
import {
  Autocomplete,
  AutocompleteItem,
  Chip,
  Button,
} from "@heroui/react";
import CountryFlag from "@/components/common/CountryFlag";

// Nombres de regiones en español
const dnEs = new Intl.DisplayNames(["es"], { type: "region", fallback: "code" });
const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export type CountryPick = { code: string; name: string };

// Lee los códigos disponibles de la CSS de flag-icons.
// Si la hoja viene de un CDN y el navegador bloquea leer reglas (CORS),
// caemos a un fallback.
function scanFlagIconsCSS(): string[] {
  const out = new Set<string>();
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | undefined;
    try {
      rules = (sheet as CSSStyleSheet).cssRules;
    } catch {
      continue; // CORS
    }
    if (!rules) continue;
    for (const r of Array.from(rules)) {
      const sel = (r as CSSStyleRule).selectorText;
      if (!sel) continue;
      const m = sel.match(/\.fi-([a-z]{2})\b/gi);
      if (m) for (const t of m) out.add(t.split("-")[1].toUpperCase());
    }
  }
  return Array.from(out);
}

const FALLBACK_CODES = ["AR","BR","CL","CO","MX","UY","PY","BO","PE","ES","IT","FR","DE","PT","GB","FI","US","CA"];

export default function CountryMultiPicker({
    max = 3,
    defaultValue = [],
    onChange,
    isInvalid,
    errorMessage,
    label = "Nacionalidades",
  }: {
    max?: number;
    defaultValue?: CountryPick[];
    onChange: (vals: CountryPick[]) => void;
    isInvalid?: boolean;
    errorMessage?: React.ReactNode;
    /** Override the internal label, or pass null to render no label. */
    label?: string | null;
}) {
  const [selected, setSelected] = React.useState<CountryPick[]>(defaultValue);
  const [items, setItems] = React.useState<CountryPick[]>([]);
  const [inputValue, setInputValue] = React.useState("");

  // Carga local de países (flag-icons) una vez
  React.useEffect(() => {
    let codes = scanFlagIconsCSS();
    if (!codes || codes.length < 10) codes = FALLBACK_CODES;
    const list = codes.map((code) => ({ code, name: dnEs.of(code) ?? code }));
    list.sort((a, b) => a.name.localeCompare(b.name, "es"));
    setItems(list);
  }, []);

// Después (sin onChange en deps; solo cuando cambia 'selected')
React.useEffect(() => {
    onChange(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const hasRoom = selected.length < max;

  function addByCode(code: string | null) {
    if (!code || !hasRoom) return;
    const found = items.find((i) => i.code === code);
    if (!found) return;
    if (selected.some((s) => s.code === found.code)) return;
    setSelected((prev) => [...prev, found]);
    // Limpiamos el campo pero dejamos el dropdown listo para seguir
    setInputValue("");
  }
  function remove(code: string) {
    setSelected((prev) => prev.filter((s) => s.code !== code));
  }

  // Filtrado local (si preferís que Autocomplete filtre solo, podés pasar defaultItems y defaultFilter)
  const filteredItems = React.useMemo(() => {
    const q = norm(inputValue.trim());
    if (!q) return items;
    return items.filter((i) => norm(i.name).includes(q) || norm(i.code).includes(q));
  }, [inputValue, items]);

  const disabledKeys = React.useMemo(
    () => new Set(selected.map((s) => s.code)),
    [selected]
  );

  const placeholder =
    selected.length === 0
      ? "Nacionalidad (buscá por país o código)"
      : selected.length < max
      ? "¿Deseás agregar otra nacionalidad?"
      : "Máximo alcanzado";

  return (
    <div className="grid gap-2">
      <Autocomplete
        label={label ?? undefined}
        aria-label={label ?? "Nacionalidades"}
        labelPlacement="outside"
        menuTrigger="input"
        allowsCustomValue={false}
        isDisabled={!hasRoom}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSelectionChange={(key) => addByCode(key as string)}
        items={filteredItems}
        isInvalid={isInvalid}
        errorMessage={errorMessage}
        disabledKeys={disabledKeys as any}
        placeholder={placeholder}
        description={hasRoom ? `Elegí hasta ${max}. Escribí para buscar.` : "Ya alcanzaste el máximo."}
        classNames={{
          base: "",
        }}
        inputProps={{
          classNames: {
            inputWrapper:
              "bg-bh-surface-1 border border-white/[0.08] shadow-none transition-colors duration-150 hover:border-white/[0.18] data-[focus=true]:border-bh-lime data-[focus=true]:bg-bh-surface-1 data-[invalid=true]:border-bh-danger",
            input: "text-[14px] text-bh-fg-1 placeholder:text-bh-fg-4",
            label: "!text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2",
            description: "text-[11px] text-bh-fg-4",
            errorMessage: "text-[11px] text-bh-danger",
          },
        }}
        listboxProps={{
          itemClasses: {
            base: "rounded-bh-md text-bh-fg-2 data-[hover=true]:bg-white/[0.05] data-[hover=true]:text-bh-fg-1 data-[selectable=true]:focus:bg-white/[0.05] data-[focus=true]:bg-white/[0.05]",
            title: "text-[13px]",
          },
        }}
        popoverProps={{
          classNames: {
            content:
              "bg-bh-surface-1 border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.7)] p-1 rounded-bh-lg",
          },
        }}
      >
        {(item) => (
          <AutocompleteItem
            key={item.code}
            textValue={`${item.name} ${item.code}`}
            startContent={<CountryFlag code={item.code} size={16} />}
            description={<span className="text-bh-fg-4">{item.code}</span>}
          >
            {item.name}
          </AutocompleteItem>
        )}
      </Autocomplete>

      {/* Chips de selección */}
      <div className="flex min-h-10 flex-wrap items-center gap-2">
        {selected.map((s) => (
          <Chip
            key={s.code}
            variant="flat"
            startContent={<CountryFlag code={s.code} size={12} />}
            onClose={() => remove(s.code)}
            classNames={{
              base: "border border-white/[0.12] bg-white/[0.06] text-bh-fg-2",
              content: "text-[12px]",
              closeButton: "text-bh-fg-3 hover:text-bh-fg-1",
            }}
          >
            {s.name}
          </Chip>
        ))}
      </div>
    </div>
  );
}
