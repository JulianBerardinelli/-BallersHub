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
  Input,
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
import { Pencil, Search } from "lucide-react";
import CountrySinglePicker from "@/components/common/CountrySinglePicker";
import CountryFlag from "@/components/common/CountryFlag";
import { upsertDivision } from "../actions";
import { supabase } from "@/lib/supabase/client";
import CsvImporter from "@/components/admin/CsvImporter";
import { bulkUpsertDivisions } from "../bulkActions";

const dnEs = new Intl.DisplayNames(["es"], { type: "region", fallback: "code" });

export default function DivisionsTableUI({ items }: { items: any[] }) {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
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

  const groupedDivisions = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const item of items) {
      const code = item.country_code || "XX";
      if (!groups[code]) groups[code] = [];
      groups[code].push(item);
    }
    for (const code of Object.keys(groups)) {
      groups[code].sort((a, b) => {
        // Status pending should go first maybe? Not requested, skip.
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

  const filteredGroups = React.useMemo(() => {
    if (!searchQuery.trim()) return groupedDivisions;
    const lower = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return groupedDivisions.filter(([code]) => {
      const countryName = code === "XX" ? "Sin país" : (dnEs.of(code) || code);
      return countryName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(lower);
    });
  }, [groupedDivisions, searchQuery]);

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

        const { error: upErr } = await supabase.storage.from("teams").upload(key, crestFile, { upsert: true });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage.from("teams").getPublicUrl(key);
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

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
        <Input
          placeholder="Buscar país..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          startContent={<Search className="w-4 h-4 text-default-400" />}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <CsvImporter 
            buttonLabel="Importar CSV"
            title="Importación Masiva de Divisiones"
            expectedColumns={["name", "country_code", "level", "is_youth", "crest_url", "reference_url"]}
            onImport={bulkUpsertDivisions}
            onSuccess={() => window.location.reload()}
          />
          <Button onPress={() => openEditor()} color="primary">Crear División</Button>
        </div>
      </div>
      
      <Accordion variant="splitted" selectionMode="multiple">
        {filteredGroups.map(([code, divisions]) => {
          const countryName = code === "XX" ? "Sin país" : (dnEs.of(code) || code);
          const pendingCount = divisions.filter(d => d.status === "pending").length;
          
          return (
            <AccordionItem 
              key={code} 
              title={
                <div className="flex items-center gap-3">
                  {code !== "XX" && <CountryFlag code={code} size={20} />}
                  <span className="font-semibold text-lg">{countryName}</span>
                  <span className="text-neutral-500 text-sm">({divisions.length})</span>
                  {pendingCount > 0 && <Chip size="sm" color="warning" variant="faded">{pendingCount} pendientes</Chip>}
                </div>
              }
            >
              <Table aria-label={`Tabla de divisiones de ${countryName}`} removeWrapper className="bg-transparent shadow-none" classNames={{ wrapper: "bg-transparent shadow-none" }}>
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
                        <img src={item.crest_url || "/images/team-default.svg"} alt="" className="w-8 h-8 object-contain" />
                        <div className="flex flex-col">
                          <span>{item.name}</span>
                          {item.is_youth && <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Juvenil</span>}
                        </div>
                      </TableCell>
                      <TableCell>{item.level || "-"}</TableCell>
                      <TableCell>
                        <Chip size="sm" color={item.status === "approved" ? "success" : item.status === "pending" ? "warning" : "danger"}>
                          {item.status}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <Tooltip content="Editar división">
                          <Button isIconOnly size="sm" variant="light" onPress={() => openEditor(item)}>
                            <Pencil className="w-4 h-4 text-default-500" />
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

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
        <ModalContent>
          <ModalHeader>{selectedItem ? "Editar División" : "Crear División"}</ModalHeader>
          <ModalBody className="pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-4">
                <Input label="Nombre de la Liga/División" placeholder="Ej: Premier League" variant="bordered" value={name} onChange={e => setName(e.target.value)} />
                <CountrySinglePicker
                  label="País"
                  value={countryPick}
                  onChange={setCountryPick}
                />
                <Input label="Nivel jerárquico" placeholder="Ej: 1 (Primera División)" variant="bordered" type="number" value={level.toString()} onChange={e => setLevel(e.target.value ? Number(e.target.value) : "")} isDisabled={isYouth} />
                <Input label="URL de Referencia (Opcional)" placeholder="Ej: Transfermarkt, Besoccer, Sitio Oficial..." variant="bordered" type="url" value={referenceUrl} onChange={e => setReferenceUrl(e.target.value)} />
              </div>
              <div className="flex flex-col gap-4">
                <Select label="Estado de Validación" variant="bordered" selectedKeys={[status]} onSelectionChange={(k) => setStatus(Array.from(k)[0] as any)}>
                  <SelectItem key="pending">Pendiente de Aprobación</SelectItem>
                  <SelectItem key="approved">Aprobado y Activo</SelectItem>
                  <SelectItem key="rejected">Rechazado</SelectItem>
                </Select>
                <div className="flex flex-col gap-3 p-3 border border-default-200 rounded-medium bg-default-50/50">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm">Escudo de la Competición</span>
                    <Input type="file" size="sm" variant="flat" onChange={(e) => setCrestFile(e.target.files?.[0] || null)} />
                  </div>
                  
                  <div className="flex items-center w-full gap-2 opacity-50">
                    <hr className="flex-1 border-neutral-300" />
                    <span className="text-[10px] text-neutral-500 uppercase font-semibold">O pegar enlace</span>
                    <hr className="flex-1 border-neutral-300" />
                  </div>
                  
                  <div>
                    <Input type="url" size="sm" placeholder="https://wikipedia.org/.../logo.svg" value={externalCrestUrl} onChange={e => setExternalCrestUrl(e.target.value)} />
                    <p className="text-[10px] text-default-400 mt-1">El URL reemplazará el archivo si se especifica.</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1 p-3 border border-default-200 rounded-medium bg-default-50/50">
                  <Switch isSelected={isYouth} onValueChange={setIsYouth} size="sm">
                    Categoría Juvenil / Formativa
                  </Switch>
                  <p className="text-xs text-default-400 pl-8">Marcá esta opción si la división corresponde a ligas formacionales (ej. Reserva, Sub-20, Primavera).</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button color="primary" onPress={handleSave} isLoading={busy} className="px-8">
                Guardar División
              </Button>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
