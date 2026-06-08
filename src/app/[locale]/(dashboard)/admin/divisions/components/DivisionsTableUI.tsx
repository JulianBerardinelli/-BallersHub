"use client";

import * as React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Button,
  Chip,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
  Accordion,
  AccordionItem,
  Tooltip,
  Switch,
} from "@heroui/react";
import { ChevronDown, Pencil, Search } from "lucide-react";
import CountrySinglePicker from "@/components/common/CountrySinglePicker";
import CountryFlag from "@/components/common/CountryFlag";
import { upsertDivision } from "../actions";
import { supabase } from "@/lib/supabase/client";
import CsvImporter from "@/components/admin/CsvImporter";
import { bulkUpsertDivisions } from "../bulkActions";
import FormField from "@/components/dashboard/client/FormField";
import { bhChip } from "@/lib/ui/heroui-brand";
import { useAdminModalPreset } from "../../ui/modalPresets";
import {
  CONTINENT_LABELS,
  CONTINENT_ORDER,
  getContinent,
  type ContinentKey,
} from "@/lib/geo/continents";

const dnEs = new Intl.DisplayNames(["es"], { type: "region", fallback: "code" });

type CountryEntry = [string, any[]];

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function DivisionsTableUI({ items }: { items: any[] }) {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const modalPreset = useAdminModalPreset();
  const [selectedItem, setSelectedItem] = React.useState<any>(null);

  // Form states
  const [name, setName] = React.useState("");
  const [countryPick, setCountryPick] = React.useState<{ code: string; name: string } | null>(null);
  const [level, setLevel] = React.useState<number | "">("");
  const [isYouth, setIsYouth] = React.useState(false);
  const [status, setStatus] = React.useState<"pending" | "approved" | "rejected">("pending");
  const [referenceUrl, setReferenceUrl] = React.useState("");
  const [crestFile, setCrestFile] = React.useState<File | null>(null);
  const [externalCrestUrl, setExternalCrestUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [collapsedContinents, setCollapsedContinents] = React.useState<Set<ContinentKey>>(
    () => new Set(),
  );

  // 1) Agrupar por país y ordenar (divisiones por nivel, países alfabéticamente).
  const countryGroups = React.useMemo<CountryEntry[]>(() => {
    const groups: Record<string, any[]> = {};
    for (const item of items) {
      const code = item.country_code || "XX";
      if (!groups[code]) groups[code] = [];
      groups[code].push(item);
    }
    for (const code of Object.keys(groups)) {
      groups[code].sort((a, b) => {
        // Sort by level asc (nulls to 999)
        const lvlA = typeof a.level === "number" ? a.level : 999;
        const lvlB = typeof b.level === "number" ? b.level : 999;
        if (lvlA !== lvlB) return lvlA - lvlB;

        // Youth leagues at the bottom within same level
        if (a.is_youth && !b.is_youth) return 1;
        if (!a.is_youth && b.is_youth) return -1;

        // Alphabetical fallback
        return a.name.localeCompare(b.name, "es");
      });
    }

    // sort alphabetically by country name
    return Object.entries(groups).sort(([codeA], [codeB]) => {
      if (codeA === "XX") return 1;
      if (codeB === "XX") return -1;
      const nameA = dnEs.of(codeA) || codeA;
      const nameB = dnEs.of(codeB) || codeB;
      return nameA.localeCompare(nameB, "es");
    });
  }, [items]);

  // 2) Agrupar los países por continente, preservando el orden alfabético interno.
  const continentGroups = React.useMemo(() => {
    const byContinent = new Map<ContinentKey, CountryEntry[]>();
    for (const entry of countryGroups) {
      const key = getContinent(entry[0] === "XX" ? null : entry[0]);
      if (!byContinent.has(key)) byContinent.set(key, []);
      byContinent.get(key)!.push(entry);
    }

    return CONTINENT_ORDER.filter((key) => byContinent.has(key)).map((key) => {
      const countries = byContinent.get(key)!;
      const totalDivisions = countries.reduce((sum, [, divs]) => sum + divs.length, 0);
      const pendingCount = countries.reduce(
        (sum, [, divs]) => sum + divs.filter((d) => d.status === "pending").length,
        0,
      );
      return {
        key,
        label: CONTINENT_LABELS[key],
        countries,
        countryCount: countries.length,
        totalDivisions,
        pendingCount,
      };
    });
  }, [countryGroups]);

  // 3) Búsqueda: muestra países/ligas "sueltos" (sin agrupar por continente).
  //    Matchea por nombre de país O por nombre de liga.
  const searching = searchQuery.trim().length > 0;
  const searchResults = React.useMemo<CountryEntry[]>(() => {
    if (!searching) return [];
    const q = normalize(searchQuery);
    return countryGroups.filter(([code, divisions]) => {
      const countryName = code === "XX" ? "Sin país" : dnEs.of(code) || code;
      if (normalize(countryName).includes(q)) return true;
      return divisions.some((d) => normalize(d.name || "").includes(q));
    });
  }, [countryGroups, searchQuery, searching]);

  const allExpanded = continentGroups.every((c) => !collapsedContinents.has(c.key));
  const toggleContinent = (key: ContinentKey) =>
    setCollapsedContinents((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const toggleAll = () =>
    setCollapsedContinents(allExpanded ? new Set(continentGroups.map((c) => c.key)) : new Set());

  const openEditor = (item?: any) => {
    if (item) {
      setSelectedItem(item);
      setName(item.name);
      setCountryPick(item.country_code ? { code: item.country_code, name: dnEs.of(item.country_code) || item.country_code } : null);
      setLevel(item.level ?? "");
      setIsYouth(item.is_youth || false);
      setStatus(item.status);
      setReferenceUrl(item.reference_url || "");

      const isExternalCrest = item.crest_url && item.crest_url.startsWith("http") && !item.crest_url.includes("supabase.co");
      setExternalCrestUrl(isExternalCrest ? item.crest_url : "");
    } else {
      setSelectedItem(null);
      setName("");
      setCountryPick(null);
      setLevel("");
      setIsYouth(false);
      setStatus("approved");
      setReferenceUrl("");
      setExternalCrestUrl("");
    }
    setCrestFile(null);
    onOpen();
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      if (!countryPick?.code) throw new Error("Debes elegir un país.");

      let crestUrl = selectedItem?.crest_url;

      if (externalCrestUrl.trim()) {
        crestUrl = externalCrestUrl.trim();
      }

      if (crestFile) {
        const ext = (crestFile.name.split(".").pop() || "png").toLowerCase();
        const tempid = selectedItem?.id || Date.now().toString();
        const key = `${tempid}/crest.${ext}`;

        const { error: upErr } = await supabase.storage.from("divisions").upload(key, crestFile, { upsert: true });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage.from("divisions").getPublicUrl(key);
        crestUrl = pub.publicUrl;
      }

      const res = await upsertDivision({
        id: selectedItem?.id,
        name,
        countryCode: countryPick.code.toUpperCase(),
        level: level === "" ? undefined : Number(level),
        isYouth,
        status,
        crestUrl,
        referenceUrl,
      });

      if (!res.success) {
        throw new Error(res.message);
      }

      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Render del acordeón de países (reutilizado en modo continente y en búsqueda).
  const renderCountries = (entries: CountryEntry[]) => (
    <Accordion
      variant="splitted"
      selectionMode="multiple"
      itemClasses={{
        base: "rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 shadow-none data-[open=true]:border-[rgba(204,255,0,0.18)]",
        title: "text-bh-fg-1",
        trigger: "px-4 py-3",
        content: "px-2 pb-2 pt-0",
      }}
    >
      {entries.map(([code, divisions]) => {
        const countryName = code === "XX" ? "Sin país" : (dnEs.of(code) || code);
        const pendingCount = divisions.filter((d) => d.status === "pending").length;

        return (
          <AccordionItem
            key={code}
            title={
              <div className="flex items-center gap-3">
                {code !== "XX" && <CountryFlag code={code} size={20} />}
                <span className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
                  {countryName}
                </span>
                <span className="font-bh-mono text-[11px] text-bh-fg-4">
                  ({divisions.length})
                </span>
                {pendingCount > 0 && (
                  <Chip size="sm" variant="flat" classNames={bhChip("warning")}>
                    {pendingCount} pendientes
                  </Chip>
                )}
              </div>
            }
          >
            <Table
              aria-label={`Tabla de divisiones de ${countryName}`}
              removeWrapper
              classNames={{
                table: "w-full",
                thead:
                  "[&_th]:bg-transparent [&_th]:font-bh-display [&_th]:text-[10px] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-[0.1em] [&_th]:text-bh-fg-4 [&_th]:border-b [&_th]:border-white/[0.06]",
                tr: "border-b border-white/[0.04] data-[hover=true]:bg-white/[0.02]",
                td: "text-[13px] text-bh-fg-2",
              }}
            >
              <TableHeader>
                <TableColumn>NOMBRE</TableColumn>
                <TableColumn>NIVEL</TableColumn>
                <TableColumn>ESTADO</TableColumn>
                <TableColumn>ACCIONES</TableColumn>
              </TableHeader>
              <TableBody items={divisions}>
                {(item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="flex items-center gap-3">
                      <img src={item.crest_url || "/images/team-default.svg"} alt="" className="h-8 w-8 object-contain" />
                      <div className="flex flex-col">
                        <span className="text-bh-fg-1">{item.name}</span>
                        {item.is_youth && (
                          <span className="font-bh-display text-[10px] font-bold uppercase tracking-[0.1em] text-bh-blue">
                            Juvenil
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-bh-mono text-[12px] text-bh-fg-3">
                        {item.level || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        variant="flat"
                        classNames={bhChip(
                          item.status === "approved"
                            ? "success"
                            : item.status === "pending"
                              ? "warning"
                              : "danger",
                        )}
                        className="capitalize"
                      >
                        {item.status}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <Tooltip content="Editar división">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => openEditor(item)}
                          className="rounded-bh-md text-bh-fg-3 hover:bg-white/[0.06] hover:text-bh-fg-1"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </AccordionItem>
        );
      })}
    </Accordion>
  );

  return (
    <>
      <div className="mb-4 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="w-full max-w-sm">
          <FormField
            id="bh-divisions-search"
            placeholder="Buscar país o liga..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startContent={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <CsvImporter
            buttonLabel="Importar CSV"
            title="Importación Masiva de Divisiones"
            expectedColumns={["name", "country_code", "level", "is_youth", "crest_url", "reference_url"]}
            onImport={bulkUpsertDivisions}
            onSuccess={() => window.location.reload()}
          />
          <Button
            onPress={() => openEditor()}
            className="rounded-bh-md bg-bh-lime px-5 py-2 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
          >
            Crear división
          </Button>
        </div>
      </div>

      {searching ? (
        searchResults.length === 0 ? (
          <p className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 px-4 py-6 text-center text-sm text-bh-fg-4">
            No se encontraron países ni ligas para “{searchQuery.trim()}”.
          </p>
        ) : (
          renderCountries(searchResults)
        )
      ) : (
        <div className="space-y-5">
          {continentGroups.length > 1 && (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="light"
                onPress={toggleAll}
                className="rounded-bh-md font-bh-display text-[11px] font-bold uppercase tracking-[0.08em] text-bh-fg-3 hover:bg-white/[0.06] hover:text-bh-fg-1"
              >
                {allExpanded ? "Colapsar todo" : "Expandir todo"}
              </Button>
            </div>
          )}

          {continentGroups.map((continent) => {
            const collapsed = collapsedContinents.has(continent.key);
            const panelId = `bh-continent-${continent.key}`;
            return (
              <section key={continent.key}>
                <button
                  type="button"
                  onClick={() => toggleContinent(continent.key)}
                  aria-expanded={!collapsed}
                  aria-controls={panelId}
                  className="group mb-3 flex w-full items-center justify-between gap-3 rounded-bh-md px-1 py-1.5 text-left transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-1 rounded-full bg-bh-lime/70 transition-colors group-hover:bg-bh-lime" />
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-bh-fg-3 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
                    />
                    <span className="font-bh-display text-xl font-bold uppercase tracking-[-0.01em] text-bh-fg-1">
                      {continent.label}
                    </span>
                    <span className="font-bh-mono text-[11px] text-bh-fg-4">
                      {continent.countryCount} {continent.countryCount === 1 ? "país" : "países"} ·{" "}
                      {continent.totalDivisions} {continent.totalDivisions === 1 ? "división" : "divisiones"}
                    </span>
                  </div>
                  {continent.pendingCount > 0 && (
                    <Chip size="sm" variant="flat" classNames={bhChip("warning")}>
                      {continent.pendingCount} pendientes
                    </Chip>
                  )}
                </button>

                {!collapsed && <div id={panelId}>{renderCountries(continent.countries)}</div>}
              </section>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        {...modalPreset}
      >
        <ModalContent>
          <ModalHeader>{selectedItem ? "Editar división" : "Crear división"}</ModalHeader>
          <ModalBody className="pb-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-4">
                <FormField
                  id="bh-div-name"
                  label="Nombre de la liga/división"
                  placeholder="Ej: Premier League"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <CountrySinglePicker label="País" value={countryPick} onChange={setCountryPick} />
                <FormField
                  id="bh-div-level"
                  label="Nivel jerárquico"
                  placeholder="Ej: 1 (Primera División)"
                  type="number"
                  value={level.toString()}
                  onChange={(e) => setLevel(e.target.value ? Number(e.target.value) : "")}
                  disabled={isYouth}
                />
                <FormField
                  id="bh-div-ref-url"
                  label="URL de referencia (opcional)"
                  placeholder="Transfermarkt, Besoccer, sitio oficial..."
                  type="url"
                  value={referenceUrl}
                  onChange={(e) => setReferenceUrl(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-4">
                <Select
                  label="Estado de validación"
                  variant="flat"
                  selectedKeys={[status]}
                  onSelectionChange={(k) => setStatus(Array.from(k)[0] as any)}
                  classNames={{
                    label: "!text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2",
                    trigger:
                      "bg-bh-surface-1 border border-white/[0.08] data-[hover=true]:border-white/[0.18] data-[focus=true]:border-bh-lime data-[open=true]:border-bh-lime shadow-none",
                    value: "text-[14px] text-bh-fg-1",
                    listbox: "bg-bh-surface-1",
                    popoverContent: "bg-bh-surface-1 border border-white/[0.08]",
                  }}
                >
                  <SelectItem key="pending">Pendiente de aprobación</SelectItem>
                  <SelectItem key="approved">Aprobado y activo</SelectItem>
                  <SelectItem key="rejected">Rechazado</SelectItem>
                </Select>

                <div className="flex flex-col gap-3 rounded-bh-md border border-white/[0.08] bg-bh-surface-2/40 p-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2">
                      Escudo de la competición
                    </span>
                    <input
                      type="file"
                      onChange={(e) => setCrestFile(e.target.files?.[0] || null)}
                      className="w-full text-sm text-bh-fg-3 file:mr-3 file:rounded-bh-md file:border file:border-white/[0.08] file:bg-white/[0.04] file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-bh-fg-2 hover:file:bg-white/[0.08]"
                    />
                  </div>

                  <div className="flex w-full items-center gap-2 opacity-50">
                    <hr className="flex-1 border-white/[0.08]" />
                    <span className="font-bh-display text-[10px] font-bold uppercase tracking-[0.1em] text-bh-fg-4">
                      O pegar enlace
                    </span>
                    <hr className="flex-1 border-white/[0.08]" />
                  </div>

                  <div>
                    <FormField
                      id="bh-div-external-crest"
                      type="url"
                      placeholder="https://wikipedia.org/.../logo.svg"
                      value={externalCrestUrl}
                      onChange={(e) => setExternalCrestUrl(e.target.value)}
                      description="El URL reemplazará el archivo si se especifica."
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 rounded-bh-md border border-white/[0.08] bg-bh-surface-2/40 p-3">
                  <Switch
                    isSelected={isYouth}
                    onValueChange={setIsYouth}
                    size="sm"
                    classNames={{
                      wrapper: "group-data-[selected=true]:bg-bh-lime",
                      thumb: "bg-bh-fg-1 group-data-[selected=true]:bg-bh-black",
                      label: "text-[13px] text-bh-fg-2",
                    }}
                  >
                    Categoría juvenil / formativa
                  </Switch>
                  <p className="pl-10 text-[11px] text-bh-fg-4">
                    Marcá esta opción si la división corresponde a ligas formacionales (ej. Reserva, Sub-20, Primavera).
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button
                onPress={handleSave}
                isLoading={busy}
                className="rounded-bh-md bg-bh-lime px-8 py-2 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
              >
                Guardar división
              </Button>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
