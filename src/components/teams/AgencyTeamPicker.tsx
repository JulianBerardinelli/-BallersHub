"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import TeamCombobox, { type TeamComboboxValue } from "./TeamCombobox";

export type { TeamLite } from "./TeamCombobox";
export type AgencyTeamPickerValue = TeamComboboxValue;

/**
 * Team picker for the agency dashboard.
 *
 * Same search-or-propose UX as the player picker but without the "free agent"
 * toggle and without the early `request_team_from_application` RPC — the
 * proposal is persisted by the parent's `createAgencyTeamSubmissionAction`.
 * `defaultValue` is treated as the controlled value: the parent keeps it in its
 * draft state and re-injects it (and resets to `null` after a submission).
 */
export default function AgencyTeamPicker({
  defaultValue = null,
  onChange,
  isInvalid,
  errorMessage,
  label,
  placeholder,
}: {
  defaultValue?: AgencyTeamPickerValue;
  onChange: (v: AgencyTeamPickerValue) => void;
  isInvalid?: boolean;
  errorMessage?: React.ReactNode;
  label?: string;
  placeholder?: string;
}) {
  const t = useTranslations("teamPicker");
  return (
    <TeamCombobox
      value={defaultValue}
      onChange={onChange}
      variant="block"
      label={label ?? t("label.club")}
      placeholder={placeholder ?? t("placeholder.searchTeam")}
      isInvalid={isInvalid}
      errorMessage={errorMessage}
    />
  );
}
