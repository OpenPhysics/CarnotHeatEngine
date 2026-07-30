# Implementation Notes - Carnot Heat Engine

Developer-facing notes on how the simulation is put together. The physics itself
is described for educators in [model.md](./model.md).

## Architecture overview

```
main.ts
  ├─ IntroScreen              (Screen<IntroModel, IntroScreenView>)
  ├─ EfficiencyLabScreen      (Screen<EfficiencyLabModel, EfficiencyLabScreenView>)
  └─ ReversedCycleScreen      (Screen<ReversedCycleModel, ReversedCycleScreenView>)

src/common/model/
  carnotCycleGeometry.ts      pure maths: corner points, per-leg curves, ∮P dV
  CarnotCycleModel.ts         Property layer over the maths + the playhead
  CycleStage.ts               the four legs, direction-aware process naming
  CycleDirection.ts           ENGINE | REFRIGERATOR
  GammaPreset.ts              MONATOMIC | DIATOMIC → γ and C_v

src/common/view/
  CycleDiagramNode.ts         shared frame: axes, grid, ticks, auto-scaling
  PVDiagramNode.ts            the four legs, work area, playhead, ghost, arrows
  TSDiagramNode.ts            the same cycle as a rectangle in (S, T)
  EnergyFlowNode.ts           Q_hot → W + Q_cold bars
  CycleParameterControls.ts   the three cycle-defining sliders
  StageStepperNode.ts         ⏮ ◀ ▶ ⏭ over the four legs
```

Each screen model composes **its own** `CarnotCycleModel` — the fleet's
multi-screen pattern, where the shared *code* lives in `common/model/` but the
live state does not. No Property is shared between screens. The Reversed
Cycle screen differs from the others only by the `CycleDirection` it passes to
that constructor.

## The model, in two layers

`carnotCycleGeometry.ts` is deliberately free of SceneryStack: plain functions of
plain numbers, unit-testable without a DOM. `CarnotCycleModel` wraps it in
Properties.

The split that matters for performance is **per-change vs. per-frame**:

- `geometryProperty` derives the four corner states and every per-cycle energy
  total. It recomputes only when an input Property changes, and it runs the
  numerical ∮P dV integration, so it is far too expensive for a frame loop.
- `stateProperty` interpolates along the current leg's analytic curve from
  `cycleStageProperty` + `stageProgressProperty`. That is the only thing that
  moves every frame, and it is a handful of arithmetic operations.

### Playhead parametrization

`cycleStageProperty` names a leg **geometrically** — the pair of corners it joins
— never the process taking place on it. `stageProgressProperty` runs 0 → 1 from
the leg's engine-order start corner to its end corner.

Running as a refrigerator does not change any of that: progress simply decreases
and the stage order reverses. Progress lives in `[0, 1)` running forwards and
`(0, 1]` running backwards, because the two ends of a leg are the same point in
space and each has to belong to exactly one leg or the playhead stalls at a
corner. `CarnotCycleModel.step` picks its wrap loop by direction for that reason;
one loop testing both bounds would ping-pong forever on an exact 0 or 1.

The process actually happening — expansion vs. compression — comes from
`processFor(stage, direction)`, and the view turns that into a localized label
through `common/view/stageStrings.ts`.

### The standing η cross-check

η is computed two ways: the closed form `1 − T_cold/T_hot`, and by numerically
integrating ∮P dV around the four analytic legs. `efficiencyAgreesProperty`
compares them and an assertion fires in development if they diverge. A wrong
corner-point derivation would otherwise produce a wrong number that still looks
entirely plausible.

The quadrature integrates in **log-volume space** (`u = ln V`, so `∫P dV = ∫P·V du`).
P·V is constant on an isothermal leg — making Simpson's rule exact there — and a
mild power law on an adiabatic one. Integrating in V directly loses several
digits on the wide adiabats at the top of the parameter ranges, which would
undercut the whole point of having an independent check.

## The view

### Auto-scaling is not cosmetic

Across the allowed parameter space the cycle's volume span runs from about 3× to
256×, and its pressure span from about 3× to 1000×. Both diagram axes therefore
re-range and re-derive their tick spacing on every geometry change
(`CycleDiagramNode.setRanges` + `chartUtils.niceStep`). A fixed scale would leave
most cycles off-screen or crushed into a corner.

### Why the frame is factored out

`CycleDiagramNode` owns the bamboo `ChartTransform`, the frame, grid, ticks, tick
labels, title and axis labels; subclasses supply only what is plotted. That is
what makes `TSDiagramNode` a short file rather than a second copy of
`PVDiagramNode`, and it is the piece an Otto/Diesel/Brayton sim would reuse
directly. Per the fleet's convention it stays in this repo until a second sim
actually needs it.

### Layout notes

- The PV diagram is anchored by its **right** edge against the control panel.
  Its corner labels overhang the plot frame (they sit in an unclipped
  `overlayLayer`), so centring it in the available gap let them collide with the
  panel.
- `CarnotCycleNode` pins its own `localBounds` to the widest reservoir
  arrangement. Without that, a reservoir sliding in or out would change the
  node's bounds and drag the whole cylinder sideways under a `left`-anchored
  layout.
- Piston height maps to volume **logarithmically**. A linear map would pin the
  piston to the cylinder base for three of the four corners at high volume spans.
- The Measure-mode self-check is its own panel (`MeasurePanelNode`) rather than a
  section inside `EfficiencyPanelNode`, so switching modes does not change the
  energy panel's height and shove the rest of the screen around.

### Ghosted previous cycle

`EfficiencyLabModel` captures the previous geometry from the `DerivedProperty`
listener's old value, but holds it until the parameters have been still for
`GHOST_SETTLE_TIME_S`. Publishing it immediately would make the ghost trail a
slider drag by one frame, comparing nothing useful; settling it means the ghost
snaps to wherever the drag started.

## Edge cases handled

1. **T_hot → T_cold convergence** — clamped at the Property level, in both
   directions, with a 50 K floor. Each link pushes the *other* temperature, and
   the push always lands on a value satisfying both, so the pair settles in one
   bounce.
2. **Short legs at extreme ratios** — every leg gets the same wall-clock
   duration, which doubles as the per-leg minimum-duration floor.
3. **γ switched mid-leg** — three of the four corners move at once, so the
   playhead snaps to the start of the leg it is on rather than interpolating
   across the discontinuity.
4. **Non-finite guards** — `sanitizeParameters` clamps inputs into the region
   where the closed form exists (positive temperatures, T_hot > T_cold, γ > 1,
   r > 1). The Property ranges already prevent this; the guard is insurance for
   the day the ranges are loosened.
5. **Numerical vs. closed-form η** — see "The standing η cross-check" above.

## Testing

| Path | Covers |
|---|---|
| `tests/carnotCycleGeometry.test.ts` | corner points against hand-computed values, both isothermal legs sweeping the same ratio, ∮P dV vs. the closed form across the parameter space, finiteness at every range extreme, leg parametrization |
| `tests/CarnotCycleModel.test.ts` | the temperature clamp, the stage stepper (never skips, wraps correctly, previous inverts next, in both directions), continuous stepping including huge dt, direction-aware process naming, COP, γ-change snapping, reset |
| `tests/memory-leak.test.ts` | WeakRef + `forceGC` dispose regression (fleet pattern) |
| `tests/fuzz/fuzz.spec.ts` | Playwright fuzz smoke via joist `?fuzz` |

The stage-stepper tests are the ones with teeth: "next" is the control the Intro
screen leans on to teach the leg order, so a stepper that skipped a leg or
wrapped the wrong way would quietly teach the wrong sequence.

## Known gaps / future work

- `n` is exposed as a Property but has no UI. It cancels out of η, so a slider
  would mostly demonstrate that nothing happens — which is arguably worth
  showing, but not in v1.
- `PVDiagramNode` / `TSDiagramNode` would be the natural seed of a shared
  cycle-diagram package once a second cycle-based sim exists.
- The Efficiency Lab's Measure mode accepts a single numeric answer; it does not
  ask the student to show the Q_hot and W they read off.
