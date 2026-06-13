"use client";

import { useRef } from "react";
import type { CSSProperties } from "react";

import { Link } from "@/i18n/navigation";

import { StepIcon } from "./StepIcon";
import { AGENTS, CFG, RECAP, SOURCES, STEPS } from "./steps";
import { useScrollEngine } from "./useScrollEngine";
import ValidationFlowMobile from "./ValidationFlowMobile";
import "./validation.css";

// Per-node / per-caption accent is driven by an inline `--c` custom property;
// every state (.cv-active, .cv-done, .cv-is-active) reads var(--c).
const cvar = (color: string): CSSProperties => ({ ["--c" as string]: color } as CSSProperties);

/**
 * ¿Cómo validamos? — the n8n-style validation workflow.
 *
 * Static DOM only: positions, the spine path, the execution light, branch
 * fan-outs and active-step state are all mutated imperatively by
 * useScrollEngine each animation frame (see that file for the why).
 */
export default function ValidationFlow() {
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
            <div className="cv-eyebrow">Confianza verificada · &apos;BallersHub</div>
            <h1>
              <span className="cv-q">¿</span>Cómo <span className="cv-hl">validamos</span>
              <span className="cv-q">?</span>
            </h1>
            <p>
              Cada cambio crítico en un perfil corre por un flujo de validación: revisión humana,
              contraste contra +10 fuentes deportivas y verificación con inteligencia artificial.
              Mirá el proceso paso a paso.
            </p>
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
                  <div className="cv-nt">{st.title}</div>
                  <div className="cv-ns">{st.sub}</div>
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
                <span className="cv-dot" />Paso 01 / 06
              </div>
              <h3>
                El jugador envía una <span className="cv-hl">solicitud</span>
              </h3>
              <p>
                Desde su panel, el jugador o su agente solicita un cambio en la trayectoria, las
                estadísticas o el multimedia. Nada se publica solo: todo entra a revisión.
              </p>
              <div className="cv-cap-detail cv-mock-ui">
                <div className="cv-mock-ui-hd">
                  <span className="cv-mu-dot" />Agregar etapa de trayectoria · componente real
                </div>
                <div className="cv-mu-slot">
                  Próximamente: grabación del flujo real “agregar etapa + enviar solicitud”.
                </div>
              </div>
            </div>

            <div className="cv-cap" data-i={1} style={cvar("#E9E9E9")}>
              <div className="cv-cap-eyebrow">
                <span className="cv-dot" />Paso 02 / 06
              </div>
              <h3>
                Llega al <span className="cv-hl">Panel de Administración</span>
              </h3>
              <p>
                La solicitud entra a la cola de revisión del equipo de &apos;BallersHub. Un
                administrador la toma y abre el expediente del jugador para empezar a verificar.
              </p>
              <div className="cv-cap-detail cv-mock-ui">
                <div className="cv-mock-ui-hd">
                  <span className="cv-mu-dot" />Panel de revisión · Admin
                </div>
                <div className="cv-mu-slot">
                  Próximamente: grabación del panel de revisión del equipo.
                </div>
              </div>
            </div>

            <div className="cv-cap" data-i={2} style={cvar("#00C2FF")}>
              <div className="cv-cap-eyebrow">
                <span className="cv-dot" />Paso 03 / 06
              </div>
              <h3>
                Contraste en <span className="cv-hl">+10 fuentes</span>
              </h3>
              <p>
                El flujo se abre y consulta las principales plataformas deportivas del mundo en
                paralelo. Solo avanza lo que coincide en múltiples fuentes reconocidas.
              </p>
              <div className="cv-cap-detail cv-solid">
                <div className="cv-cd-stat">
                  <span className="cv-cd-num">10/10</span>
                  <span className="cv-cd-lab">fuentes coinciden</span>
                </div>
                <div className="cv-cd-bar">
                  <i style={{ ["--w" as string]: "100%" } as CSSProperties} />
                </div>
                <div className="cv-cd-note">Transfermarkt · BeSoccer · Flashscore · Sofascore · +4</div>
              </div>
            </div>

            <div className="cv-cap" data-i={3} style={cvar("#00C2FF")}>
              <div className="cv-cap-eyebrow">
                <span className="cv-dot" />Paso 04 / 06
              </div>
              <h3>
                Validación con <span className="cv-hl">agentes de IA</span>
              </h3>
              <p>
                El flujo deriva a tres modelos de IA que cruzan los datos de forma independiente,
                detectan inconsistencias y devuelven un nivel de confianza. El consenso refuerza la
                decisión.
              </p>
              <div className="cv-cap-detail cv-solid">
                <div className="cv-cd-stat">
                  <span className="cv-cd-num">98%</span>
                  <span className="cv-cd-lab">consenso de validación</span>
                </div>
                <div className="cv-cd-bar">
                  <i style={{ ["--w" as string]: "98%" } as CSSProperties} />
                </div>
                <div className="cv-cd-note">Gemini 97% · Claude 98% · ChatGPT 96%</div>
              </div>
            </div>

            <div className="cv-cap" data-i={4} style={cvar("#22C55E")}>
              <div className="cv-cap-eyebrow">
                <span className="cv-dot" />Paso 05 / 06
              </div>
              <h3>
                El equipo <span className="cv-hl">aprueba o rechaza</span>
              </h3>
              <p>
                Con el contraste de fuentes y el consenso de IA, el administrador toma la decisión
                final. Si todo coincide, se aprueba. Si no, vuelve con una devolución detallada.
              </p>
              <div className="cv-cap-detail">
                <div className="cv-decide-toggle">
                  <button type="button" data-mode="approve" className="cv-on-approve">
                    Aprobar
                  </button>
                  <button type="button" data-mode="reject">
                    Rechazar
                  </button>
                </div>
                <div className="cv-verdict cv-approve">
                  <div data-approve>
                    <span className="cv-v-stamp">✓ Aprobada</span>
                    <span className="cv-v-sub">Los datos coinciden con fuentes e IA.</span>
                  </div>
                  <div data-reject style={{ display: "none" }}>
                    <span className="cv-v-stamp cv-rej">✕ Rechazada</span>
                    <span className="cv-v-sub">Vuelve con devolución detallada para corregir.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="cv-cap" data-i={5} style={cvar("#CCFF00")}>
              <div className="cv-cap-eyebrow">
                <span className="cv-dot" />Paso 06 / 06
              </div>
              <h3>
                El cambio se <span className="cv-hl">publica</span>
              </h3>
              <p>
                El dato verificado se publica en el perfil público del jugador, listo para
                compartirse con clubes y reclutadores. Trazable y con respaldo real.
              </p>
              <div className="cv-cap-detail cv-solid">
                <div className="cv-cd-line">
                  <span className="cv-cd-av cv-lime">LM</span>
                  <span className="cv-cd-name">Lucas Martínez</span>
                  <span className="cv-cd-badge cv-green">Publicado</span>
                </div>
                <div className="cv-cd-note">https://ballershub.co/tu-nombre</div>
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
            <div className="cv-t">Scroll para ejecutar el flujo</div>
          </div>
        </div>
      </section>

      {/* outro */}
      <section className="cv-outro">
        <div className="cv-outro-inner">
          <div className="cv-outro-head">
            <div className="cv-eyebrow">El flujo completo</div>
            <h2>
              Seis pasos. <span className="cv-hl">Cero datos sin verificar.</span>
            </h2>
          </div>
          <div className="cv-recap">
            {RECAP.map((r) => (
              <div key={r.tag} className="cv-recap-card" style={cvar(r.color)}>
                <div className="cv-rn">{r.tag}</div>
                <div className="cv-ri">
                  <StepIcon name={r.icon} />
                </div>
                <h4>{r.title}</h4>
                <p>{r.desc}</p>
              </div>
            ))}
          </div>
          <div className="cv-outro-cta">
            <h3>
              Tu carrera. Tu data. <span style={{ color: "var(--accent)" }}>Verificada.</span>
            </h3>
            <p>Creá tu perfil profesional y dejá que cada dato hable con respaldo real.</p>
            <div className="cv-row">
              <Link href="/auth/sign-up" className="cv-btn cv-btn-lime">
                Crear mi perfil →
              </Link>
              <Link href="/players" className="cv-btn cv-btn-ghost">
                Ver jugadores
              </Link>
            </div>
          </div>
        </div>
      </section>
      </div>
    </>
  );
}
