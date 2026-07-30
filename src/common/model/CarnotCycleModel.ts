/**
 * CarnotCycleModel.ts
 *
 * The shared physics model behind all three screens: a reversible ideal-gas
 * Carnot cycle plus a playhead that walks around it. Each screen model composes
 * its own instance (fleet pattern — see doc/implementation-notes.md); nothing is shared
 * live between screens.
 *
 * ── Structure ─────────────────────────────────────────────────────────────────
 * Four user inputs (T_hot, T_cold, the free volume ratio, γ) plus n define the
 * cycle. They feed a single `geometryProperty` that derives the four corner
 * states and every per-cycle energy total *once per parameter change* — never
 * per frame. `cycleStageProperty` + `stageProgressProperty` are the playhead,
 * and the live P/V/T readouts are cheap interpolations along the current leg's
 * analytic curve.
 *
 * ── Traversal ─────────────────────────────────────────────────────────────────
 * `cycleStageProperty` names a leg geometrically (see {@link CycleStage}) and
 * `stageProgressProperty` runs 0→1 from that leg's engine-order start corner to
 * its end corner. In REFRIGERATOR direction the playhead runs the same legs
 * backwards: progress decreases and the stage order reverses. Nothing about the
 * corner points changes — that is the whole point of the Reversed Cycle screen.
 *
 * ── Standing cross-check ──────────────────────────────────────────────────────
 * η is computed twice: from the closed form 1 − T_c/T_h and by numerically
 * integrating ∮P dV around the four analytic legs. `efficiencyAgreesProperty`
 * reports whether they match, and an assertion fires in development if they do
 * not — a wrong corner-point derivation would otherwise produce a wrong but
 * entirely plausible-looking number.
 */

import { assert } from "scenerystack/assert";
import { DerivedProperty, EnumerationProperty, NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import {
  COMPRESSION_RATIO_RANGE,
  DEFAULT_COMPRESSION_RATIO,
  DEFAULT_N_MOLES,
  DEFAULT_T_COLD,
  DEFAULT_T_HOT,
  EFFICIENCY_AGREEMENT_TOLERANCE,
  MIN_SAFE_TEMPERATURE_DELTA,
  MIN_TEMPERATURE_GAP,
  N_MOLES_RANGE,
  STAGE_DURATION_S,
  T_COLD_RANGE,
  T_HOT_RANGE,
} from "../../CarnotHeatEngineConstants.js";
import { CycleDirection, directionSign } from "./CycleDirection.js";
import { type CycleProcessValue, CycleStage, nextStage, previousStage, processFor } from "./CycleStage.js";
import { type CycleGeometry, type CycleState, computeCycleGeometry, stateAt } from "./carnotCycleGeometry.js";
import { GammaPreset, gammaValue, molarHeatCapacityV } from "./GammaPreset.js";

export class CarnotCycleModel {
  // ── Inputs ──────────────────────────────────────────────────────────────────

  /** Hot-reservoir temperature, K. Kept at least MIN_TEMPERATURE_GAP above T_cold. */
  public readonly tHotProperty: NumberProperty;

  /** Cold-reservoir temperature, K. Kept at least MIN_TEMPERATURE_GAP below T_hot. */
  public readonly tColdProperty: NumberProperty;

  /**
   * The free volume ratio V₂/V₁ that closes the cycle (equal to V₃/V₄). Named
   * for the spec's "compression ratio"; see carnotCycleGeometry.ts § "Why the
   * free parameter is a per-leg ratio" for why the overall V_max/V_min cannot be
   * the input.
   */
  public readonly compressionRatioProperty: NumberProperty;

  /** Which ideal gas fills the cylinder — fixes γ and C_v. */
  public readonly gammaPresetProperty: EnumerationProperty<GammaPreset>;

  /** Amount of gas, mol. Fixed in v1 but exposed for later flexibility. */
  public readonly nMolesProperty: NumberProperty;

  /** Engine (clockwise) or refrigerator/heat pump (counter-clockwise) traversal. */
  public readonly directionProperty: EnumerationProperty<CycleDirection>;

  // ── Playhead ────────────────────────────────────────────────────────────────

  /** The leg the playhead is on, named geometrically (see {@link CycleStage}). */
  public readonly cycleStageProperty: EnumerationProperty<CycleStage>;

  /** Progress 0→1 from the current leg's engine-order start corner to its end corner. */
  public readonly stageProgressProperty: NumberProperty;

  // ── Derived cycle definition ────────────────────────────────────────────────

  /** The four corner states and every per-cycle total. Recomputed only on input change. */
  public readonly geometryProperty: TReadOnlyProperty<CycleGeometry>;

  /** The complete state of the gas at the playhead. */
  public readonly stateProperty: TReadOnlyProperty<CycleState>;

  /** Pressure at the playhead, Pa. */
  public readonly pressureProperty: TReadOnlyProperty<number>;

  /** Volume at the playhead, m³. */
  public readonly volumeProperty: TReadOnlyProperty<number>;

  /** Temperature at the playhead, K. */
  public readonly temperatureProperty: TReadOnlyProperty<number>;

  /** The physical process under way right now, accounting for traversal direction. */
  public readonly processProperty: TReadOnlyProperty<CycleProcessValue>;

  // ── Derived cycle totals ────────────────────────────────────────────────────

  /** Heat absorbed from the hot reservoir per cycle, J. */
  public readonly qHotProperty: TReadOnlyProperty<number>;

  /** Heat rejected to the cold reservoir per cycle, J. */
  public readonly qColdProperty: TReadOnlyProperty<number>;

  /** Net work per cycle, J: done by the gas as an engine, on the gas as a refrigerator. */
  public readonly workProperty: TReadOnlyProperty<number>;

  /** Thermal efficiency 1 − T_cold/T_hot (engine framing). */
  public readonly efficiencyProperty: TReadOnlyProperty<number>;

  /** Cooling coefficient of performance T_c/(T_h − T_c). */
  public readonly coolingCopProperty: TReadOnlyProperty<number>;

  /** Heating coefficient of performance T_h/(T_h − T_c). */
  public readonly heatingCopProperty: TReadOnlyProperty<number>;

  /**
   * Whether the numerically integrated η matches the closed form to within
   * EFFICIENCY_AGREEMENT_TOLERANCE. Always true in a correct build; exposed so a
   * unit test can watch it across the whole parameter space.
   */
  public readonly efficiencyAgreesProperty: TReadOnlyProperty<boolean>;

  /**
   * @param initialDirection - ENGINE for the Intro / Efficiency Lab screens,
   *   REFRIGERATOR for the Reversed Cycle screen. Passed in rather than set
   *   afterwards so that Reset All returns to the screen's own direction.
   */
  public constructor(initialDirection: CycleDirection = CycleDirection.ENGINE) {
    this.tHotProperty = new NumberProperty(DEFAULT_T_HOT, { range: T_HOT_RANGE, units: "K" });
    this.tColdProperty = new NumberProperty(DEFAULT_T_COLD, { range: T_COLD_RANGE, units: "K" });
    this.compressionRatioProperty = new NumberProperty(DEFAULT_COMPRESSION_RATIO, {
      range: COMPRESSION_RATIO_RANGE,
    });
    this.gammaPresetProperty = new EnumerationProperty(GammaPreset.MONATOMIC);
    this.nMolesProperty = new NumberProperty(DEFAULT_N_MOLES, { range: N_MOLES_RANGE, units: "mol" });
    this.directionProperty = new EnumerationProperty(initialDirection);

    this.cycleStageProperty = new EnumerationProperty(CycleStage.ISOTHERMAL_EXPANSION);
    // A leg is entered at progress 0 running forwards and at progress 1 running
    // backwards, so the initial playhead position depends on the direction.
    this.stageProgressProperty = new NumberProperty(initialDirection === CycleDirection.ENGINE ? 0 : 1);

    // ── Keep the reservoirs apart ─────────────────────────────────────────────
    // Clamp at the Property level rather than validating on read: letting the
    // sliders meet would send η → 0 correctly but collapse the PV diagram to a
    // degenerate sliver and divide by ~0 in the T–S aspect scaling. Each link
    // pushes the *other* temperature, and the push always lands on a value that
    // satisfies both, so the pair settles in one bounce.
    this.tHotProperty.lazyLink((tHot) => {
      const maximumCold = tHot - MIN_TEMPERATURE_GAP;
      if (this.tColdProperty.value > maximumCold) {
        this.tColdProperty.value = T_COLD_RANGE.constrainValue(maximumCold);
      }
    });
    this.tColdProperty.lazyLink((tCold) => {
      const minimumHot = tCold + MIN_TEMPERATURE_GAP;
      if (this.tHotProperty.value < minimumHot) {
        this.tHotProperty.value = T_HOT_RANGE.constrainValue(minimumHot);
      }
    });

    // ── Cycle definition ──────────────────────────────────────────────────────
    this.geometryProperty = new DerivedProperty(
      [
        this.tHotProperty,
        this.tColdProperty,
        this.compressionRatioProperty,
        this.gammaPresetProperty,
        this.nMolesProperty,
      ],
      (tHot, tCold, compressionRatio, gammaPreset, nMoles) =>
        computeCycleGeometry({
          tHot,
          tCold,
          compressionRatio,
          gamma: gammaValue(gammaPreset),
          nMoles,
        }),
    );

    this.efficiencyAgreesProperty = new DerivedProperty([this.geometryProperty], (geometry) =>
      efficiencyAgrees(geometry),
    );
    this.efficiencyAgreesProperty.link((agrees) => {
      assert?.(agrees, "integrated ∮P dV efficiency disagrees with 1 − T_cold/T_hot");
    });

    // A γ change moves three of the four corner points at once. Rather than
    // interpolate across the discontinuity mid-leg, snap the playhead to the
    // start of the leg it is on — the corner it snaps to is well defined under
    // both gases (CLAUDE.md § Edge cases, case 3).
    this.gammaPresetProperty.lazyLink(() => {
      this.stageProgressProperty.value = this.legStartProgress();
    });

    // ── Playhead state ────────────────────────────────────────────────────────
    this.stateProperty = new DerivedProperty(
      [this.geometryProperty, this.cycleStageProperty, this.stageProgressProperty],
      (geometry, stage, progress) => stateAt(geometry, stage, progress),
    );
    this.pressureProperty = new DerivedProperty([this.stateProperty], (state) => state.pressure);
    this.volumeProperty = new DerivedProperty([this.stateProperty], (state) => state.volume);
    this.temperatureProperty = new DerivedProperty([this.stateProperty], (state) => state.temperature);
    this.processProperty = new DerivedProperty([this.cycleStageProperty, this.directionProperty], (stage, direction) =>
      processFor(stage, direction),
    );

    // ── Cycle totals ──────────────────────────────────────────────────────────
    this.qHotProperty = new DerivedProperty([this.geometryProperty], (geometry) => geometry.qHot);
    this.qColdProperty = new DerivedProperty([this.geometryProperty], (geometry) => geometry.qCold);
    this.workProperty = new DerivedProperty([this.geometryProperty], (geometry) => geometry.work);
    this.efficiencyProperty = new DerivedProperty([this.geometryProperty], (geometry) => geometry.efficiency);
    this.coolingCopProperty = new DerivedProperty(
      [this.tHotProperty, this.tColdProperty],
      (tHot, tCold) => tCold / Math.max(MIN_SAFE_TEMPERATURE_DELTA, tHot - tCold),
    );
    this.heatingCopProperty = new DerivedProperty(
      [this.tHotProperty, this.tColdProperty],
      (tHot, tCold) => tHot / Math.max(MIN_SAFE_TEMPERATURE_DELTA, tHot - tCold),
    );
  }

  /** Molar heat capacity at constant volume for the selected gas, J/(mol·K). */
  public get molarHeatCapacityV(): number {
    return molarHeatCapacityV(this.gammaPresetProperty.value);
  }

  /**
   * Progress value at which the current leg *begins* for the current traversal
   * direction: 0 running forwards, 1 running backwards.
   */
  private legStartProgress(): number {
    return this.directionProperty.value === CycleDirection.ENGINE ? 0 : 1;
  }

  /**
   * Advance the playhead by dt seconds of simulation time. Every leg takes
   * STAGE_DURATION_S regardless of how much volume or heat it moves, which keeps
   * short legs visible at extreme ratios (CLAUDE.md § Edge cases, case 2).
   *
   * Progress lives in [0, 1) running forwards and in (0, 1] running backwards:
   * the two ends of a leg are the same point in space, so each has to belong to
   * exactly one leg or the playhead would stall at a corner. The wrap loop is
   * therefore chosen by direction rather than by the sign of `progress` — a
   * single loop testing both bounds would ping-pong forever on an exact 0 or 1.
   */
  public step(dt: number): void {
    if (!Number.isFinite(dt) || dt === 0) {
      return;
    }
    const forward = this.directionProperty.value === CycleDirection.ENGINE;
    let progress =
      this.stageProgressProperty.value + (directionSign(this.directionProperty.value) * dt) / STAGE_DURATION_S;
    let stage = this.cycleStageProperty.value;

    // A very large dt (a browser tab regaining focus) can cross several legs;
    // walk them one at a time so no stage is ever skipped silently. The second
    // loop in each branch only fires for a negative dt.
    if (forward) {
      while (progress >= 1) {
        progress -= 1;
        stage = nextStage(stage, CycleDirection.ENGINE);
      }
      while (progress < 0) {
        progress += 1;
        stage = nextStage(stage, CycleDirection.REFRIGERATOR);
      }
    } else {
      while (progress <= 0) {
        progress += 1;
        stage = nextStage(stage, CycleDirection.REFRIGERATOR);
      }
      while (progress > 1) {
        progress -= 1;
        stage = nextStage(stage, CycleDirection.ENGINE);
      }
    }

    this.cycleStageProperty.value = stage;
    this.stageProgressProperty.value = progress;
  }

  /**
   * Jump the playhead to the start of the next leg in the traversal order. This
   * is the discrete stage stepper — the control that actually teaches the leg
   * order — so it always advances exactly one stage and wraps at the boundary.
   */
  public stepToNextStage(): void {
    this.cycleStageProperty.value = nextStage(this.cycleStageProperty.value, this.directionProperty.value);
    this.stageProgressProperty.value = this.legStartProgress();
  }

  /** Jump the playhead to the start of the previous leg in the traversal order. */
  public stepToPreviousStage(): void {
    this.cycleStageProperty.value = previousStage(this.cycleStageProperty.value, this.directionProperty.value);
    this.stageProgressProperty.value = this.legStartProgress();
  }

  /** Return the playhead to the start of the cycle without touching the parameters. */
  public rewindToCycleStart(): void {
    this.cycleStageProperty.value = CycleStage.ISOTHERMAL_EXPANSION;
    this.stageProgressProperty.value = this.legStartProgress();
  }

  /** Jump the playhead to the last leg of the traversal, at its start corner. */
  public jumpToLastStage(): void {
    this.cycleStageProperty.value = previousStage(CycleStage.ISOTHERMAL_EXPANSION, this.directionProperty.value);
    this.stageProgressProperty.value = this.legStartProgress();
  }

  public reset(): void {
    this.tHotProperty.reset();
    this.tColdProperty.reset();
    this.compressionRatioProperty.reset();
    this.gammaPresetProperty.reset();
    this.nMolesProperty.reset();
    this.directionProperty.reset();
    this.cycleStageProperty.reset();
    this.stageProgressProperty.reset();
  }

  /**
   * Dispose every owned Property so listeners (including the lazyLinks that
   * capture `this`) are released. Screen models call this in their own dispose
   * so the whole composed model becomes collectable — see
   * {@link tests/memory-leak.test.ts}. Derived properties go first so they
   * unhook from their inputs before the inputs themselves go away.
   *
   * Guarded: SceneryStack's `DerivedProperty.dispose` is not idempotent, so a
   * second call is a no-op rather than a throw.
   */
  private disposed = false;
  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    // Derived totals
    this.coolingCopProperty.dispose();
    this.heatingCopProperty.dispose();
    this.efficiencyProperty.dispose();
    this.workProperty.dispose();
    this.qColdProperty.dispose();
    this.qHotProperty.dispose();
    // Playhead derived state
    this.processProperty.dispose();
    this.temperatureProperty.dispose();
    this.volumeProperty.dispose();
    this.pressureProperty.dispose();
    this.stateProperty.dispose();
    // Cross-check
    this.efficiencyAgreesProperty.dispose();
    // Cycle definition
    this.geometryProperty.dispose();
    // Playhead inputs
    this.stageProgressProperty.dispose();
    this.cycleStageProperty.dispose();
    // User inputs
    this.nMolesProperty.dispose();
    this.gammaPresetProperty.dispose();
    this.compressionRatioProperty.dispose();
    this.tColdProperty.dispose();
    this.tHotProperty.dispose();
    this.directionProperty.dispose();
  }
}

/**
 * Whether a geometry's integrated and closed-form efficiencies agree. Kept as a
 * free function so tests can sweep it across the parameter space without
 * constructing a model.
 */
export const efficiencyAgrees = (geometry: CycleGeometry): boolean => {
  const { efficiency, efficiencyFromPath } = geometry;
  if (!(Number.isFinite(efficiency) && Number.isFinite(efficiencyFromPath))) {
    return false;
  }
  return Math.abs(efficiencyFromPath - efficiency) <= EFFICIENCY_AGREEMENT_TOLERANCE * Math.max(1, efficiency);
};
