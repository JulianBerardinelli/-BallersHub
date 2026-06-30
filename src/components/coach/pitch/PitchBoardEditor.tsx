"use client";

// PitchBoardEditor — editor interactivo de la pizarra táctica (Ideas de Juego).
// Sin librería de drag&drop: usa Pointer Events nativos + setPointerCapture
// (mismo enfoque que AvatarCropperModal). Dos modos:
//   • "move"  → arrastrar fichas. Click en una ficha la selecciona (editar
//               dorsal / borrar).
//   • "arrow" → dibujar flechas: pointer-down en la cancha fija el origen,
//               arrastrar y soltar crea la flecha del tipo elegido.
// Estado controlado por el padre (value + onChange) → el form de game-ideas
// serializa `value` directo al jsonb pitch_board.

import * as React from "react";
import {
  EMPTY_PITCH_BOARD,
  MAX_TOKENS,
  MAX_ARROWS,
  tokensFromFormation,
  type PitchArrow,
  type PitchBoard,
  type PitchToken,
} from "@/lib/coach/game-ideas";
import {
  PitchMarkings,
  PitchArrowsSvg,
  TEAM_COLORS,
  PITCH_BG,
} from "./PitchBoard";

type Mode = "move" | "arrow";
type ArrowKind = PitchArrow["kind"];
type AddKind = "own" | "opponent" | "ball" | "cone";

const TOKEN_SIZE = 30;

const uid = () => Math.random().toString(36).slice(2, 10);

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export default function PitchBoardEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: PitchBoard;
  onChange: (board: PitchBoard) => void;
  disabled?: boolean;
}) {
  const board = value ?? EMPTY_PITCH_BOARD;
  const pitchRef = React.useRef<HTMLDivElement>(null);
  const [mode, setMode] = React.useState<Mode>("move");
  const [arrowKind, setArrowKind] = React.useState<ArrowKind>("pass");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  // Flecha en progreso (modo arrow): origen + cursor actual, en %.
  const [draft, setDraft] = React.useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const dragRef = React.useRef<string | null>(null);

  function pctFromEvent(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100),
    };
  }

  function setTokens(tokens: PitchToken[]) {
    onChange({ ...board, tokens });
  }
  function setArrows(arrows: PitchArrow[]) {
    onChange({ ...board, arrows });
  }

  function addToken(kind: AddKind) {
    if (board.tokens.length >= MAX_TOKENS) return;
    const isPlayer = kind === "own" || kind === "opponent";
    const token: PitchToken = {
      id: uid(),
      x: 50,
      y: kind === "ball" ? 50 : kind === "cone" ? 40 : 60,
      team: kind === "opponent" ? "opponent" : "own",
      kind: isPlayer ? "player" : kind,
      label: null,
    };
    setTokens([...board.tokens, token]);
    setSelectedId(token.id);
  }

  function applyFormation(formation: string) {
    const fromFormation = tokensFromFormation(formation);
    if (fromFormation.length === 0) return;
    // Reemplaza sólo las fichas propias tipo player; conserva rival/balón/conos.
    const keep = board.tokens.filter((t) => !(t.team === "own" && t.kind === "player"));
    setTokens([...fromFormation, ...keep].slice(0, MAX_TOKENS));
    setSelectedId(null);
  }

  // ── Drag de fichas (modo move) ──────────────────────────────────────────
  function onTokenPointerDown(e: React.PointerEvent, id: string) {
    if (disabled) return;
    if (mode === "arrow") return; // en modo flecha, el down lo maneja la cancha
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = id;
    setSelectedId(id);
  }
  function onTokenPointerMove(e: React.PointerEvent, id: string) {
    if (dragRef.current !== id) return;
    const { x, y } = pctFromEvent(e);
    setTokens(board.tokens.map((t) => (t.id === id ? { ...t, x, y } : t)));
  }
  function onTokenPointerUp(e: React.PointerEvent) {
    if (dragRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      dragRef.current = null;
    }
  }

  // ── Dibujo de flechas (modo arrow) ──────────────────────────────────────
  function onPitchPointerDown(e: React.PointerEvent) {
    if (disabled || mode !== "arrow") return;
    if (board.arrows.length >= MAX_ARROWS) return;
    pitchRef.current?.setPointerCapture(e.pointerId);
    const { x, y } = pctFromEvent(e);
    setDraft({ x1: x, y1: y, x2: x, y2: y });
  }
  function onPitchPointerMove(e: React.PointerEvent) {
    if (!draft) return;
    const { x, y } = pctFromEvent(e);
    setDraft({ ...draft, x2: x, y2: y });
  }
  function onPitchPointerUp(e: React.PointerEvent) {
    if (!draft) return;
    try {
      pitchRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    const dist = Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1);
    if (dist >= 4) {
      const arrow: PitchArrow = {
        id: uid(),
        fromX: draft.x1,
        fromY: draft.y1,
        toX: draft.x2,
        toY: draft.y2,
        kind: arrowKind,
      };
      setArrows([...board.arrows, arrow]);
    }
    setDraft(null);
  }

  function removeSelected() {
    if (!selectedId) return;
    setTokens(board.tokens.filter((t) => t.id !== selectedId));
    setSelectedId(null);
  }
  function setSelectedLabel(label: string) {
    if (!selectedId) return;
    const v = label.trim().slice(0, 4) || null;
    setTokens(board.tokens.map((t) => (t.id === selectedId ? { ...t, label: v } : t)));
  }
  function removeLastArrow() {
    if (board.arrows.length === 0) return;
    setArrows(board.arrows.slice(0, -1));
  }
  function clearBoard() {
    onChange({ tokens: [], arrows: [] });
    setSelectedId(null);
    setDraft(null);
  }

  const selected = board.tokens.find((t) => t.id === selectedId) ?? null;
  const draftArrows: PitchArrow[] = draft
    ? [{ id: "draft", fromX: draft.x1, fromY: draft.y1, toX: draft.x2, toY: draft.y2, kind: arrowKind }]
    : [];

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-bh-md border border-white/[0.08] bg-bh-surface-2/40 p-2.5">
        <div className="flex items-center gap-1.5">
          <ModeBtn active={mode === "move"} onClick={() => setMode("move")} disabled={disabled}>
            Mover
          </ModeBtn>
          <ModeBtn active={mode === "arrow"} onClick={() => setMode("arrow")} disabled={disabled}>
            Flecha
          </ModeBtn>
        </div>

        <span className="h-5 w-px bg-white/[0.1]" />

        {mode === "arrow" ? (
          <div className="flex items-center gap-1.5">
            <ChipBtn active={arrowKind === "pass"} onClick={() => setArrowKind("pass")} disabled={disabled}>
              Pase
            </ChipBtn>
            <ChipBtn active={arrowKind === "run"} onClick={() => setArrowKind("run")} disabled={disabled}>
              Desmarque
            </ChipBtn>
            <ChipBtn active={arrowKind === "dribble"} onClick={() => setArrowKind("dribble")} disabled={disabled}>
              Conducción
            </ChipBtn>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <ChipBtn onClick={() => addToken("own")} disabled={disabled || board.tokens.length >= MAX_TOKENS}>
              + Propio
            </ChipBtn>
            <ChipBtn onClick={() => addToken("opponent")} disabled={disabled || board.tokens.length >= MAX_TOKENS}>
              + Rival
            </ChipBtn>
            <ChipBtn onClick={() => addToken("ball")} disabled={disabled || board.tokens.length >= MAX_TOKENS}>
              + Balón
            </ChipBtn>
            <ChipBtn onClick={() => addToken("cone")} disabled={disabled || board.tokens.length >= MAX_TOKENS}>
              + Cono
            </ChipBtn>
          </div>
        )}
      </div>

      {/* Formaciones rápidas */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-bh-fg-4">Colocar XI:</span>
        {["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "5-3-2"].map((f) => (
          <button
            key={f}
            type="button"
            disabled={disabled}
            onClick={() => applyFormation(f)}
            className="rounded-bh-pill border border-white/[0.1] px-2.5 py-1 font-bh-mono text-[11px] text-bh-fg-2 transition-colors hover:border-bh-lime/40 hover:text-bh-lime disabled:opacity-40"
          >
            {f}
          </button>
        ))}
      </div>

      {/* Cancha */}
      <div className="mx-auto w-full max-w-[340px]">
        <div
          ref={pitchRef}
          onPointerDown={onPitchPointerDown}
          onPointerMove={onPitchPointerMove}
          onPointerUp={onPitchPointerUp}
          className="relative w-full select-none overflow-hidden rounded-xl"
          style={{
            aspectRatio: "2 / 3",
            background: PITCH_BG,
            border: "1px solid rgba(255,255,255,0.14)",
            cursor: mode === "arrow" ? "crosshair" : "default",
            touchAction: "none",
          }}
        >
          <PitchMarkings />
          <PitchArrowsSvg arrows={[...board.arrows, ...draftArrows]} />

          {/* Fichas interactivas */}
          {board.tokens.map((t) => {
            const isSel = t.id === selectedId;
            if (t.kind === "ball") {
              return (
                <button
                  key={t.id}
                  type="button"
                  onPointerDown={(e) => onTokenPointerDown(e, t.id)}
                  onPointerMove={(e) => onTokenPointerMove(e, t.id)}
                  onPointerUp={onTokenPointerUp}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/40 bg-white shadow"
                  style={{
                    left: `${t.x}%`,
                    top: `${t.y}%`,
                    width: TOKEN_SIZE * 0.62,
                    height: TOKEN_SIZE * 0.62,
                    outline: isSel ? "2px solid #fff" : "none",
                    cursor: mode === "move" ? "grab" : "inherit",
                    touchAction: "none",
                  }}
                  aria-label="Balón"
                />
              );
            }
            if (t.kind === "cone") {
              return (
                <button
                  key={t.id}
                  type="button"
                  onPointerDown={(e) => onTokenPointerDown(e, t.id)}
                  onPointerMove={(e) => onTokenPointerMove(e, t.id)}
                  onPointerUp={onTokenPointerUp}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${t.x}%`,
                    top: `${t.y}%`,
                    width: TOKEN_SIZE * 0.6,
                    height: TOKEN_SIZE * 0.6,
                    cursor: mode === "move" ? "grab" : "inherit",
                    touchAction: "none",
                  }}
                  aria-label="Cono"
                >
                  <span
                    className="block"
                    style={{
                      margin: "0 auto",
                      borderLeft: `${TOKEN_SIZE * 0.28}px solid transparent`,
                      borderRight: `${TOKEN_SIZE * 0.28}px solid transparent`,
                      borderBottom: `${TOKEN_SIZE * 0.55}px solid #f97316`,
                      width: 0,
                      height: 0,
                      outline: isSel ? "2px solid #fff" : "none",
                    }}
                  />
                </button>
              );
            }
            const c = TEAM_COLORS[t.team];
            return (
              <button
                key={t.id}
                type="button"
                onPointerDown={(e) => onTokenPointerDown(e, t.id)}
                onPointerMove={(e) => onTokenPointerMove(e, t.id)}
                onPointerUp={onTokenPointerUp}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-bh-display font-black shadow-[0_2px_8px_rgba(0,0,0,0.5)] ring-1 ring-black/30"
                style={{
                  left: `${t.x}%`,
                  top: `${t.y}%`,
                  width: TOKEN_SIZE,
                  height: TOKEN_SIZE,
                  backgroundColor: c.fill,
                  color: c.text,
                  fontSize: TOKEN_SIZE * 0.42,
                  outline: isSel ? "2px solid #fff" : "none",
                  outlineOffset: "1px",
                  cursor: mode === "move" ? "grab" : "inherit",
                  touchAction: "none",
                }}
                aria-label={`Ficha ${t.team === "own" ? "propia" : "rival"}${t.label ? ` ${t.label}` : ""}`}
              >
                {t.label ?? ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Panel de selección / acciones */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-bh-md border border-white/[0.08] bg-bh-surface-2/40 p-2.5">
        {selected && selected.kind === "player" ? (
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-bh-fg-3">Dorsal/rol</label>
            <input
              value={selected.label ?? ""}
              onChange={(e) => setSelectedLabel(e.target.value)}
              maxLength={4}
              disabled={disabled}
              placeholder="9"
              className="w-16 rounded-bh-sm border border-white/[0.1] bg-bh-black px-2 py-1 text-center text-sm text-bh-fg-1 outline-none focus:border-bh-lime/40"
            />
            <button
              type="button"
              onClick={removeSelected}
              disabled={disabled}
              className="rounded-bh-sm border border-red-900/60 px-2.5 py-1 text-[12px] text-bh-danger transition-colors hover:border-red-700"
            >
              Quitar ficha
            </button>
          </div>
        ) : selected ? (
          <button
            type="button"
            onClick={removeSelected}
            disabled={disabled}
            className="rounded-bh-sm border border-red-900/60 px-2.5 py-1 text-[12px] text-bh-danger transition-colors hover:border-red-700"
          >
            Quitar elemento
          </button>
        ) : (
          <span className="text-[11px] text-bh-fg-4">
            {mode === "arrow"
              ? "Arrastrá sobre la cancha para dibujar una flecha."
              : "Tocá una ficha para seleccionarla; arrastrala para moverla."}
          </span>
        )}

        <div className="flex items-center gap-1.5">
          <span className="font-bh-mono text-[10px] text-bh-fg-4">
            {board.tokens.length}/{MAX_TOKENS} · {board.arrows.length}/{MAX_ARROWS} flechas
          </span>
          <button
            type="button"
            onClick={removeLastArrow}
            disabled={disabled || board.arrows.length === 0}
            className="rounded-bh-sm border border-white/[0.1] px-2.5 py-1 text-[12px] text-bh-fg-2 transition-colors hover:border-white/[0.24] disabled:opacity-40"
          >
            Deshacer flecha
          </button>
          <button
            type="button"
            onClick={clearBoard}
            disabled={disabled}
            className="rounded-bh-sm border border-white/[0.1] px-2.5 py-1 text-[12px] text-bh-fg-2 transition-colors hover:border-bh-danger hover:text-bh-danger disabled:opacity-40"
          >
            Limpiar
          </button>
        </div>
      </div>
    </div>
  );
}

function ModeBtn({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-bh-sm px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-40 ${
        active
          ? "bg-bh-lime text-bh-black"
          : "border border-white/[0.1] text-bh-fg-2 hover:border-white/[0.24] hover:text-bh-fg-1"
      }`}
    >
      {children}
    </button>
  );
}

function ChipBtn({
  active,
  onClick,
  disabled,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-bh-pill border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-40 ${
        active
          ? "border-bh-lime/50 bg-bh-lime/10 text-bh-lime"
          : "border-white/[0.1] text-bh-fg-2 hover:border-white/[0.24] hover:text-bh-fg-1"
      }`}
    >
      {children}
    </button>
  );
}
