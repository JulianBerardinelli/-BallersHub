"use client";

import * as React from "react";
import { Switch, Chip } from "@heroui/react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase/client";
import TeamCombobox, {
  type TeamComboboxValue,
  type NewTeamValue,
} from "./TeamCombobox";

export type { TeamLite } from "./TeamCombobox";

export type TeamPickerValue =
  | {
      mode: "approved";
      teamId: string;
      teamName: string;
      country?: string | null;
      countryCode?: string | null;
      teamCrest?: string | null;
    }
  | { mode: "new"; name: string; country?: string | null; countryCode?: string | null; tmUrl?: string | null }
  | { mode: "free" }
  | null;

/**
 * Player onboarding team picker — "Club actual".
 *
 * Thin wrapper around the shared {@link TeamCombobox}: it owns the "free agent"
 * toggle (a player-only concept) and fires the early
 * `request_team_from_application` RPC when a brand-new club is proposed. The
 * search / propose UX itself lives in TeamCombobox.
 */
export default function TeamPickerCombo({
  applicationId,
  defaultValue = null,
  isFreeAgent,
  onFreeAgentChange,
  onChange,
  isInvalid,
  errorMessage,
}: {
  applicationId?: string;
  defaultValue?: TeamPickerValue;
  isFreeAgent: boolean;
  onFreeAgentChange: (val: boolean) => void;
  onChange: (v: TeamPickerValue) => void;
  isInvalid?: boolean;
  errorMessage?: React.ReactNode;
}) {
  const t = useTranslations("teamPicker");

  // The combobox only knows approved/new/null; "free" is represented here by
  // the toggle plus a null combobox value.
  const comboValue: TeamComboboxValue =
    defaultValue && defaultValue.mode !== "free" ? defaultValue : null;

  async function handleProposeNew(v: NewTeamValue) {
    if (!applicationId) return;
    const { error } = await supabase.rpc("request_team_from_application", {
      p_application_id: applicationId,
      p_name: v.name,
      p_country: v.country ?? null,
      p_category: null,
      p_tm_url: v.tmUrl ?? null,
      p_country_code: v.countryCode ?? null,
    });
    if (error) console.error("request_team_from_application:", error.message);
  }

  function toggleFree(val: boolean) {
    onFreeAgentChange(val);
    onChange(val ? { mode: "free" } : null);
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2">
          {t("label.current")}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-bh-fg-3">{t("freeAgent")}</span>
          <Switch
            isSelected={isFreeAgent}
            onValueChange={toggleFree}
            size="sm"
            classNames={{
              wrapper: "group-data-[selected=true]:bg-bh-lime",
              thumb: "bg-bh-fg-1 group-data-[selected=true]:bg-bh-black",
            }}
          />
        </div>
      </div>

      <TeamCombobox
        value={comboValue}
        onChange={(v) => onChange(v)}
        onProposeNew={handleProposeNew}
        variant="block"
        label=" "
        placeholder={isFreeAgent ? t("placeholder.disabledFree") : t("placeholder.search")}
        isDisabled={isFreeAgent}
        isInvalid={isInvalid}
        errorMessage={errorMessage}
      />

      {isFreeAgent && (
        <div className="min-h-9">
          <Chip variant="flat" classNames={bhChipNeutral}>
            {t("chip.free")}
          </Chip>
        </div>
      )}
    </div>
  );
}

const bhChipNeutral = {
  base: "border border-white/[0.12] bg-white/[0.06] text-bh-fg-2",
  content: "text-[12px]",
};
