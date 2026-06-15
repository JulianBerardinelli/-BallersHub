"use client";

// BallersHub — DashJourney floating cards: brand-colour picker, "agregar etapa
// de trayectoria", and "estadísticas por temporada". They respond to hover/
// focus/click visually (no persistence — by design). Ported to TSX.

import * as React from "react";
import { useTranslations } from "next-intl";

import { ClubCrest } from "../HeroJourney/tags";
import { FONT_BODY, FONT_DISPLAY, FONT_MONO } from "../HeroJourney/useHeroScroll";

const BARLOW = FONT_DISPLAY;
const DM = FONT_BODY;
const MONO = FONT_MONO;
type CSS = React.CSSProperties;

/* ── tiny shared primitives ── */
const Field = ({ label, children, w }: { label: string; children: React.ReactNode; w?: number }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0, ...(w ? { width: w } : { flex: 1 }) }}>
    <span style={{ fontFamily: DM, fontSize: 10, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "rgba(255,255,255,0.42)" }}>{label}</span>
    {children}
  </label>
);

const TextInput = ({ value, placeholder, accent = "#CCFF00", mono, align }: { value?: string; placeholder?: string; accent?: string; mono?: boolean; align?: "center" }) => {
  const [f, sf] = React.useState(false);
  return (
    <div tabIndex={0} onFocus={() => sf(true)} onBlur={() => sf(false)}
      style={{ height: 40, display: "flex", alignItems: "center", padding: "0 13px", borderRadius: 10, cursor: "text", background: "rgba(255,255,255,0.025)", border: `1px solid ${f ? accent : "rgba(255,255,255,0.1)"}`, boxShadow: f ? `0 0 0 3px ${accent}22` : "none", transition: "border-color .18s, box-shadow .18s", fontFamily: mono ? MONO : DM, fontSize: 14, color: value ? "#fff" : "rgba(255,255,255,0.32)", justifyContent: align === "center" ? "center" : "flex-start" }}>
      {value || placeholder}
    </div>
  );
};

const Select = ({ value, accent = "#CCFF00", crest, children }: { value?: string; accent?: string; crest?: React.ReactNode; children?: React.ReactNode }) => {
  const [f, sf] = React.useState(false);
  return (
    <div tabIndex={0} onFocus={() => sf(true)} onBlur={() => sf(false)}
      style={{ height: 44, display: "flex", alignItems: "center", gap: 9, padding: "0 13px", borderRadius: 11, cursor: "pointer", background: "rgba(255,255,255,0.025)", border: `1px solid ${f ? accent : "rgba(255,255,255,0.1)"}`, boxShadow: f ? `0 0 0 3px ${accent}22` : "none", transition: "border-color .18s, box-shadow .18s" }}>
      {crest}
      <span style={{ flex: 1, fontFamily: DM, fontSize: 15, color: value ? "#fff" : "rgba(255,255,255,0.34)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{children || value}</span>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.2"><path d="M6 9l6 6 6-6" /></svg>
    </div>
  );
};

const Toggle = ({ on: onProp = false, accent = "#CCFF00", label }: { on?: boolean; accent?: string; label: string }) => {
  const [on, setOn] = React.useState(onProp);
  return (
    <button type="button" onClick={() => setOn((v) => !v)} style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
      <span style={{ width: 46, height: 26, borderRadius: 999, padding: 3, background: on ? accent : "rgba(255,255,255,0.12)", boxShadow: on ? `0 0 16px -4px ${accent}` : "none", transition: "background .2s", display: "flex" }}>
        <span style={{ width: 20, height: 20, borderRadius: "50%", background: on ? "#080808" : "#fff", transform: `translateX(${on ? 20 : 0}px)`, transition: "transform .22s cubic-bezier(0.34,1.56,0.64,1)" }} />
      </span>
      <span style={{ fontFamily: DM, fontSize: 14.5, color: "rgba(255,255,255,0.82)", whiteSpace: "nowrap" }}>{label}</span>
    </button>
  );
};

const GhostBtn = ({ children, accent = "#CCFF00", fill, danger, onClick }: { children: React.ReactNode; accent?: string; fill?: boolean; danger?: boolean; onClick?: () => void }) => {
  const [h, sh] = React.useState(false);
  let style: CSS;
  if (fill) style = { background: accent, color: "#080808", boxShadow: h ? `0 8px 26px -6px ${accent}` : `0 2px 14px -6px ${accent}`, transform: h ? "translateY(-1px)" : "none" };
  else if (danger) style = { background: "none", color: h ? "#FB6060" : "rgba(255,255,255,0.38)" };
  else style = { background: h ? "rgba(255,255,255,0.06)" : "none", color: "#fff" };
  return (
    <button type="button" onClick={onClick} onMouseEnter={() => sh(true)} onMouseLeave={() => sh(false)}
      style={{ fontFamily: DM, fontWeight: 600, fontSize: 14.5, padding: fill ? "11px 20px" : "11px 16px", borderRadius: 10, border: "none", cursor: "pointer", transition: "all .18s", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 8, ...style }}>
      {children}
    </button>
  );
};

/* ── 1 · brand colours ── */
type BrandPresetKey = "mono" | "cyberpunk" | "electricBlue" | "imperialGold";
const BRAND_PRESETS: ReadonlyArray<{
  key: BrandPresetKey;
  grad: string;
  colors: { bg: string; primary: string; secondary: string; accent: string };
}> = [
  { key: "mono", grad: "linear-gradient(150deg,#2c2c2c,#070707)", colors: { bg: "#0A0A0B", primary: "#FFFFFF", secondary: "#3A3A3E", accent: "#EDEDED" } },
  { key: "cyberpunk", grad: "linear-gradient(150deg,#E5277F,#7B2FF7)", colors: { bg: "#0D0212", primary: "#FF2D9B", secondary: "#7B2FF7", accent: "#FF6AD5" } },
  { key: "electricBlue", grad: "linear-gradient(150deg,#3F7BF6,#15307A)", colors: { bg: "#050A14", primary: "#2A6FDB", secondary: "#15307A", accent: "#4D9DFF" } },
  { key: "imperialGold", grad: "linear-gradient(150deg,#F59E0B,#7C2D12)", colors: { bg: "#0D0502", primary: "#FA8A00", secondary: "#7C2D12", accent: "#FFB347" } },
];

export const BrandColorsCard = ({ accent = "#CCFF00", onPick, style }: { accent?: string; onPick?: (hex: string) => void; style?: CSS }) => {
  const t = useTranslations("home.dashJourney.cards.brand");
  const [sel, setSel] = React.useState(2);
  const c = BRAND_PRESETS[sel].colors;
  const HexRow = ({ label, hex }: { label: string; hex: string }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 0 }}>
      <span style={{ fontFamily: DM, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", lineHeight: 1.3 }}>{label}</span>
      <div style={{ height: 50, display: "flex", alignItems: "center", gap: 11, padding: 8, borderRadius: 12, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <span style={{ width: 34, height: 34, borderRadius: 8, background: hex, border: "1px solid rgba(255,255,255,0.15)", flexShrink: 0, boxShadow: `0 0 14px -4px ${hex}` }} />
        <span style={{ fontFamily: MONO, fontSize: 15, letterSpacing: "0.02em", color: "#fff" }}>{hex.toUpperCase()}</span>
      </div>
    </div>
  );
  return (
    <div className="dj-card" style={{ width: 430, padding: 22, ...style }}>
      <div style={{ fontFamily: BARLOW, fontWeight: 800, fontSize: 23, letterSpacing: "0.01em", textTransform: "uppercase", color: "#fff" }}>{t("title")}</div>
      <p style={{ fontFamily: DM, fontSize: 13, color: "rgba(255,255,255,0.46)", margin: "5px 0 18px", lineHeight: 1.45 }}>{t("subtitle")}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
        {BRAND_PRESETS.map((p, i) => (
          <button key={p.key} type="button" onClick={() => { setSel(i); onPick?.(p.colors.accent); }}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
            <span style={{ width: "100%", aspectRatio: "1/1", borderRadius: 13, background: p.grad, border: `2px solid ${i === sel ? accent : "rgba(255,255,255,0.1)"}`, boxShadow: i === sel ? `0 0 0 3px ${accent}33, 0 10px 24px -10px ${p.colors.primary}` : "0 6px 16px -10px #000", transition: "border-color .18s, box-shadow .18s" }} />
            <span style={{ fontFamily: DM, fontSize: 12.5, fontWeight: 600, color: i === sel ? "#fff" : "rgba(255,255,255,0.6)" }}>{t(`presets.${p.key}`)}</span>
            <span style={{ fontFamily: DM, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.18em", color: i === sel ? accent : "rgba(255,255,255,0.28)" }}>{t("presetLabel")}</span>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
        <HexRow label={t("swatches.background")} hex={c.bg} />
        <HexRow label={t("swatches.primary")} hex={c.primary} />
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <HexRow label={t("swatches.secondary")} hex={c.secondary} />
        <HexRow label={t("swatches.accent")} hex={c.accent} />
      </div>
    </div>
  );
};

/* ── 2 · agregar etapa de trayectoria ── */
export const TrayectoriaCard = ({ accent = "#CCFF00", style }: { accent?: string; style?: CSS }) => {
  const t = useTranslations("home.dashJourney.cards.career");
  return (
    <div className="dj-card" style={{ width: 560, padding: 22, ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 14 }}>
        <ClubCrest club="CA Temperley" size={36} accent={accent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: 19, color: "#fff", textTransform: "uppercase", letterSpacing: "0.01em" }}>CA Temperley U20 <span style={{ fontSize: 14 }}>🇦🇷</span></div>
          <div style={{ fontFamily: DM, fontSize: 12.5, color: "rgba(255,255,255,0.4)" }}>{t("ageGroupLabel")}</div>
        </div>
      </div>
      <div style={{ padding: 18, borderRadius: 16, border: `1px solid ${accent}38`, background: `${accent}07`, boxShadow: `inset 0 0 40px -24px ${accent}` }}>
        <div style={{ display: "flex", gap: 13, marginBottom: 16 }}>
          <Field label={t("fields.club")}><Select accent={accent} value="CA Independiente" crest={<span style={{ width: 22, height: 22, borderRadius: 5, background: "linear-gradient(#E11,#7a0a0a)", flexShrink: 0, border: "1px solid rgba(255,255,255,0.2)" }} />} /></Field>
          <Field label={t("fields.division")} w={132}><Select accent={accent} value={t("selects.division")} /></Field>
          <Field label={t("fields.from")} w={96}><Select accent={accent} value="2018" /></Field>
          <Field label={t("fields.to")} w={96}><Select accent={accent} value="2019" /></Field>
        </div>
        <div style={{ display: "flex", gap: 26, justifyContent: "flex-end", marginBottom: 18 }}>
          <Toggle accent={accent} label={t("toggles.current")} />
          <Toggle accent={accent} label={t("toggles.otherCategory")} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: BARLOW, fontWeight: 700, fontSize: 13, letterSpacing: "0.05em", textTransform: "uppercase", color: "#22C55E", border: "1px solid rgba(34,197,94,0.4)", background: "rgba(34,197,94,0.08)", borderRadius: 9, padding: "8px 14px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.4"><path d="M20 6L9 17l-5-5" /></svg>{t("verifiedTeam")}
          </span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <GhostBtn>{t("actions.cancel")}</GhostBtn>
            <GhostBtn fill accent={accent}>{t("actions.confirm")}</GhostBtn>
            <GhostBtn danger>{t("actions.remove")}</GhostBtn>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <GhostBtn fill accent={accent}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M12 5v14M5 12h14" /></svg>{t("actions.addStage")}
        </GhostBtn>
      </div>
    </div>
  );
};

/* ── 3 · estadísticas por temporada ── */
const STAT_ROWS = [
  { crest: "FC Vaajakoski", season: "2025 – 2026", sub: "FC Vaajakoski · Kakkonen", pj: 25, g: 4, a: 6 },
  { crest: "FC Weesen", season: "2024 – 2025", sub: "FC Weesen · 2. Liga Interregional", pj: 15, g: 1, a: 4 },
  { crest: "Jonica FC", season: "2023 – 2024", sub: "Jonica FC · Eccellenza", pj: 4, g: 2, a: 3 },
];

export const StatsCard = ({ accent = "#CCFF00", secondary = "#00C2FF", style }: { accent?: string; secondary?: string; style?: CSS }) => {
  const t = useTranslations("home.dashJourney.cards.stats");
  const headerLabels = [t("headers.season"), t("headers.competition"), t("headers.matches"), t("headers.goals"), t("headers.assists")];
  return (
    <div className="dj-card" style={{ width: 560, padding: 24, ...style }}>
      <div style={{ fontFamily: BARLOW, fontWeight: 800, fontSize: 23, letterSpacing: "0.01em", textTransform: "uppercase", color: "#fff" }}>{t("title")}</div>
      <p style={{ fontFamily: DM, fontSize: 12.5, color: "rgba(255,255,255,0.44)", margin: "5px 0 16px", lineHeight: 1.45 }}>{t("subtitle")}</p>
      <div style={{ display: "grid", gridTemplateColumns: "2.4fr 1fr 0.6fr 0.6fr 0.6fr", gap: 8, padding: "0 6px 9px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {headerLabels.map((h, idx) => (
          <span key={h} style={{ fontFamily: DM, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.34)", textAlign: idx < 2 ? "left" : "center" }}>{h}</span>
        ))}
      </div>
      {STAT_ROWS.map((r, i) => (
        <div key={i} className="dj-statrow" style={{ display: "grid", gridTemplateColumns: "2.4fr 1fr 0.6fr 0.6fr 0.6fr", gap: 8, alignItems: "center", padding: "11px 6px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
            <ClubCrest club={r.crest} size={28} accent={accent} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: 16, color: "#fff", lineHeight: 1.1 }}>{r.season}</div>
              <div style={{ fontFamily: DM, fontSize: 10.5, color: "rgba(255,255,255,0.34)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.sub}</div>
            </div>
          </div>
          <span style={{ fontFamily: DM, fontSize: 13, color: "rgba(255,255,255,0.66)" }}>{t("competitionLabel")}</span>
          <span style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: 17, color: "#fff", textAlign: "center" }}>{r.pj}</span>
          <span style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: 17, color: accent, textAlign: "center" }}>{r.g}</span>
          <span style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: 17, color: "#fff", textAlign: "center" }}>{r.a}</span>
        </div>
      ))}
      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 13 }}>
        <div style={{ display: "flex", gap: 13 }}>
          <Field label={t("fields.careerStage")}><Select accent={secondary} value={t("selects.careerStage")} /></Field>
          <Field label={t("fields.season")} w={150}><TextInput accent={secondary} placeholder={t("placeholders.season")} /></Field>
        </div>
        <div style={{ display: "flex", gap: 13 }}>
          <Field label={t("fields.team")}><TextInput accent={secondary} placeholder={t("placeholders.team")} /></Field>
          <Field label={t("fields.matches")} w={70}><TextInput accent={secondary} value="18" align="center" /></Field>
          <Field label={t("fields.starts")} w={70}><TextInput accent={secondary} value="16" align="center" /></Field>
          <Field label={t("fields.goals")} w={70}><TextInput accent={secondary} value="5" align="center" /></Field>
          <Field label={t("fields.assists")} w={70}><TextInput accent={secondary} value="3" align="center" /></Field>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 2 }}>
          <button type="button" style={{ fontFamily: DM, fontWeight: 600, fontSize: 14.5, padding: "11px 22px", borderRadius: 10, border: `1px solid ${secondary}66`, background: `${secondary}12`, color: secondary, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M12 5v14M5 12h14" /></svg>{t("addSeason")}
          </button>
        </div>
      </div>
    </div>
  );
};
