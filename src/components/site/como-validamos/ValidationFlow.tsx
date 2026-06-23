"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

import { Link } from "@/i18n/navigation";

import { StepIcon } from "./StepIcon";
import { AGENTS, CFG, RECAP, SOURCES, STEPS } from "./steps";
import { useScrollEngine } from "./useScrollEngine";
import ValidationFlowMobile from "./ValidationFlowMobile";
import "./validation.css";

// Per-node / per-caption accent is driven by an inline `--c` custom property;
// every state (.cv-active, .cv-done, .cv-is-active) reads var(--c).
const cvar = (color: string): CSSProperties => ({ ["--c" as string]: color } as CSSProperties);

// Rich-text chunk for highlighted title fragments (<hl>…</hl> → <span class="cv-hl">).
const hl = (chunks: ReactNode) => <span className="cv-hl">{chunks}</span>;

/**
 * ¿Cómo validamos? — the n8n-style validation workflow.
 *
 * Static DOM only: positions, the spine path, the execution light, branch
 * fan-outs and active-step state are all mutated imperatively by
 * useScrollEngine each animation frame (see that file for the why).
 */
export default function ValidationFlow() {
  const t = useTranslations("comoValidamos");
  const root = useRef<HTMLDivElement>(null);
  useScrollEngine(root, CFG);

  return (
    <>
      {/* Mobile: simple stacked timeline (no scrolljack, clears the dock). */}
      <ValidationFlowMobile />

      {/* Desktop: the full n8n-style scrolljack. */}
      <div ref={root} className="cv-root hidden md:block">
      <section className="cv-experience">
        <div className="cv-stage">
          {/* background field, pinned with the sticky stage */}
          <div className="cv-bg-field" aria-hidden>
            <div className="cv-bg-dots" />
            <div className="cv-orb cv-orb-1" />
            <div className="cv-orb cv-orb-2" />
            <div className="cv-orb cv-orb-3" />
          </div>

          {/* hero (fades out as the flow goes vertical) */}
          <div className="cv-hero-title">
            <div className="cv-eyebrow">{t("header.eyebrow")}</div>
            <h1>
              <span className="cv-q">¿</span>
              {t("header.titleLead")} <span className="cv-hl">{t("header.titleHl")}</span>
              <span className="cv-q">?</span>
            </h1>
            <p>{t("header.intro")}</p>
          </div>

          {/* flow edges */}
          <svg className="cv-flow-svg" preserveAspectRatio="none">
            <defs>
              <filter id="cvGlow" x="-150%" y="-150%" width="400%" height="400%">
                <feGaussianBlur stdDeviation="4" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g className="cv-branch-edges" />
            <path className="cv-spine-track" fill="none" />
            <path className="cv-spine-trail" fill="none" />
          </svg>

          {/* execution pulse (carries the active step's icon) */}
          <div className="cv-exec">
            <span className="cv-exec-core">
              <span className="cv-exec-ico" />
            </span>
            <span className="cv-exec-halo" />
            <span className="cv-exec-halo cv-h2" />
          </div>

          {/* nodes */}
          <div className="cv-nodes">
            {STEPS.map((st, i) => (
              <div key={st.id} className="cv-node" data-i={i} style={cvar(st.color)}>
                <span className="cv-port cv-port-in" />
                <span className="cv-port cv-port-out" />
                {st.branch ? <span className="cv-port cv-port-side" /> : null}
                <div className="cv-node-ico">
                  <StepIcon name={st.icon} />
                </div>
                <div className="cv-node-tx">
                  <div className="cv-nt">{t(`steps.${i}.title`)}</div>
                  <div className="cv-ns">{t(`steps.${i}.sub`)}</div>
                </div>
                <div className="cv-node-tag">{st.tag}</div>
              </div>
            ))}
          </div>

          {/* branch: sources (cross-checked platforms). Real AVIF logo when
              available, else the styled brand chip. */}
          <div className="cv-branch cv-branch-sources">
            {SOURCES.map((s) => {
              const Icon = s.Icon;
              return (
                <div key={s.abbr} className="cv-bnode" style={cvar("#00C2FF")}>
                  {Icon ? (
                    <span className="cv-blogo cv-blogo-img">
                      <Icon role="img" aria-label={s.name} />
                    </span>
                  ) : s.logo ? (
                    <span className="cv-blogo cv-blogo-img">
                      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static AVIF icon; next/image is overkill at 26px */}
                      <img src={s.logo} alt={s.name} width={26} height={26} loading="lazy" decoding="async" />
                    </span>
                  ) : (
                    <span className="cv-blogo" style={{ background: s.bg, color: s.fg }}>
                      {s.abbr}
                    </span>
                  )}
                  <span className="cv-bnm">{s.name}</span>
                  <span className="cv-bok" />
                </div>
              );
            })}
          </div>

          {/* branch: AI agents */}
          <div className="cv-branch cv-branch-agents">
            {AGENTS.map(({ name, conf, Icon }) => (
              <div key={name} className="cv-bnode cv-agent" style={cvar("#00C2FF")}>
                <span className="cv-bglyph">
                  <Icon />
                </span>
                <span className="cv-bnm">{name}</span>
                <span className="cv-bconf">{conf}</span>
              </div>
            ))}
          </div>

          {/* captions — only the active one is visible */}
          <div className="cv-caps">
            <div className="cv-cap" data-i={0} style={cvar("#CCFF00")}>
              <div className="cv-cap-eyebrow">
                <span className="cv-dot" />
                {t("stepLabel", { tag: "01" })}
              </div>
              <h3>{t.rich("captions.0.title", { hl })}</h3>
              <p>{t("captions.0.body")}</p>
              <div className="cv-cap-detail cv-mock-ui">
                <div className="cv-mock-ui-hd">
                  <span className="cv-mu-dot" />
                  {t("captions.0.mockHd")}
                </div>
                <div className="cv-mu-slot">{t("captions.0.mockSlot")}</div>
              </div>
            </div>

            <div className="cv-cap" data-i={1} style={cvar("#E9E9E9")}>
              <div className="cv-cap-eyebrow">
                <span className="cv-dot" />
                {t("stepLabel", { tag: "02" })}
              </div>
              <h3>{t.rich("captions.1.title", { hl })}</h3>
              <p>{t("captions.1.body")}</p>
              <div className="cv-cap-detail cv-mock-ui">
                <div className="cv-mock-ui-hd">
                  <span className="cv-mu-dot" />
                  {t("captions.1.mockHd")}
                </div>
                <div className="cv-mu-slot">{t("captions.1.mockSlot")}</div>
              </div>
            </div>

            <div className="cv-cap" data-i={2} style={cvar("#00C2FF")}>
              <div className="cv-cap-eyebrow">
                <span className="cv-dot" />
                {t("stepLabel", { tag: "03" })}
              </div>
              <h3>{t.rich("captions.2.title", { hl })}</h3>
              <p>{t("captions.2.body")}</p>
              <div className="cv-cap-detail cv-solid">
                <div className="cv-cd-stat">
                  <span className="cv-cd-num">{t("captions.2.statNum")}</span>
                  <span className="cv-cd-lab">{t("captions.2.statLabel")}</span>
                </div>
                <div className="cv-cd-bar">
                  <i style={{ ["--w" as string]: "100%" } as CSSProperties} />
                </div>
                <div className="cv-cd-note">{t("captions.2.note")}</div>
              </div>
            </div>

            <div className="cv-cap" data-i={3} style={cvar("#00C2FF")}>
              <div className="cv-cap-eyebrow">
                <span className="cv-dot" />
                {t("stepLabel", { tag: "04" })}
              </div>
              <h3>{t.rich("captions.3.title", { hl })}</h3>
              <p>{t("captions.3.body")}</p>
              <div className="cv-cap-detail cv-solid">
                <div className="cv-cd-stat">
                  <span className="cv-cd-num">{t("captions.3.statNum")}</span>
                  <span className="cv-cd-lab">{t("captions.3.statLabel")}</span>
                </div>
                <div className="cv-cd-bar">
                  <i style={{ ["--w" as string]: "98%" } as CSSProperties} />
                </div>
                <div className="cv-cd-note">{t("captions.3.note")}</div>
              </div>
            </div>

            <div className="cv-cap" data-i={4} style={cvar("#22C55E")}>
              <div className="cv-cap-eyebrow">
                <span className="cv-dot" />
                {t("stepLabel", { tag: "05" })}
              </div>
              <h3>{t.rich("captions.4.title", { hl })}</h3>
              <p>{t("captions.4.body")}</p>
              <div className="cv-cap-detail">
                <div className="cv-decide-toggle">
                  <button type="button" data-mode="approve" className="cv-on-approve">
                    {t("captions.4.approveBtn")}
                  </button>
                  <button type="button" data-mode="reject">
                    {t("captions.4.rejectBtn")}
                  </button>
                </div>
                <div className="cv-verdict cv-approve">
                  <div data-approve>
                    <span className="cv-v-stamp">{t("captions.4.approveStamp")}</span>
                    <span className="cv-v-sub">{t("captions.4.approveSub")}</span>
                  </div>
                  <div data-reject style={{ display: "none" }}>
                    <span className="cv-v-stamp cv-rej">{t("captions.4.rejectStamp")}</span>
                    <span className="cv-v-sub">{t("captions.4.rejectSub")}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="cv-cap" data-i={5} style={cvar("#CCFF00")}>
              <div className="cv-cap-eyebrow">
                <span className="cv-dot" />
                {t("stepLabel", { tag: "06" })}
              </div>
              <h3>{t.rich("captions.5.title", { hl })}</h3>
              <p>{t("captions.5.body")}</p>
              <div className="cv-cap-detail cv-solid">
                <div className="cv-cd-line">
                  <span className="cv-cd-av cv-lime">LM</span>
                  <span className="cv-cd-name">Lucas Martínez</span>
                  <span className="cv-cd-badge cv-green">{t("captions.5.badge")}</span>
                </div>
                <div className="cv-cd-note">{t("captions.5.note")}</div>
              </div>
            </div>
          </div>

          {/* progress rail (click to jump) */}
          <div className="cv-prog-rail">
            <div className="cv-pnum">06</div>
            {STEPS.map((st, i) => (
              <div key={st.id} className="cv-pdot" data-i={i} style={cvar(st.color)} />
            ))}
          </div>

          {/* scroll hint */}
          <div className="cv-scroll-hint">
            <div className="cv-mouse" />
            <div className="cv-t">{t("ui.scrollHint")}</div>
          </div>
        </div>
      </section>

      {/* outro */}
      <section className="cv-outro">
        <div className="cv-outro-inner">
          <div className="cv-outro-head">
            <div className="cv-eyebrow">{t("outro.eyebrow")}</div>
            <h2>
              {t("outro.titleLead")} <span className="cv-hl">{t("outro.titleHl")}</span>
            </h2>
          </div>
          <div className="cv-recap">
            {RECAP.map((r, i) => (
              <div key={r.tag} className="cv-recap-card" style={cvar(r.color)}>
                <div className="cv-rn">{r.tag}</div>
                <div className="cv-ri">
                  <StepIcon name={r.icon} />
                </div>
                <h4>{t(`outro.recap.${i}.title`)}</h4>
                <p>{t(`outro.recap.${i}.desc`)}</p>
              </div>
            ))}
          </div>
          <div className="cv-outro-cta">
            <h3>
              {t("cta.titleLead")}{" "}
              <span style={{ color: "var(--accent)" }}>{t("cta.titleHl")}</span>
            </h3>
            <p>{t("cta.body")}</p>
            <div className="cv-row">
              <Link href="/auth/sign-up" className="cv-btn cv-btn-lime">
                {t("cta.primary")}
              </Link>
              <Link href="/players" className="cv-btn cv-btn-ghost">
                {t("cta.secondary")}
              </Link>
            </div>
          </div>
        </div>
      </section>
      </div>
    </>
  );
}
