"use client";

// BallersHub /players (Scouting) — dense, sortable table.
//
// Ported from `table.jsx`, mapped to real columns (no rating/league/metric —
// we don't have that data; market value takes the headline-number slot). Each
// row is a real <Link> to the player's profile: that's what makes the table
// double as the crawlable internal-link surface the SEO fix needs, AND the
// primary navigation for a scout.

import Link from "next/link";
import { useTranslations } from "next-intl";

import { ClubCrest, ContractTag, FlagStack, MarqueeText, PlayerAvatar } from "./atoms";
import { cityKeyOf } from "@/lib/scouting/cities";
import { countryName } from "@/lib/scouting/taxonomies";
import type {
  ScoutPlayer,
  ScoutSort,
  ScoutSortKey,
} from "@/lib/scouting/types";

type Density = "compact" | "comfortable";

type Column = {
  key: ScoutSortKey;
  labelKey: string;
  width: string;
  align?: "right" | "center";
  mono?: boolean;
};

const COLUMNS: Column[] = [
  { key: "name", labelKey: "table.columnPlayer", width: "minmax(220px, 1.5fr)" },
  { key: "posCode", labelKey: "table.columnPosition", width: "132px" },
  { key: "age", labelKey: "table.columnAge", width: "58px", align: "right", mono: true },
  { key: "club", labelKey: "table.columnClub", width: "minmax(220px, 1.3fr)" },
  { key: "nationality", labelKey: "table.columnNationality", width: "104px" },
  { key: "contract", labelKey: "table.columnStatus", width: "120px" },
  { key: "foot", labelKey: "table.columnFoot", width: "54px", align: "center" },
  { key: "heightCm", labelKey: "table.columnHeight", width: "66px", align: "right", mono: true },
  { key: "marketValueEur", labelKey: "table.columnValue", width: "92px", align: "right", mono: true },
];

function formatValue(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `€${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (v >= 1_000) return `€${Math.round(v / 1000)}K`;
  return `€${v}`;
}

function SortIcon({ dir }: { dir: "asc" | "desc" }) {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" style={{ marginLeft: 4 }} aria-hidden>
      <path
        d={dir === "asc" ? "M2 6 L4.5 3 L7 6" : "M2 3 L4.5 6 L7 3"}
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlayersTable({
  players,
  sort,
  onSort,
  density,
  hoverPlayerId,
  onRowHover,
  highlightCityKey,
}: {
  players: ScoutPlayer[];
  sort: ScoutSort;
  onSort: (key: ScoutSortKey) => void;
  density: Density;
  /** Row currently hovered (mirrors globe sync). */
  hoverPlayerId?: string | null;
  /** Report row hover so the globe can fly to that player's city. */
  onRowHover?: (id: string | null) => void;
  /** City key active on the globe — rows in that city get highlighted. */
  highlightCityKey?: string | null;
}) {
  const t = useTranslations("scouting");
  const colsTpl = COLUMNS.map((c) => c.width).join(" ");
  const rowH = density === "compact" ? 50 : 64;
  const avatarSize = density === "compact" ? 34 : 42;

  return (
    <div className="players-table">
      <div className="pt-head" style={{ gridTemplateColumns: colsTpl }}>
        {COLUMNS.map((c) => {
          const label = t(c.labelKey);
          return (
            <button
              key={c.key}
              type="button"
              className="pt-h"
              data-align={c.align ?? "left"}
              data-active={sort.key === c.key}
              onClick={() => onSort(c.key)}
              aria-label={t("table.sortBy", { label })}
            >
              <span>{label}</span>
              {sort.key === c.key && <SortIcon dir={sort.dir} />}
            </button>
          );
        })}
      </div>

      <div className="pt-body">
        {players.length === 0 ? (
          <div className="pt-empty">
            <div className="pt-empty-title">{t("table.emptyTitle")}</div>
            <div className="pt-empty-sub">{t("table.emptySub")}</div>
          </div>
        ) : (
          players.map((p) => (
            <Link
              key={p.id}
              href={`/${p.slug}`}
              className="pt-row"
              data-pid={p.id}
              data-status={p.contract}
              data-hover={hoverPlayerId === p.id}
              data-globe-hover={
                highlightCityKey != null && cityKeyOf(p) === highlightCityKey
              }
              onMouseEnter={() => onRowHover?.(p.id)}
              onMouseLeave={() => onRowHover?.(null)}
              style={{ gridTemplateColumns: colsTpl, height: rowH }}
            >
              <div className="pt-c name">
                <PlayerAvatar player={p} size={avatarSize} />
                <div className="pt-name-wrap">
                  <MarqueeText className="pt-name" title={p.name}>
                    <span className="pt-name-text">{p.name}</span>
                    {p.isPro && <span className="pt-pro">{t("table.proBadge")}</span>}
                  </MarqueeText>
                  <div className="pt-sub">@{p.slug}</div>
                </div>
              </div>

              <div className="pt-c">
                {p.positions.length > 0 ? (
                  <div className="pt-pos-list">
                    {/* Up to 3 compact chips on one line; 4+ → 2 chips + "+N". */}
                    {(p.positions.length > 3
                      ? p.positions.slice(0, 2)
                      : p.positions
                    ).map((pos) => (
                      <span
                        key={pos.code}
                        className="pos-tag"
                        data-group={pos.group ?? undefined}
                      >
                        {pos.code}
                      </span>
                    ))}
                    {p.positions.length > 3 && (
                      <span
                        className="pos-tag pos-more"
                        title={p.positions.map((x) => x.code).join(" · ")}
                      >
                        +{p.positions.length - 2}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="value-dash">—</span>
                )}
              </div>

              <div className="pt-c" data-align="right" data-mono>
                {p.age ?? "—"}
              </div>

              <div className="pt-c club">
                {p.club ? (
                  <>
                    <ClubCrest club={p.club} crestUrl={p.clubCrestUrl} size={28} />
                    <div className="pt-club-block">
                      <div className="pt-club">{p.club}</div>
                      {p.clubCountryCode && (
                        <div className="pt-club-country">
                          <span
                            className={`pt-cc-flag flag-ico fi fi-${p.clubCountryCode.toLowerCase()}`}
                            role="img"
                            aria-label={p.clubCountryCode.toUpperCase()}
                          />
                          <span className="pt-cc-name">
                            {p.clubCountry ?? countryName(p.clubCountryCode)}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <span className="value-dash">{t("table.noClub")}</span>
                )}
              </div>

              <div className="pt-c">
                {p.nationalities.length > 0 ? (
                  <FlagStack codes={p.nationalities} />
                ) : (
                  <span className="value-dash">—</span>
                )}
              </div>

              <div className="pt-c">
                <ContractTag status={p.contract} />
              </div>

              <div className="pt-c" data-align="center">
                {p.foot ? (
                  <span className="foot-pill">{p.foot}</span>
                ) : (
                  <span className="value-dash">—</span>
                )}
              </div>

              <div className="pt-c" data-align="right" data-mono>
                {p.heightCm ? (
                  <>
                    {p.heightCm}
                    <span className="pt-unit">{t("table.heightUnit")}</span>
                  </>
                ) : (
                  <span className="value-dash">—</span>
                )}
              </div>

              <div className="pt-c value" data-align="right" data-mono>
                {p.marketValueEur != null ? (
                  <span className="value-num">{formatValue(p.marketValueEur)}</span>
                ) : (
                  <span className="value-dash">—</span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
