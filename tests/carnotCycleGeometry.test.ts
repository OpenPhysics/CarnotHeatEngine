/**
 * Unit tests for the pure Carnot-cycle maths.
 *
 * These are the tests that would catch a wrong corner-point derivation, which is
 * the failure mode that matters here: every downstream number (Q, W, η, the PV
 * path, the T–S rectangle) is derived from those four states, and a wrong one
 * produces a diagram that still *looks* like a Carnot cycle.
 *
 * Three independent checks are layered:
 *  1. corner points against values computed by hand from the closed form;
 *  2. numerically integrated ∮P dV against the closed-form η (§6.5 of the spec —
 *     the quadrature knows nothing about 1 − T_c/T_h, so agreement is real
 *     evidence);
 *  3. finiteness at every corner of the allowed parameter space.
 */

import { describe, expect, it } from "vitest";
import {
  COMPRESSION_RATIO_RANGE,
  GAMMA_PRESETS,
  GAS_CONSTANT,
  MIN_TEMPERATURE_GAP,
  MINIMUM_VOLUME_M3,
  T_COLD_RANGE,
  T_HOT_RANGE,
} from "../src/CarnotHeatEngineConstants.js";
import { CYCLE_STAGE_ORDER, CycleStage } from "../src/common/model/CycleStage.js";
import {
  adiabaticVolumeRatio,
  type CycleParameters,
  computeCycleGeometry,
  integrateLegWork,
  sampleCycle,
  sanitizeParameters,
  stateAt,
} from "../src/common/model/carnotCycleGeometry.js";

const DEFAULTS: CycleParameters = {
  tHot: 600,
  tCold: 300,
  compressionRatio: 2,
  gamma: GAMMA_PRESETS.MONATOMIC,
  nMoles: 1,
};

/** Every combination of the extremes of the allowed parameter space. */
const extremeParameterSets = (): CycleParameters[] => {
  const sets: CycleParameters[] = [];
  for (const gamma of [GAMMA_PRESETS.MONATOMIC, GAMMA_PRESETS.DIATOMIC]) {
    for (const compressionRatio of [COMPRESSION_RATIO_RANGE.min, COMPRESSION_RATIO_RANGE.max]) {
      for (const tHot of [T_HOT_RANGE.min, T_HOT_RANGE.max]) {
        for (const tCold of [T_COLD_RANGE.min, T_COLD_RANGE.max]) {
          // The model clamps the pair apart; skip combinations it would never
          // produce rather than testing states the sim cannot reach.
          if (tHot - tCold < MIN_TEMPERATURE_GAP) {
            continue;
          }
          sets.push({ tHot, tCold, compressionRatio, gamma, nMoles: 1 });
        }
      }
    }
  }
  return sets;
};

/** |a − b| / max(|b|, 1) — the right comparison for multi-kilojoule quantities. */
const relativeError = (actual: number, expected: number): number =>
  Math.abs(actual - expected) / Math.max(Math.abs(expected), 1);

describe("corner-point derivation", () => {
  it("places the four corners where the closed form says (default cycle)", () => {
    const geometry = computeCycleGeometry(DEFAULTS);
    const [state1, state2, state3, state4] = geometry.corners;

    // τ = (600/300)^(1/(5/3 − 1)) = 2^1.5 = 2.8284271…
    const tau = 2 ** 1.5;
    const v1 = MINIMUM_VOLUME_M3;

    expect(state1.volume).toBeCloseTo(v1, 12);
    expect(state2.volume).toBeCloseTo(v1 * 2, 12);
    expect(state3.volume).toBeCloseTo(v1 * 2 * tau, 12);
    expect(state4.volume).toBeCloseTo(v1 * tau, 12);

    expect(state1.temperature).toBe(600);
    expect(state2.temperature).toBe(600);
    expect(state3.temperature).toBe(300);
    expect(state4.temperature).toBe(300);

    // P = nRT/V at every corner.
    expect(state1.pressure).toBeCloseTo((GAS_CONSTANT * 600) / v1, 6);
    expect(state3.pressure).toBeCloseTo((GAS_CONSTANT * 300) / (v1 * 2 * tau), 6);
  });

  it("gives both isothermal legs the same volume ratio", () => {
    // This is the structural reason η collapses to 1 − T_c/T_h: V₂/V₁ = V₃/V₄,
    // so the ln-ratio factor cancels out of Q_cold/Q_hot.
    for (const parameters of extremeParameterSets()) {
      const [state1, state2, state3, state4] = computeCycleGeometry(parameters).corners;
      expect(state2.volume / state1.volume).toBeCloseTo(state3.volume / state4.volume, 9);
    }
  });

  it("closes the cycle: both adiabats span τ = (T_h/T_c)^(1/(γ−1))", () => {
    for (const parameters of extremeParameterSets()) {
      const tau = adiabaticVolumeRatio(parameters.tHot, parameters.tCold, parameters.gamma);
      const [state1, state2, state3, state4] = computeCycleGeometry(parameters).corners;
      expect(state3.volume / state2.volume).toBeCloseTo(tau, 6);
      expect(state4.volume / state1.volume).toBeCloseTo(tau, 6);
    }
  });

  it("reports the derived overall volume span as r·τ", () => {
    const geometry = computeCycleGeometry(DEFAULTS);
    const tau = adiabaticVolumeRatio(DEFAULTS.tHot, DEFAULTS.tCold, DEFAULTS.gamma);
    expect(geometry.volumeSpanRatio).toBeCloseTo(DEFAULTS.compressionRatio * tau, 9);
    expect(geometry.volumeRange.max / geometry.volumeRange.min).toBeCloseTo(geometry.volumeSpanRatio, 9);
  });
});

describe("energy totals", () => {
  it("matches hand-computed Q_hot, Q_cold and W for the default cycle", () => {
    const geometry = computeCycleGeometry(DEFAULTS);
    // Q_h = nRT_h·ln r = 1 × 8.314 × 600 × ln 2 = 3457.70… J
    expect(geometry.qHot).toBeCloseTo(GAS_CONSTANT * 600 * Math.LN2, 6);
    expect(geometry.qCold).toBeCloseTo(GAS_CONSTANT * 300 * Math.LN2, 6);
    expect(geometry.work).toBeCloseTo(GAS_CONSTANT * 300 * Math.LN2, 6);
    expect(geometry.efficiency).toBeCloseTo(0.5, 12);
  });

  it("gives the entropy span nR·ln r, so the T–S rectangle's area is the work", () => {
    for (const parameters of extremeParameterSets()) {
      const geometry = computeCycleGeometry(parameters);
      expect(geometry.entropySpan).toBeCloseTo(
        parameters.nMoles * GAS_CONSTANT * Math.log(parameters.compressionRatio),
        9,
      );
      // Rectangle area = ΔS·(T_h − T_c) must equal the net work.
      expect(geometry.entropySpan * (parameters.tHot - parameters.tCold)).toBeCloseTo(geometry.work, 6);
    }
  });

  it("cancels the two adiabatic legs' work exactly", () => {
    for (const parameters of extremeParameterSets()) {
      const geometry = computeCycleGeometry(parameters);
      const expansionWork = integrateLegWork(geometry, CycleStage.ADIABATIC_EXPANSION);
      const compressionWork = integrateLegWork(geometry, CycleStage.ADIABATIC_COMPRESSION);
      // Relative to the size of either leg, not in absolute joules.
      expect(Math.abs(expansionWork + compressionWork)).toBeLessThan(1e-6 * Math.abs(expansionWork));
    }
  });
});

describe("numerical ∮P dV vs. the closed form (spec §6.5)", () => {
  it("agrees across the whole parameter space", () => {
    for (const parameters of extremeParameterSets()) {
      const geometry = computeCycleGeometry(parameters);
      expect(geometry.efficiencyFromPath).toBeCloseTo(geometry.efficiency, 9);
      // Work and heat run to several kJ, so the comparison has to be relative:
      // an absolute tolerance would be testing the size of a joule, not the
      // agreement between the two derivations.
      expect(relativeError(geometry.workFromPath, geometry.work)).toBeLessThan(1e-9);
      expect(relativeError(geometry.qHotFromPath, geometry.qHot)).toBeLessThan(1e-9);
    }
  });

  it("agrees at a sweep of interior points too", () => {
    for (let tHot = T_HOT_RANGE.min; tHot <= T_HOT_RANGE.max; tHot += 50) {
      for (let tCold = T_COLD_RANGE.min; tCold <= Math.min(T_COLD_RANGE.max, tHot - MIN_TEMPERATURE_GAP); tCold += 50) {
        const geometry = computeCycleGeometry({ ...DEFAULTS, tHot, tCold });
        expect(geometry.efficiencyFromPath).toBeCloseTo(1 - tCold / tHot, 9);
      }
    }
  });
});

describe("boundary behaviour", () => {
  it("produces only finite values at the extremes of every range", () => {
    for (const parameters of extremeParameterSets()) {
      const geometry = computeCycleGeometry(parameters);
      for (const corner of geometry.corners) {
        expect(Number.isFinite(corner.volume)).toBe(true);
        expect(Number.isFinite(corner.pressure)).toBe(true);
        expect(Number.isFinite(corner.temperature)).toBe(true);
        expect(Number.isFinite(corner.entropy)).toBe(true);
      }
      for (const value of [geometry.qHot, geometry.qCold, geometry.work, geometry.efficiency, geometry.entropySpan]) {
        expect(Number.isFinite(value)).toBe(true);
      }
      for (const state of sampleCycle(geometry, 8)) {
        expect(Number.isFinite(state.volume)).toBe(true);
        expect(Number.isFinite(state.pressure)).toBe(true);
      }
    }
  });

  it("sanitizes degenerate or non-finite inputs into a solvable cycle", () => {
    const sanitized = sanitizeParameters({
      tHot: Number.NaN,
      tCold: -5,
      compressionRatio: 0.5,
      gamma: 1,
      nMoles: 0,
    });
    expect(sanitized.tCold).toBeGreaterThan(0);
    expect(sanitized.tHot).toBeGreaterThan(sanitized.tCold);
    expect(sanitized.gamma).toBeGreaterThan(1);
    expect(sanitized.compressionRatio).toBeGreaterThan(1);
    expect(sanitized.nMoles).toBeGreaterThan(0);

    const geometry = computeCycleGeometry({
      tHot: Number.POSITIVE_INFINITY,
      tCold: 0,
      compressionRatio: Number.NaN,
      gamma: Number.NaN,
      nMoles: Number.NaN,
    });
    for (const corner of geometry.corners) {
      expect(Number.isFinite(corner.pressure)).toBe(true);
      expect(Number.isFinite(corner.volume)).toBe(true);
    }
  });
});

describe("leg parametrization", () => {
  it("starts and ends each leg exactly on its corner states", () => {
    const geometry = computeCycleGeometry(DEFAULTS);
    const corners = geometry.corners;
    CYCLE_STAGE_ORDER.forEach((stage, index) => {
      const start = corners[index];
      const end = corners[(index + 1) % corners.length];
      expect(start).toBeDefined();
      expect(end).toBeDefined();
      if (!(start && end)) {
        return;
      }
      expect(stateAt(geometry, stage, 0).volume).toBeCloseTo(start.volume, 12);
      expect(stateAt(geometry, stage, 1).volume).toBeCloseTo(end.volume, 9);
      expect(stateAt(geometry, stage, 0).pressure).toBeCloseTo(start.pressure, 6);
      expect(stateAt(geometry, stage, 1).pressure).toBeCloseTo(end.pressure, 4);
    });
  });

  it("holds entropy constant along both adiabats", () => {
    const geometry = computeCycleGeometry(DEFAULTS);
    for (const stage of [CycleStage.ADIABATIC_EXPANSION, CycleStage.ADIABATIC_COMPRESSION]) {
      const entropies = [0, 0.25, 0.5, 0.75, 1].map((p) => stateAt(geometry, stage, p).entropy);
      for (const entropy of entropies) {
        expect(entropy).toBeCloseTo(entropies[0] ?? 0, 12);
      }
    }
  });

  it("holds temperature constant along both isotherms", () => {
    const geometry = computeCycleGeometry(DEFAULTS);
    for (const [stage, temperature] of [
      [CycleStage.ISOTHERMAL_EXPANSION, DEFAULTS.tHot],
      [CycleStage.ISOTHERMAL_COMPRESSION, DEFAULTS.tCold],
    ] as const) {
      for (const p of [0, 0.3, 0.7, 1]) {
        expect(stateAt(geometry, stage, p).temperature).toBeCloseTo(temperature, 12);
      }
    }
  });

  it("clamps out-of-range progress instead of extrapolating off the leg", () => {
    const geometry = computeCycleGeometry(DEFAULTS);
    expect(stateAt(geometry, CycleStage.ISOTHERMAL_EXPANSION, -3).volume).toBeCloseTo(geometry.corners[0].volume, 12);
    expect(stateAt(geometry, CycleStage.ISOTHERMAL_EXPANSION, 7).volume).toBeCloseTo(geometry.corners[1].volume, 12);
    expect(Number.isFinite(stateAt(geometry, CycleStage.ADIABATIC_EXPANSION, Number.NaN).volume)).toBe(true);
  });
});
