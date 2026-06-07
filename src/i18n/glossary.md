# i18n Glossary — ES ↔ EN ↔ IT ↔ PT-BR

> **Purpose:** fixed translation contract passed to the LLM pipeline (UI dictionaries) and the Pro "Auto-completar con Claude" assistant. Keeps domain terms consistent across locales. When a term is here, the translation MUST use it — do not paraphrase.
>
> **Locales:** `es` (es-AR, default), `en`, `it` (it-IT), `pt` (pt-BR). See `docs/i18n/HANDOFF.md`.

## Football domain

| ES | EN | IT | PT-BR |
|---|---|---|---|
| Futbolista | Footballer | Calciatore | Futebolista |
| Agencia | Agency | Agenzia | Agência |
| Representante / Manager | Agent / Manager | Procuratore | Empresário |
| Perfil | Profile | Profilo | Perfil |
| Trayectoria | Career history | Carriera | Trajetória |
| Análisis táctico | Tactical analysis | Analisi tattica | Análise tática |
| Análisis físico | Physical analysis | Analisi fisica | Análise física |
| Análisis mental | Mental analysis | Analisi mentale | Análise mental |
| Análisis técnico | Technical analysis | Analisi tecnica | Análise técnica |
| Objetivos de carrera | Career objectives | Obiettivi di carriera | Objetivos de carreira |
| Pie hábil | Preferred foot | Piede preferito | Pé dominante |
| Club actual | Current club | Squadra attuale | Clube atual |
| Mercado de pases | Transfer market | Calciomercato | Mercado de transferências |
| Selección (nacional) | National team | Nazionale | Seleção |
| Verificado | Verified | Verificato | Verificado |

### Positions

| ES | EN | IT | PT-BR |
|---|---|---|---|
| Arquero / Portero | Goalkeeper | Portiere | Goleiro |
| Defensa central | Center back | Difensore centrale | Zagueiro |
| Lateral | Full back | Terzino | Lateral |
| Mediocampista central | Central midfielder | Centrocampista centrale | Volante / Meio-campo |
| Volante | Defensive midfielder | Mediano | Volante |
| Extremo | Winger | Esterno | Ponta |
| Delantero | Forward | Attaccante | Atacante |
| Centrodelantero | Striker | Centravanti | Centroavante |

## Product / UI

| ES | EN | IT | PT-BR |
|---|---|---|---|
| Plan Pro | Pro plan | Piano Pro | Plano Pro |
| Plan Gratis | Free plan | Piano Gratuito | Plano Grátis |
| Iniciar sesión | Sign in | Accedi | Entrar |
| Registrarse | Sign up | Registrati | Cadastrar-se |
| Cerrar sesión | Sign out | Esci | Sair |
| Panel / Dashboard | Dashboard | Dashboard | Painel |
| Guardar | Save | Salva | Salvar |
| Cancelar | Cancel | Annulla | Cancelar |
| Editar | Edit | Modifica | Editar |
| Precios | Pricing | Prezzi | Preços |
| Jugadores | Players | Giocatori | Jogadores |
| Agencias | Agencies | Agenzie | Agências |

## Rules for the LLM

1. **Preserve placeholders** verbatim: `{name}`, `{count}`, `{club}` — never translate or reorder their tokens.
2. **Preserve markup**: keep HTML tags / markdown exactly; translate only the text nodes.
3. **Tone**: professional, sporting register. Direct and concise. Avoid machine-translation literalisms.
4. **pt = pt-BR** (Brazil), not pt-PT. Use Brazilian terms (e.g. "Goleiro", not "Guarda-redes").
5. **it = it-IT** (Italy). Use football-Italian (e.g. "Calciomercato", "Attaccante").
6. **Brand**: never translate "BallersHub". Keep proper nouns (clubs, names) untranslated.
7. If a term is in the tables above, use that exact translation.
