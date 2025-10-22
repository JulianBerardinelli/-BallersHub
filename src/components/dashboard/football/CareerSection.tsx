"use client";

import * as React from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Autocomplete,
  AutocompleteItem,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import CountrySinglePicker, { type CountryPick } from "@/components/common/CountrySinglePicker";
import CountryFlag from "@/components/common/CountryFlag";
import { AlertCircle, Edit3, Plus } from "lucide-react";

export type CareerStage = {
  id: string;
  club: string;
  division: string | null;
  startYear: number | null;
  endYear: number | null;
  team: {
    id: string | null;
    name: string | null;
    crestUrl: string | null;
    countryCode: string | null;
  } | null;
};

export type PendingCareerRequest = {
  id: string;
  status: string;
  club: string;
  division: string | null;
  startYear: number | null;
  endYear: number | null;
  careerItemId: string | null;
  teamName: string | null;
};

type TeamLite = {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  country_code: string | null;
  crest_url: string | null;
};

type Props = {
  stages: CareerStage[];
  pendingRequest: PendingCareerRequest | null;
  applicationId: string;
};

type ModalState =
  | { mode: "create"; stage: null }
  | { mode: "update"; stage: CareerStage }
  | null;

export default function CareerSection({ stages, pendingRequest, applicationId }: Props) {
  const [modal, setModal] = React.useState<ModalState>(null);

  const openCreate = () => setModal({ mode: "create", stage: null });
  const openEdit = (stage: CareerStage) => setModal({ mode: "update", stage });
  const closeModal = () => setModal(null);

  return (
    <Card className="border border-neutral-800 bg-neutral-950/40">
      <CardHeader className="flex-col items-start gap-2">
        <div>
          <h3 className="text-lg font-semibold">Trayectoria</h3>
          <p className="text-sm text-neutral-400">
            Administrá tus etapas profesionales y solicitá cambios para mantener tu perfil actualizado.
          </p>
        </div>
        <div className="flex w-full items-center justify-between">
          {pendingRequest ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-200">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Solicitud en revisión</p>
                <p className="text-xs text-amber-100/80">
                  Tenés un cambio pendiente por revisar. El equipo de administración lo procesará a la brevedad.
                </p>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              color="primary"
              startContent={<Plus size={16} />}
              onPress={openCreate}
            >
              Agregar etapa
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {stages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-800 p-6 text-center text-sm text-neutral-400">
            Todavía no registraste etapas en tu trayectoria. Podés solicitar la carga de tu primer club con el botón
            &ldquo;Agregar etapa&rdquo;.
          </div>
        ) : (
          <ul className="space-y-3">
            {stages.map((stage) => (
              <li
                key={stage.id}
                className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={stage.team?.crestUrl || "/images/team-default.svg"}
                    alt=""
                    className="h-10 w-10 rounded bg-neutral-800 object-contain"
                  />
                  <div>
                    <p className="font-semibold text-white">
                      {stage.team?.name ?? stage.club}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {stage.division ?? "División pendiente"}
                      {stage.team?.countryCode ? (
                        <span className="ml-2 inline-flex items-center gap-1">
                          <CountryFlag code={stage.team.countryCode} size={12} />
                          <span>{stage.team.countryCode}</span>
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {stage.startYear ?? "¿?"} – {stage.endYear ?? "Actual"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end md:self-auto">
                  {stage.endYear === null && <Chip color="primary" variant="flat">Club actual</Chip>}
                  <Button
                    size="sm"
                    variant="flat"
                    startContent={<Edit3 size={16} />}
                    onPress={() => openEdit(stage)}
                    isDisabled={!!pendingRequest}
                  >
                    Solicitar edición
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>

      <CareerStageModal
        state={modal}
        onClose={closeModal}
        applicationId={applicationId}
        onSubmitted={closeModal}
      />
    </Card>
  );
}

type ModalProps = {
  state: ModalState;
  onClose: () => void;
  applicationId: string;
  onSubmitted: () => void;
};

type FormState = {
  club: string;
  division: string;
  startYear: string;
  endYear: string;
  teamKey: string | null;
  selectedTeam: TeamLite | null;
  proposedCountry: CountryPick | null;
  proposedTmUrl: string;
};

function CareerStageModal({ state, onClose, applicationId, onSubmitted }: ModalProps) {
  const router = useRouter();
  const isOpen = state !== null;
  const mode = state?.mode ?? "create";
  const stage = state?.stage ?? null;
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<TeamLite[]>([]);
  const [search, setSearch] = React.useState(stage?.team?.name ?? stage?.club ?? "");
  const [fetching, setFetching] = React.useState(false);

  const [form, setForm] = React.useState<FormState>(() => ({
    club: stage?.team?.name ?? stage?.club ?? "",
    division: stage?.division ?? "",
    startYear: stage?.startYear ? String(stage.startYear) : "",
    endYear: stage?.endYear ? String(stage.endYear) : "",
    teamKey: stage?.team?.id ?? null,
    selectedTeam: stage?.team?.id
      ? {
          id: stage.team.id!,
          name: stage.team.name ?? "",
          slug: stage.team.name ? stage.team.name.toLowerCase().replace(/\s+/g, "-") : "",
          country: null,
          country_code: stage.team.countryCode ?? null,
          crest_url: stage.team.crestUrl ?? null,
        }
      : null,
    proposedCountry: null,
    proposedTmUrl: "",
  }));

  React.useEffect(() => {
    if (!isOpen) return;
    if (!search.trim()) {
      setItems([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setFetching(true);
      const { data, error } = await supabase.rpc("search_teams", {
        p_q: search.trim(),
        p_limit: 8,
      });
      if (cancelled) return;
      setFetching(false);
      if (error) {
        console.error("search_teams", error.message);
        setItems([]);
        return;
      }
      setItems((data ?? []) as TeamLite[]);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, search]);

  const selectTeam = React.useCallback((team: TeamLite) => {
    setForm((prev) => ({
      ...prev,
      club: team.name,
      teamKey: team.id,
      selectedTeam: team,
      proposedCountry: null,
      proposedTmUrl: "",
    }));
    setSearch(team.name);
  }, []);

  const selectNewTeam = React.useCallback((label: string) => {
    const clean = label.trim();
    setForm((prev) => ({
      ...prev,
      club: clean,
      teamKey: `new:${clean}`,
      selectedTeam: null,
    }));
    setSearch(clean);
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSearch(stage?.team?.name ?? stage?.club ?? "");
    setForm({
      club: stage?.team?.name ?? stage?.club ?? "",
      division: stage?.division ?? "",
      startYear: stage?.startYear ? String(stage.startYear) : "",
      endYear: stage?.endYear ? String(stage.endYear) : "",
      teamKey: stage?.team?.id ?? null,
      selectedTeam: stage?.team?.id
        ? {
            id: stage.team.id!,
            name: stage.team.name ?? "",
            slug: stage.team.name ? stage.team.name.toLowerCase().replace(/\s+/g, "-") : "",
            country: null,
            country_code: stage.team.countryCode ?? null,
            crest_url: stage.team.crestUrl ?? null,
          }
        : null,
      proposedCountry: null,
      proposedTmUrl: "",
    });
  }, [isOpen, stage]);

  async function handleSubmit() {
    if (!form.club.trim() || form.club.trim().length < 2) {
      setError("Ingresá el nombre del club.");
      return;
    }
    const startYear = form.startYear ? Number(form.startYear) : null;
    const endYear = form.endYear ? Number(form.endYear) : null;
    if (form.startYear && (Number.isNaN(startYear) || form.startYear.length !== 4)) {
      setError("El año de inicio debe tener 4 dígitos.");
      return;
    }
    if (form.endYear && (Number.isNaN(endYear) || form.endYear.length !== 4)) {
      setError("El año de finalización debe tener 4 dígitos.");
      return;
    }
    if (startYear && endYear && startYear > endYear) {
      setError("El año de inicio no puede ser mayor al de finalización.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/career/proposals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: mode,
          careerItemId: stage?.id ?? null,
          club: form.club.trim(),
          division: form.division.trim() || null,
          startYear,
          endYear,
          teamId: form.teamKey && !form.teamKey.startsWith("new:") ? form.teamKey : null,
          proposedTeam:
            form.teamKey && form.teamKey.startsWith("new:")
              ? {
                  country: form.proposedCountry
                    ? { code: form.proposedCountry.code, name: form.proposedCountry.name }
                    : null,
                  tmUrl: form.proposedTmUrl ? form.proposedTmUrl.trim() : null,
                }
              : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo enviar la solicitud");
      }
      onSubmitted();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()} size="lg" backdrop="blur">
      <ModalContent>
        {(close) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              {mode === "create" ? "Agregar nueva etapa" : "Editar etapa"}
              <span className="text-xs font-normal text-neutral-400">
                La solicitud será revisada por el equipo de BallersHub antes de reflejarse en tu perfil.
              </span>
            </ModalHeader>
            <ModalBody className="space-y-4">
              <div className="grid gap-3">
                <Autocomplete
                  label="Club"
                  labelPlacement="outside"
                  menuTrigger="input"
                  inputValue={search}
                  onInputChange={(value) => {
                    setSearch(value);
                    setForm((prev) => {
                      const next = { ...prev, club: value };
                      const shouldReset =
                        prev.teamKey !== null &&
                        (value.trim().length === 0 || (prev.selectedTeam && value !== prev.selectedTeam.name));
                      if (shouldReset) {
                        return {
                          ...next,
                          teamKey: null,
                          selectedTeam: null,
                          proposedCountry: null,
                          proposedTmUrl: "",
                        };
                      }
                      return next;
                    });
                  }}
                  selectedKey={form.teamKey ?? undefined}
                  isLoading={fetching}
                  onSelectionChange={(key) => {
                    const k = String(key || "");
                    if (!k) return;
                    if (k.startsWith("new:")) {
                      selectNewTeam(search.trim());
                    } else {
                      const team = items.find((item) => item.id === k);
                      if (team) selectTeam(team);
                    }
                  }}
                  items={
                    search.trim().length > 1 && !fetching && items.length === 0
                      ? ([
                          {
                            id: `new:${search.trim()}`,
                            name: search.trim(),
                            slug: "",
                            country: null,
                            country_code: null,
                            crest_url: null,
                          },
                        ] as TeamLite[])
                      : items
                  }
                  placeholder="Buscá tu club"
                >
                  {(item: TeamLite) => {
                    const isNew = String(item.id).startsWith("new:");
                    if (isNew) {
                      return (
                        <AutocompleteItem key={item.id} textValue={`Proponer ${item.name}`}>
                          <div className="flex flex-col">
                            <span>{item.name}</span>
                            <span className="text-xs text-neutral-500">Crear solicitud de nuevo equipo</span>
                          </div>
                        </AutocompleteItem>
                      );
                    }
                    return (
                      <AutocompleteItem
                        key={item.id}
                        textValue={`${item.name} ${item.slug}`}
                        startContent={
                          <img
                            src={item.crest_url || "/images/team-default.svg"}
                            alt=""
                            className="h-6 w-6 rounded bg-neutral-800 object-contain"
                          />
                        }
                        description={
                          <div className="flex items-center gap-1 text-xs text-neutral-500">
                            {item.country_code && <CountryFlag code={item.country_code} size={12} />}
                            {item.country_code ? `(${item.country_code})` : null} · @{item.slug}
                          </div>
                        }
                      >
                        {item.name}
                      </AutocompleteItem>
                    );
                  }}
                </Autocomplete>

                <Input
                  label="División / Categoría"
                  labelPlacement="outside"
                  value={form.division}
                  onChange={(event) => setForm((prev) => ({ ...prev, division: event.target.value }))}
                  placeholder="Primera División, Sub-20, etc."
                />

                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    label="Desde (año)"
                    labelPlacement="outside"
                    value={form.startYear}
                    onChange={(event) => setForm((prev) => ({ ...prev, startYear: event.target.value.replace(/[^0-9]/g, "").slice(0, 4) }))}
                    placeholder="2018"
                    inputMode="numeric"
                  />
                  <Input
                    label="Hasta (año)"
                    labelPlacement="outside"
                    value={form.endYear}
                    onChange={(event) => setForm((prev) => ({ ...prev, endYear: event.target.value.replace(/[^0-9]/g, "").slice(0, 4) }))}
                    placeholder="2024 o vacío para Actual"
                    inputMode="numeric"
                  />
                </div>

                {form.teamKey && form.teamKey.startsWith("new:") && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <CountrySinglePicker
                      label="País del equipo"
                      value={form.proposedCountry}
                      onChange={(value) => setForm((prev) => ({ ...prev, proposedCountry: value }))}
                    />
                    <Input
                      label="Transfermarkt (opcional)"
                      labelPlacement="outside"
                      value={form.proposedTmUrl}
                      onChange={(event) => setForm((prev) => ({ ...prev, proposedTmUrl: event.target.value }))}
                      placeholder="https://www.transfermarkt.com/..."
                    />
                  </div>
                )}

                {error && <p className="text-sm text-red-500">{error}</p>}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={close} isDisabled={loading}>
                Cancelar
              </Button>
              <Button color="primary" onPress={handleSubmit} isLoading={loading}>
                Enviar solicitud
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
