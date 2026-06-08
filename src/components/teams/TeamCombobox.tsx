"use client";

import * as React from "react";
import Image from "next/image";
import {
  Autocomplete,
  AutocompleteItem,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase/client";
import CountryFlag from "@/components/common/CountryFlag";
import CountrySinglePicker, { type CountryPick } from "@/components/common/CountrySinglePicker";
import FormField from "@/components/dashboard/client/FormField";
import { bhButtonClass } from "@/components/ui/BhButton";
import { bhChip, bhModalClassNames } from "@/lib/ui/heroui-brand";

export type TeamLite = {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  country_code: string | null;
  crest_url: string | null;
};

export type TeamComboboxValue =
  | {
      mode: "approved";
      teamId: string;
      teamName: string;
      country?: string | null;
      countryCode?: string | null;
      teamCrest?: string | null;
    }
  | {
      mode: "new";
      name: string;
      country?: string | null;
      countryCode?: string | null;
      tmUrl?: string | null;
    }
  | null;

export type NewTeamValue = Extract<TeamComboboxValue, { mode: "new" }>;

const URL_RE = /^https?:\/\/[^ "]+$/i;
const ADD_PREFIX = "__add__:";

/** Shared team search-or-propose combobox.
 *
 * Replaces the duplicated autocomplete logic across the player onboarding
 * picker, the agency picker and the career-row editor. Two UX fixes baked in:
 *
 *  - The "add my club" option is ALWAYS offered while typing (not only when
 *    there are zero search matches), pinned to the bottom of the list and
 *    visually distinct — so a club whose name collides with existing teams is
 *    never a dead end.
 *  - Proposing a new club opens a single guided modal (name + country +
 *    optional Transfermarkt) instead of inline fields appearing mid-form.
 *
 * Controlled via `value` + `onChange`. "Free agent" lives in the wrapper, not
 * here. `onProposeNew` fires once when a brand-new club is confirmed (the
 * onboarding wrapper uses it to call `request_team_from_application`).
 */
export default function TeamCombobox({
  value,
  onChange,
  onProposeNew,
  variant = "block",
  label,
  placeholder,
  seedText,
  isDisabled,
  isInvalid,
  errorMessage,
  limit = 10,
}: {
  value: TeamComboboxValue;
  onChange: (v: TeamComboboxValue) => void;
  onProposeNew?: (v: NewTeamValue) => void;
  variant?: "block" | "field";
  label?: string;
  placeholder?: string;
  /** Pre-fills the search box when `value` is null — used to keep a legacy
   * free-text club name visible while the user re-links or re-proposes it. */
  seedText?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  errorMessage?: React.ReactNode;
  limit?: number;
}) {
  const t = useTranslations("teamPicker");

  const [inputValue, setInputValue] = React.useState<string>(() => deriveInput(value) || (seedText ?? ""));
  const [items, setItems] = React.useState<TeamLite[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedKey, setSelectedKey] = React.useState<string | null>(() => deriveKey(value));
  const [selectedTeam, setSelectedTeam] = React.useState<TeamLite | null>(() => deriveTeam(value));
  const selectedLabelRef = React.useRef<string | null>(deriveInput(value) || null);

  // Guards the controlled-value sync effect against its own echo: when WE emit
  // a value the parent reflects it straight back, and we must not clobber the
  // input the user is typing. Only genuinely external changes get applied.
  const lastEmittedRef = React.useRef<string>(JSON.stringify(value ?? null));

  // Guided "add your club" modal.
  const [modalOpen, setModalOpen] = React.useState(false);
  const [draftName, setDraftName] = React.useState("");
  const [draftCountry, setDraftCountry] = React.useState<CountryPick | null>(null);
  const [draftTm, setDraftTm] = React.useState("");
  const [triedSave, setTriedSave] = React.useState(false);

  function emit(v: TeamComboboxValue) {
    lastEmittedRef.current = JSON.stringify(v ?? null);
    onChange(v);
  }

  // Apply external value changes (parent resets, initial hydration after the
  // first render, switching rows). Skips our own echoes.
  React.useEffect(() => {
    const incoming = JSON.stringify(value ?? null);
    if (incoming === lastEmittedRef.current) return;
    lastEmittedRef.current = incoming;
    setInputValue(deriveInput(value));
    setSelectedKey(deriveKey(value));
    setSelectedTeam(deriveTeam(value));
    selectedLabelRef.current = deriveInput(value) || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value)]);

  // Debounced team search.
  React.useEffect(() => {
    const q = inputValue.trim();
    if (!q) {
      setItems([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("search_teams", { p_q: q, p_limit: limit });
      if (cancelled) return;
      setLoading(false);
      if (error) {
        console.error("search_teams:", error.message);
        setItems([]);
        return;
      }
      const list = (data ?? []) as TeamLite[];
      setItems(list);
      if (selectedKey && !String(selectedKey).startsWith(ADD_PREFIX) && !selectedTeam) {
        const found = list.find((x) => x.id === selectedKey);
        if (found) setSelectedTeam(found);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, limit]);

  const trimmed = inputValue.trim();
  const hasExactMatch = items.some((i) => i.name.toLowerCase() === trimmed.toLowerCase());
  // The add affordance is offered whenever the user has typed something real
  // and it isn't an exact existing name — independent of how many partial
  // matches came back.
  const showAdd = !isDisabled && !loading && trimmed.length > 1 && !hasExactMatch;
  const selectedNewName = value?.mode === "new" ? value.name : null;

  const listItems = React.useMemo<TeamLite[]>(() => {
    const out: TeamLite[] = [];
    // Keep the selected approved team present even before a search repopulates
    // `items`, so HeroUI can resolve the controlled selectedKey.
    if (value?.mode === "approved" && !items.some((i) => i.id === value.teamId)) {
      out.push({
        id: value.teamId,
        name: value.teamName,
        slug: "",
        country: value.country ?? null,
        country_code: value.countryCode ?? null,
        crest_url: value.teamCrest ?? null,
      });
    }
    out.push(...items);
    if (selectedNewName) out.push(makeAddItem(selectedNewName));
    if (showAdd && trimmed.toLowerCase() !== (selectedNewName ?? "").toLowerCase()) {
      out.push(makeAddItem(trimmed));
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, showAdd, trimmed, selectedNewName, JSON.stringify(value)]);

  function handleInputChange(v: string) {
    setInputValue(v);
    if (selectedKey && selectedLabelRef.current && v !== selectedLabelRef.current) {
      setSelectedKey(null);
      setSelectedTeam(null);
      selectedLabelRef.current = null;
      emit(null);
    }
  }

  function handleSelection(key: React.Key | null) {
    const id = String(key || "");
    if (!id) return;
    if (id.startsWith(ADD_PREFIX)) {
      openAddModal(id.slice(ADD_PREFIX.length) || trimmed);
      return;
    }
    const team = items.find((x) => x.id === id) ?? (selectedTeam?.id === id ? selectedTeam : null);
    if (team) {
      setSelectedKey(team.id);
      selectedLabelRef.current = team.name;
      setSelectedTeam(team);
      setInputValue(team.name);
      emit({
        mode: "approved",
        teamId: team.id,
        teamName: team.name,
        country: team.country ?? undefined,
        countryCode: team.country_code ?? undefined,
        teamCrest: team.crest_url ?? null,
      });
    }
  }

  function openAddModal(name: string) {
    setDraftName(name);
    setTriedSave(false);
    if (value?.mode === "new" && value.name === name) {
      setDraftCountry(
        value.countryCode ? { code: value.countryCode, name: value.country ?? value.countryCode } : null,
      );
      setDraftTm(value.tmUrl ?? "");
    } else {
      setDraftCountry(null);
      setDraftTm("");
    }
    setModalOpen(true);
  }

  const draftUrlOk = !draftTm.trim() || URL_RE.test(draftTm.trim());
  const canSaveModal = !!draftCountry && draftUrlOk && draftName.trim().length > 1;

  function confirmAdd() {
    if (!canSaveModal) {
      setTriedSave(true);
      return;
    }
    const v: NewTeamValue = {
      mode: "new",
      name: draftName.trim(),
      country: draftCountry?.name ?? null,
      countryCode: draftCountry?.code ?? null,
      tmUrl: draftTm.trim() || null,
    };
    const wasNewBefore = value?.mode === "new" && value.name === v.name;
    setSelectedKey(`${ADD_PREFIX}${v.name}`);
    selectedLabelRef.current = v.name;
    setSelectedTeam(null);
    setInputValue(v.name);
    setModalOpen(false);
    emit(v);
    if (!wasNewBefore) onProposeNew?.(v);
  }

  function clearSelection() {
    setInputValue("");
    setItems([]);
    setSelectedKey(null);
    setSelectedTeam(null);
    selectedLabelRef.current = null;
    emit(null);
  }

  return (
    <div className="grid gap-2">
      <Autocomplete
        label={label ?? t("label.club")}
        labelPlacement="outside"
        classNames={{ base: "!mt-0" }}
        inputProps={{
          classNames: {
            inputWrapper:
              "bg-bh-surface-1 border border-white/[0.08] shadow-none transition-colors duration-150 hover:border-white/[0.18] data-[focus=true]:border-bh-lime data-[focus=true]:bg-bh-surface-1 data-[invalid=true]:border-bh-danger",
            input: "text-[14px] text-bh-fg-1 placeholder:text-bh-fg-4",
            label: "!text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2 whitespace-nowrap",
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
              "bg-bh-surface-1 border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.7)] p-1 rounded-bh-lg min-w-[300px]",
          },
        }}
        menuTrigger="input"
        allowsCustomValue={false}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        selectedKey={selectedKey ?? undefined}
        onSelectionChange={handleSelection}
        items={listItems}
        isDisabled={isDisabled}
        isLoading={loading}
        placeholder={placeholder ?? t("placeholder.searchTeam")}
        isInvalid={isInvalid}
        errorMessage={errorMessage}
        startContent={
          value?.mode === "approved" && selectedTeam ? (
            <Image
              src={selectedTeam.crest_url || "/images/team-default.svg"}
              width={18}
              height={18}
              unoptimized={!selectedTeam.crest_url}
              className="h-5 w-5 object-contain"
              alt=""
            />
          ) : value?.mode === "new" ? (
            <span className="rounded bg-[rgba(204,255,0,0.15)] px-1.5 py-0.5 text-[10px] font-semibold text-bh-lime">
              {t("badge.new")}
            </span>
          ) : null
        }
        description={
          value?.mode === "approved" && selectedTeam ? (
            <span className="flex items-center gap-1 text-bh-fg-4">
              {selectedTeam.country_code && <CountryFlag code={selectedTeam.country_code} size={12} />}
              {selectedTeam.country_code ? `(${selectedTeam.country_code})` : null}
              {selectedTeam.slug ? ` · @${selectedTeam.slug}` : null}
            </span>
          ) : value?.mode === "new" ? (
            <span className="text-bh-fg-4">{t("option.addHint")}</span>
          ) : undefined
        }
      >
        {(item: TeamLite) => {
          const isAdd = String(item.id).startsWith(ADD_PREFIX);
          if (isAdd) {
            return (
              <AutocompleteItem
                key={item.id}
                textValue={t("option.add", { name: item.name })}
                className="mt-1 border-t border-white/[0.08] data-[hover=true]:bg-[rgba(204,255,0,0.08)]"
                startContent={
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-[rgba(204,255,0,0.15)] text-[15px] leading-none text-bh-lime">
                    +
                  </span>
                }
              >
                <div className="flex flex-col">
                  <span className="text-bh-lime">{t("option.add", { name: item.name })}</span>
                  <span className="text-[11px] text-bh-fg-4">{t("option.addHint")}</span>
                </div>
              </AutocompleteItem>
            );
          }
          return (
            <AutocompleteItem
              key={item.id}
              textValue={`${item.name} ${item.slug}`}
              startContent={
                <Image
                  src={item.crest_url || "/images/team-default.svg"}
                  width={18}
                  height={18}
                  unoptimized={!item.crest_url}
                  className="h-5 w-5 object-contain"
                  alt=""
                />
              }
              description={
                <span className="flex items-center gap-1 text-bh-fg-4">
                  {item.country_code && <CountryFlag code={item.country_code} size={12} />}
                  {item.country_code ? `(${item.country_code})` : null}
                  {item.slug ? ` · @${item.slug}` : null}
                </span>
              }
            >
              {item.name}
            </AutocompleteItem>
          );
        }}
      </Autocomplete>

      {/* Signpost so users know the add path exists before they hit zero results. */}
      {variant === "block" && !isDisabled && !value && (
        <p className="text-[11px] text-bh-fg-4">{t("hint.signpost")}</p>
      )}

      {/* Selection feedback (block layout). */}
      {variant === "block" && !isDisabled && value?.mode === "approved" && (
        <div className="min-h-9">
          <Chip variant="flat" classNames={bhChip("success")}>
            {t("chip.selected", { name: value.teamName })}
          </Chip>
        </div>
      )}
      {variant === "block" && !isDisabled && value?.mode === "new" && (
        <div className="flex min-h-9 flex-wrap items-center gap-2">
          <Chip
            variant="flat"
            onClose={clearSelection}
            classNames={{ ...bhChip("warning"), closeButton: "text-bh-warning hover:opacity-70" }}
          >
            {t("chip.added", { name: value.name })}
          </Chip>
          <button
            type="button"
            onClick={() => openAddModal(value.name)}
            className="text-[11px] text-bh-lime hover:underline"
          >
            {t("details.edit")}
          </button>
        </div>
      )}

      {/* Compact edit affordance for the career-row layout. */}
      {variant === "field" && value?.mode === "new" && (
        <button
          type="button"
          onClick={() => openAddModal(value.name)}
          className="justify-self-start text-[11px] text-bh-lime hover:underline"
        >
          {t("details.edit")}
        </button>
      )}

      <Modal
        isOpen={modalOpen}
        onOpenChange={(o) => !o && setModalOpen(false)}
        size="md"
        backdrop="blur"
        scrollBehavior="inside"
        classNames={bhModalClassNames}
      >
        <ModalContent>
          <ModalHeader className="pr-12">{t("modal.title")}</ModalHeader>
          <ModalBody className="grid gap-3">
            <p className="text-[13px] text-bh-fg-3">{t("modal.intro")}</p>
            <div className="rounded-bh-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[14px] font-medium text-bh-fg-1">
              {draftName}
            </div>
            <CountrySinglePicker
              label={t("modal.country")}
              value={draftCountry}
              onChange={setDraftCountry}
              isInvalid={triedSave && !draftCountry}
              errorMessage={t("modal.countryRequired")}
            />
            <FormField
              label={t("modal.tm")}
              placeholder="https://www.transfermarkt.com/..."
              value={draftTm}
              onChange={(e) => setDraftTm(e.target.value)}
              isInvalid={!!draftTm.trim() && !draftUrlOk}
              errorMessage={t("modal.tmInvalid")}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              onPress={() => setModalOpen(false)}
              className={bhButtonClass({ variant: "ghost", size: "sm" })}
            >
              {t("modal.cancel")}
            </Button>
            <Button
              onPress={confirmAdd}
              isDisabled={!canSaveModal}
              className={bhButtonClass({ variant: "lime", size: "sm" })}
            >
              {t("modal.save")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

function makeAddItem(name: string): TeamLite {
  return { id: `${ADD_PREFIX}${name}`, name, slug: "", country: null, country_code: null, crest_url: null };
}

function deriveInput(v: TeamComboboxValue): string {
  if (v?.mode === "approved") return v.teamName;
  if (v?.mode === "new") return v.name;
  return "";
}

function deriveKey(v: TeamComboboxValue): string | null {
  if (v?.mode === "approved") return v.teamId;
  if (v?.mode === "new") return `${ADD_PREFIX}${v.name}`;
  return null;
}

function deriveTeam(v: TeamComboboxValue): TeamLite | null {
  if (v?.mode === "approved") {
    return {
      id: v.teamId,
      name: v.teamName,
      slug: "",
      country: v.country ?? null,
      country_code: v.countryCode ?? null,
      crest_url: v.teamCrest ?? null,
    };
  }
  return null;
}
