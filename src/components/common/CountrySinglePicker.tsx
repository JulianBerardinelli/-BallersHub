"use client";

import * as React from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/react";
import CountryFlag from "@/components/common/CountryFlag";

const dnEs = new Intl.DisplayNames(["es"], { type: "region", fallback: "code" });
const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export type CountryPick = { code: string; name: string };

function scanFlagIconsCSS(): string[] {
  const out = new Set<string>();
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | undefined;
    try { rules = (sheet as CSSStyleSheet).cssRules; } catch { continue; }
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
const FALLBACK = ["AR","BR","CL","CO","MX","UY","PY","BO","PE","ES","IT","FR","DE","PT","GB","FI","US","CA"];

export default function CountrySinglePicker({
  label = "País",
  placeholder = "Escribe para buscar",
  value,
  onChange,
  isInvalid,
  errorMessage,
}: {
  label?: string;
  placeholder?: string;
  value: CountryPick | null;
  onChange: (v: CountryPick | null) => void;
  isInvalid?: boolean;
  errorMessage?: React.ReactNode;
}) {
  const [items, setItems] = React.useState<CountryPick[]>([]);
  const [inputValue, setInputValue] = React.useState(value?.name ?? "");

  React.useEffect(() => {
    let codes = scanFlagIconsCSS();
    if (!codes || codes.length < 10) codes = FALLBACK;
    const list = codes.map((c) => ({ code: c, name: dnEs.of(c) ?? c }))
      .sort((a,b)=> a.name.localeCompare(b.name, "es"));
    setItems(list);
  }, []);

  // reflejar cambios externos
  React.useEffect(() => {
    setInputValue(value?.name ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.code]);

  const filtered = React.useMemo(() => {
    const q = norm(inputValue.trim());
    if (!q) return items;
    return items.filter(i => norm(i.name).includes(q) || norm(i.code).includes(q));
  }, [inputValue, items]);

  return (
    <Autocomplete
      label={label}
      labelPlacement="outside"
      menuTrigger="input"
      inputValue={inputValue}
      onInputChange={(v) => setInputValue(v)}
      onSelectionChange={(key) => {
        const k = String(key);
        const found = filtered.find(i => i.code === k);
        onChange(found ?? null);
      }}
      items={filtered}
      selectedKey={value?.code}
      placeholder={placeholder}
      isInvalid={isInvalid}
      errorMessage={errorMessage}
      allowsCustomValue={false}
      inputProps={{
        classNames: {
          inputWrapper:
            "bg-bh-surface-1 border border-white/[0.08] shadow-none transition-colors duration-150 hover:border-white/[0.18] data-[focus=true]:border-bh-lime data-[focus=true]:bg-bh-surface-1 data-[invalid=true]:border-bh-danger",
          input: "text-[14px] text-bh-fg-1 placeholder:text-bh-fg-4",
          label: "!text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2",
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
  );
}
