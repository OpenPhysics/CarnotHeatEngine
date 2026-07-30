/**
 * carnotCycleGeometry.ts
 *
 * Pure, dependency-free maths for a reversible quasi-static Carnot cycle of an
 * ideal gas. Everything here is a plain function of plain numbers so it can be
 * unit-tested without SceneryStack; {@link CarnotCycleModel} wraps it in
 * Properties and calls {@link computeCycleGeometry} once per parameter change
 * rather than once per frame.
 *
 * ── The four corner states ────────────────────────────────────────────────────
 * Corners are numbered in engine (clockwise on PV) order:
 *
 *   1 → 2  isothermal expansion   at T_hot      absorbs Q_hot
 *   2 → 3  adiabatic expansion    T_hot→T_cold  Q = 0
 *   3 → 4  isothermal compression at T_cold     rejects Q_cold
 *   4 → 1  adiabatic compression  T_cold→T_hot  Q = 0
 *
 * Given T_hot, T_cold, γ and one free volume ratio, the adiabatic relation
 * TV^(γ−1) = const fixes the rest. Writing τ = (T_hot/T_cold)^(1/(γ−1)) for the
 * volume ratio every adiabatic leg must span, and r = V₂/V₁ for the free ratio:
 *
 *   V₁ = MINIMUM_VOLUME_M3     V₂ = r·V₁     V₃ = τ·V₂     V₄ = τ·V₁
 *
 * so V₃/V₄ = r as well: both isothermal legs sweep the same volume ratio, which
 * is exactly why Q_hot/Q_cold collapses to T_hot/T_cold and η to 1 − T_c/T_h.
 *
 * ── Why the free parameter is a per-leg ratio ─────────────────────────────────
 * The overall span V_max/V_min = V₃/V₁ is *not* free: it equals r·τ, and τ alone
 * is already 8 for a monatomic gas at T_hot/T_cold = 4 (32 for a diatomic one).
 * Pinning V_max/V_min to a small number would over-constrain the cycle and admit
 * no solution. The free parameter is therefore the isothermal-leg ratio r, and
 * the resulting overall span is reported back as
 * {@link CycleGeometry.volumeSpanRatio}.
 */

import { Range } from "scenerystack/dot";
import {
  CURVE_SAMPLES_PER_LEG,
  GAS_CONSTANT,
  INTEGRATION_INTERVALS_PER_LEG,
  MINIMUM_VOLUME_M3,
} from "../../CarnotHeatEngineConstants.js";
import { CYCLE_STAGE_ORDER, CycleStage } from "./CycleStage.js";

/** One thermodynamic state of the gas. */
export type CycleState = {
  /** Volume, m³. */
  readonly volume: number;
  /** Pressure, Pa. */
  readonly pressure: number;
  /** Temperature, K. */
  readonly temperature: number;
  /** Entropy relative to state 1, J/K. */
  readonly entropy: number;
};

/** The inputs that fully determine a cycle. */
export type CycleParameters = {
  /** Hot-reservoir temperature, K. */
  readonly tHot: number;
  /** Cold-reservoir temperature, K. */
  readonly tCold: number;
  /** Free volume ratio V₂/V₁ across the hot isothermal leg. */
  readonly compressionRatio: number;
  /** Heat-capacity ratio γ = C_p/C_v. */
  readonly gamma: number;
  /** Amount of gas, mol. */
  readonly nMoles: number;
};

/**
 * The part of a cycle the per-leg curve functions need: its inputs and its four
 * corner states. {@link CycleGeometry} is this plus the derived energy totals.
 */
export type CycleShape = {
  readonly parameters: CycleParameters;
  /** The four corner states, in engine order (index 0 = state 1). */
  readonly corners: readonly [CycleState, CycleState, CycleState, CycleState];
};

/** Everything derived from a {@link CycleParameters} set, computed once per change. */
export type CycleGeometry = CycleShape & {
  /** Heat absorbed from the hot reservoir per cycle, J (positive). */
  readonly qHot: number;
  /** Heat rejected to the cold reservoir per cycle, J (positive). */
  readonly qCold: number;
  /** Net work done by the gas per cycle, J (positive for an engine traversal). */
  readonly work: number;
  /** Thermal efficiency from the closed form, 1 − T_cold/T_hot. */
  readonly efficiency: number;
  /** Thermal efficiency from numerically integrating ∮P dV. */
  readonly efficiencyFromPath: number;
  /** Net work from numerically integrating ∮P dV, J. */
  readonly workFromPath: number;
  /** Q_hot from numerically integrating ∫P dV over the hot isothermal leg, J. */
  readonly qHotFromPath: number;
  /** Entropy taken up on the hot isothermal leg, J/K — the width of the T–S rectangle. */
  readonly entropySpan: number;
  /** Overall volume span V_max/V_min = r·τ (derived, not an input). */
  readonly volumeSpanRatio: number;
  /** Volume extent of the whole cycle, m³. */
  readonly volumeRange: Range;
  /** Pressure extent of the whole cycle, Pa. */
  readonly pressureRange: Range;
};

/** A finite fallback for any quantity that would otherwise be NaN or ±∞. */
const finiteOr = (value: number, fallback: number): number => (Number.isFinite(value) ? value : fallback);

/**
 * Clamp raw inputs into the region where the closed-form solution exists:
 * positive temperatures with T_hot strictly above T_cold, γ above 1, and an
 * expansion ratio above 1. Callers hold Properties inside their ranges, so this
 * only fires for programmatic misuse or if the ranges are ever loosened — but it
 * keeps every downstream `**` and division finite (see CLAUDE.md § Edge cases).
 */
export const sanitizeParameters = (parameters: CycleParameters): CycleParameters => {
  const tCold = Math.max(1, finiteOr(parameters.tCold, 1));
  const tHot = Math.max(tCold * (1 + 1e-9), finiteOr(parameters.tHot, tCold * 2));
  const gamma = Math.max(1 + 1e-6, finiteOr(parameters.gamma, 5 / 3));
  const compressionRatio = Math.max(1 + 1e-9, finiteOr(parameters.compressionRatio, 2));
  const nMoles = Math.max(1e-9, finiteOr(parameters.nMoles, 1));
  return { tHot, tCold, compressionRatio, gamma, nMoles };
};

/** Ideal-gas pressure, Pa, for n mol at temperature T in volume V. */
export const idealGasPressure = (nMoles: number, temperature: number, volume: number): number =>
  (nMoles * GAS_CONSTANT * temperature) / volume;

/** The adiabatic volume ratio τ = (T_hot/T_cold)^(1/(γ−1)) each adiabat must span. */
export const adiabaticVolumeRatio = (tHot: number, tCold: number, gamma: number): number =>
  (tHot / tCold) ** (1 / (gamma - 1));

/** Derive the four corner states from a (sanitized) parameter set. */
export const computeCycleShape = (rawParameters: CycleParameters): CycleShape => {
  const parameters = sanitizeParameters(rawParameters);
  const { tHot, tCold, compressionRatio, nMoles, gamma } = parameters;

  const tau = adiabaticVolumeRatio(tHot, tCold, gamma);
  const v1 = MINIMUM_VOLUME_M3;
  const v2 = v1 * compressionRatio;
  const v3 = v2 * tau;
  const v4 = v1 * tau;

  // Entropy is referenced to state 1: it rises by nR·ln r on the hot isothermal
  // leg, is flat on both adiabats, and falls by the same amount on the cold one.
  const entropySpan = nMoles * GAS_CONSTANT * Math.log(compressionRatio);

  const corner = (volume: number, temperature: number, entropy: number): CycleState => ({
    volume,
    pressure: idealGasPressure(nMoles, temperature, volume),
    temperature,
    entropy,
  });

  return {
    parameters,
    corners: [corner(v1, tHot, 0), corner(v2, tHot, entropySpan), corner(v3, tCold, entropySpan), corner(v4, tCold, 0)],
  };
};

/**
 * Derive the four corner states and every per-cycle total. Cheap enough to call
 * on any parameter change, far too expensive to call per frame.
 */
export const computeCycleGeometry = (rawParameters: CycleParameters): CycleGeometry => {
  const shape = computeCycleShape(rawParameters);
  const { tHot, tCold, compressionRatio, nMoles, gamma } = shape.parameters;

  // Isothermal legs do W = nRT·ln(V_f/V_i) with ΔU = 0, so Q = W for each of
  // them. Both legs sweep the same volume ratio r, hence the shared ln r factor.
  const logRatio = Math.log(compressionRatio);
  const qHot = nMoles * GAS_CONSTANT * tHot * logRatio;
  const qCold = nMoles * GAS_CONSTANT * tCold * logRatio;

  return {
    ...shape,
    qHot,
    qCold,
    // The two adiabatic legs do equal and opposite work (nC_v ΔT), so they
    // cancel exactly and the net is what the isothermal legs exchange.
    work: qHot - qCold,
    efficiency: 1 - tCold / tHot,
    entropySpan: nMoles * GAS_CONSTANT * logRatio,
    volumeSpanRatio: compressionRatio * adiabaticVolumeRatio(tHot, tCold, gamma),
    ...integrateCycle(shape),
    volumeRange: new Range(shape.corners[0].volume, shape.corners[2].volume),
    pressureRange: new Range(shape.corners[2].pressure, shape.corners[0].pressure),
  };
};

// ── Per-leg analytic curves ───────────────────────────────────────────────────

/**
 * The corner states a leg runs between, in engine order. Written as an explicit
 * tuple destructure rather than an indexed lookup so both ends stay typed as
 * `CycleState` under `noUncheckedIndexedAccess`.
 */
export const legCorners = (shape: CycleShape, stage: CycleStage): { start: CycleState; end: CycleState } => {
  const [state1, state2, state3, state4] = shape.corners;
  if (stage === CycleStage.ISOTHERMAL_EXPANSION) {
    return { start: state1, end: state2 };
  }
  if (stage === CycleStage.ADIABATIC_EXPANSION) {
    return { start: state2, end: state3 };
  }
  if (stage === CycleStage.ISOTHERMAL_COMPRESSION) {
    return { start: state3, end: state4 };
  }
  return { start: state4, end: state1 };
};

/** Volumes of the leg's start and end corners, in engine order. */
export const legVolumeBounds = (shape: CycleShape, stage: CycleStage): { start: number; end: number } => {
  const { start, end } = legCorners(shape, stage);
  return { start: start.volume, end: end.volume };
};

/**
 * Pressure, Pa, at volume V on `stage`'s analytic curve. Isothermal legs follow
 * P = nRT/V; adiabatic legs follow P·V^γ = const through their starting corner.
 */
export const pressureOnLeg = (shape: CycleShape, stage: CycleStage, volume: number): number => {
  const { nMoles, gamma, tHot, tCold } = shape.parameters;
  if (stage === CycleStage.ISOTHERMAL_EXPANSION) {
    return idealGasPressure(nMoles, tHot, volume);
  }
  if (stage === CycleStage.ISOTHERMAL_COMPRESSION) {
    return idealGasPressure(nMoles, tCold, volume);
  }
  const { start } = legCorners(shape, stage);
  return start.pressure * (start.volume / volume) ** gamma;
};

/**
 * The state at fractional progress `p` along `stage`, measured from the leg's
 * engine-order start corner (p = 0) to its end corner (p = 1). A refrigerator
 * traverses the same parametrization with p running backwards.
 *
 * Isothermal legs are parametrized geometrically in V (uniform in ln V) and
 * adiabatic legs linearly in T, which makes the *energy* transferred per unit
 * progress constant on every leg — the playhead moves at a rate that means
 * something rather than just sweeping volume.
 */
export const stateAt = (shape: CycleShape, stage: CycleStage, progress: number): CycleState => {
  const p = Math.min(1, Math.max(0, finiteOr(progress, 0)));
  const { nMoles, gamma } = shape.parameters;
  const { start, end } = legCorners(shape, stage);

  if (stage === CycleStage.ISOTHERMAL_EXPANSION || stage === CycleStage.ISOTHERMAL_COMPRESSION) {
    const volume = start.volume * (end.volume / start.volume) ** p;
    const temperature = start.temperature;
    return {
      volume,
      pressure: idealGasPressure(nMoles, temperature, volume),
      temperature,
      entropy: start.entropy + p * (end.entropy - start.entropy),
    };
  }

  // Adiabatic: T sweeps linearly and V follows from TV^(γ−1) = const. Both
  // adiabats are isentropic, so entropy holds at whatever the leg started with.
  const temperature = start.temperature + p * (end.temperature - start.temperature);
  const volume = start.volume * (start.temperature / temperature) ** (1 / (gamma - 1));
  return {
    volume,
    pressure: idealGasPressure(nMoles, temperature, volume),
    temperature,
    entropy: start.entropy,
  };
};

/** `samples + 1` evenly spaced states along `stage`, start corner first. */
export const sampleLeg = (
  shape: CycleShape,
  stage: CycleStage,
  samples: number = CURVE_SAMPLES_PER_LEG,
): CycleState[] => {
  const count = Math.max(2, Math.floor(samples));
  const states: CycleState[] = [];
  for (let i = 0; i <= count; i++) {
    states.push(stateAt(shape, stage, i / count));
  }
  return states;
};

/** Every state around the closed cycle, in engine order, first corner repeated last. */
export const sampleCycle = (shape: CycleShape, samplesPerLeg: number = CURVE_SAMPLES_PER_LEG): CycleState[] => {
  const states: CycleState[] = [];
  for (const stage of CYCLE_STAGE_ORDER) {
    const leg = sampleLeg(shape, stage, samplesPerLeg);
    // Drop each later leg's first sample: it duplicates the previous leg's last.
    states.push(...(states.length === 0 ? leg : leg.slice(1)));
  }
  return states;
};

// ── Cross-check: numerical ∮P dV vs. the closed form ──────────────────────────

/**
 * Composite Simpson's rule for ∫f dx over [a, b] with `intervals` (even) steps.
 * Signed: an integral run from a high to a low bound comes back negative, which
 * is what the compression legs need.
 */
export const simpsonIntegral = (f: (x: number) => number, a: number, b: number, intervals: number): number => {
  const n = intervals % 2 === 0 ? intervals : intervals + 1;
  const h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) {
    sum += (i % 2 === 1 ? 4 : 2) * f(a + i * h);
  }
  return (sum * h) / 3;
};

/**
 * Work done by the gas on one leg, J, from numerically integrating ∫P dV.
 *
 * The substitution u = ln V turns the integral into ∫P·V du, and P·V is a far
 * gentler integrand than P: constant (nRT) on an isothermal leg, so Simpson's
 * rule is *exact* there, and a mild power law on an adiabatic one. Integrating
 * in V directly loses several digits on the wide adiabats at the top of the
 * parameter ranges, where V_max/V_min reaches 256 — which matters because this
 * integral's whole job is to be an independent check on the closed form.
 */
export const integrateLegWork = (
  shape: CycleShape,
  stage: CycleStage,
  intervals: number = INTEGRATION_INTERVALS_PER_LEG,
): number => {
  const { start, end } = legVolumeBounds(shape, stage);
  return simpsonIntegral(
    (logVolume) => {
      const volume = Math.exp(logVolume);
      return pressureOnLeg(shape, stage, volume) * volume;
    },
    Math.log(start),
    Math.log(end),
    intervals,
  );
};

/**
 * Integrate the whole cycle numerically and derive η from the integrated path
 * alone. {@link CarnotCycleModel} asserts this agrees with 1 − T_c/T_h, so a
 * mistake in the corner-point derivation surfaces as a failing invariant rather
 * than as a plausible-looking wrong number (see CLAUDE.md § Edge cases).
 */
export const integrateCycle = (
  shape: CycleShape,
  intervals: number = INTEGRATION_INTERVALS_PER_LEG,
): { workFromPath: number; qHotFromPath: number; efficiencyFromPath: number } => {
  let workFromPath = 0;
  for (const stage of CYCLE_STAGE_ORDER) {
    workFromPath += integrateLegWork(shape, stage, intervals);
  }
  // ΔU = 0 on an isothermal leg, so the heat drawn from the hot reservoir is
  // exactly the work that leg does.
  const qHotFromPath = integrateLegWork(shape, CycleStage.ISOTHERMAL_EXPANSION, intervals);

  return {
    workFromPath,
    qHotFromPath,
    efficiencyFromPath: qHotFromPath === 0 ? 0 : workFromPath / qHotFromPath,
  };
};
