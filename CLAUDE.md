# CLAUDE.md — Carnot Heat Engine

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenPhysics/.github/CLAUDE.md](https://github.com/OpenPhysics/.github/blob/main/CLAUDE.md).

## Project

Three-screen simulation of the reversible ideal-gas **Carnot cycle** — the fleet's
first thermodynamics sim. Forked from `SceneryStackTemplate`.

| Screen | Folder | What it is for |
|---|---|---|
| Intro | `src/intro/` | Piston-cylinder + reservoirs beside a live PV diagram, driven by a discrete stage stepper |
| Efficiency Lab | `src/efficiency-lab/` | Energy-flow bars, ghosted previous cycle, T–S diagram, η-vs-T_cold inset, Explore/Measure modes |
| Reversed Cycle | `src/reversed-cycle/` | The same cycle counter-clockwise, framed as a refrigerator or heat pump (COP) |

Physics for educators: [`doc/model.md`](doc/model.md). Architecture and the
reasoning behind the non-obvious choices: [`doc/implementation-notes.md`](doc/implementation-notes.md).
Read both before changing the model.

## Key files

| File | Purpose |
|---|---|
| `src/common/model/carnotCycleGeometry.ts` | **Pure** cycle maths — corner points, per-leg analytic curves, ∮P dV. No SceneryStack imports; unit-tested directly |
| `src/common/model/CarnotCycleModel.ts` | Property layer over the maths: inputs, playhead, energy totals, the η cross-check |
| `src/common/model/CycleStage.ts` | The four legs + direction-aware process naming (`processFor`) |
| `src/common/model/CycleDirection.ts` | `ENGINE` \| `REFRIGERATOR` |
| `src/common/model/GammaPreset.ts` | `MONATOMIC` \| `DIATOMIC` → γ and C_v |
| `src/common/view/CycleDiagramNode.ts` | Shared diagram frame: bamboo `ChartTransform`, axes, ticks, auto-scaling |
| `src/common/view/PVDiagramNode.ts` | The four legs, work-area fill, playhead, ghost, direction arrows |
| `src/common/view/TSDiagramNode.ts` | The same cycle as a rectangle in (S, T) |
| `src/common/view/EnergyFlowNode.ts` | Q_hot → W + Q_cold bars, shared by two screens |
| `src/common/view/CycleParameterControls.ts` | The three cycle-defining sliders, shared by all three screens |
| `src/common/view/StageStepperNode.ts` | ⏮ ◀ ▶ ⏭ over the four legs |
| `src/CarnotHeatEngineConstants.ts` | Ranges, defaults, layout px, fonts |
| `src/CarnotHeatEngineColors.ts` | All `ProfileColorProperty` instances |
| `src/i18n/StringManager.ts` | Singleton localized string accessor |

## Things that will bite you

### The third slider is not the overall compression ratio

`compressionRatioProperty` is `V₂/V₁` — the volume ratio across *one* isothermal
leg. It is **not** V_max/V_min, and it cannot be: the overall span equals `r·τ`
where `τ = (T_hot/T_cold)^(1/(γ−1))` reaches 32 for a diatomic gas at the range
extremes, so pinning V_max/V_min to a small number admits no solution. The
derived overall span is exposed as `CycleGeometry.volumeSpanRatio`. Full argument
in `carnotCycleGeometry.ts` § "Why the free parameter is a per-leg ratio".

### A stage names a leg, not a process

`CycleStage.ISOTHERMAL_EXPANSION` identifies the leg from corner 1 to corner 2.
On the Reversed Cycle screen that leg is an isothermal *compression*. Never read
a stage name as a description of what is happening — call
`processFor(stage, direction)` and label through `common/view/stageStrings.ts`.

### Progress has different bounds per direction

`[0, 1)` forwards, `(0, 1]` backwards. The two ends of a leg are the same point,
so each end must belong to exactly one leg. `CarnotCycleModel.step` picks its
wrap loop by direction; a single loop testing both bounds ping-pongs forever on
an exact 0 or 1. Do not "simplify" it back.

### geometryProperty is per-change, never per-frame

It runs a 4 × 200-interval Simpson integration. `stateProperty` is the per-frame
path. Keep it that way.

### The η cross-check must stay honest

`efficiencyAgreesProperty` compares the numerically integrated η against
`1 − T_c/T_h` and asserts they match. If you change the corner-point derivation
and this starts failing, the derivation is wrong — do not widen the tolerance.
The quadrature integrates in log-volume space for accuracy; reverting that to a
plain integration in V costs several digits on the wide adiabats.

## Common components

### CarnotHeatEnginePanel

Every control panel and info box uses `CarnotHeatEnginePanel` so default/projector
switching is automatic:

```typescript
import { CarnotHeatEnginePanel } from "../../common/CarnotHeatEnginePanel.js";
const panel = new CarnotHeatEnginePanel(content);
const panel = new CarnotHeatEnginePanel(content, { xMargin: 20 });
```

### The colour language

One idea, one hue, on every screen: warm red for the hot reservoir / T_hot / hot
isotherm / Q_hot, cool blue for their cold counterparts, violet for the adiabatic
legs and the insulating sleeve, green for work. A student who learns the palette
on the Intro screen reads the Efficiency Lab bars without a second legend — keep
new colours inside that scheme.

### CarnotHeatEngineButtonOptions

Buttons are flat, not SceneryStack's default 3-D look:

```typescript
import { FLAT_RESET_ALL_BUTTON_OPTIONS, FLAT_RECTANGULAR_BUTTON_OPTIONS } from "../../common/CarnotHeatEngineButtonOptions.js";
```

`FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS` spreads into `TimeControlNode`'s
`playPauseStepButtonOptions`; `TIME_CONTROL_SPEED_RADIO_OPTIONS` fixes the
speed-radio label colour on dark panels.

### TimeModel

Extended from the template's with a `timeSpeedProperty` (0.25× / 1× / 2×) and a
`scaledDt(dt)` the screen models pass on to `cycle.step`, so one speed setting
governs both the clock and the cycle.

## Strings

Several strings carry `<sub>` markup (`Q<sub>h</sub>`, `V<sub>2</sub>/V<sub>1</sub>`)
because thermodynamics is unreadable without subscripts and Unicode has no
subscript "c". Render those with `RichText`, or `useRichText: true` on a
`NumberDisplay` / `NumberControl` (`createNumberControl` already sets both).

`readouts.heatRemoved` / `heatDelivered` are the long descriptive phrases used in
the screen summary; `…Short` are the compact forms that fit the readout column.
Do not swap them.

## Accessibility

All three layers are wired: PDOM names on every interactive node, a per-screen
`*ScreenSummaryContent` with a **live** `currentDetailsContent`, and an explicit
`pdomOrder` + `*KeyboardHelpContent`. A11y strings live under `a11y.<screen>` in
each locale JSON.

The Efficiency Lab's summary respects Measure mode: it says the efficiency is
hidden rather than reading it out, so a screen-reader user gets the same exercise
a sighted user does instead of a spoiler. Keep that if you touch the summary.

Full convention: [Baton/ACCESSIBILITY.md](https://github.com/OpenPhysics/Baton/blob/main/ACCESSIBILITY.md).

## Compliance carve-outs

None. Root `CarnotHeatEngineConstants.ts` / `*Colors.ts` / `*Namespace.ts`,
kebab-case screen folders, `src/preferences/`, and the standard `tests/` layout
all follow Baton's conventions as shipped.

One deliberate structural note: screens receive the
`CarnotHeatEnginePreferencesModel` as a positional constructor argument from
`main.ts`, because the diagrams honour the "label cycle corners" preference. The
template does not plumb preferences into screens, so this is an addition rather
than a deviation.

## Testing

| Path | Purpose |
|---|---|
| `tests/carnotCycleGeometry.test.ts` | Corner points vs. hand-computed values; ∮P dV vs. closed-form η; range-extreme finiteness; leg parametrization |
| `tests/CarnotCycleModel.test.ts` | Temperature clamp; stage stepper in both directions; continuous stepping; process naming; COP; γ-change snapping; reset |
| `tests/memory-leak.test.ts` | WeakRef + `forceGC` dispose regression |
| `tests/fuzz/fuzz.spec.ts` | Playwright fuzz smoke via joist `?fuzz` |
| `tests/setup.ts` | Canvas / AudioContext mocks + `init({ name: "carnot-heat-engine" })` |

Environment is `happy-dom` with `execArgv: ["--expose-gc"]`, per the template.

## Commands

```bash
npm run lint && npm run check && npm run build && npm test
```

| Command | Description |
|---|---|
| `npm start` / `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run build:single` | Single-file build mode |
| `npm run check` | TypeScript (`tsc --noEmit` + scripts project) |
| `npm run lint` / `npm run fix` | Biome check / auto-fix |
| `npm test` | Vitest unit tests |
| `npm run test:fuzz` / `test:fuzz:quick` | Playwright fuzz smoke (15s / 10s) |
| `npm run icons` | Regenerate PWA icons |

## PWA

After `npm run build`, the sim is installable offline via Workbox (`dist/manifest.webmanifest`).
