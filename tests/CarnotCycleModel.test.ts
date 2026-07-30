/**
 * Unit tests for {@link CarnotCycleModel} — the Property layer over the cycle
 * maths: the temperature clamp, the stage stepper, the playhead, and the
 * direction-aware process naming.
 *
 * The stage-stepper tests are the ones with teeth. "Next" is the control the
 * Intro screen leans on to teach the leg order, so a stepper that skipped a leg
 * or wrapped the wrong way would quietly teach the wrong sequence.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  COMPRESSION_RATIO_RANGE,
  MIN_TEMPERATURE_GAP,
  STAGE_DURATION_S,
  T_COLD_RANGE,
  T_HOT_RANGE,
} from "../src/CarnotHeatEngineConstants.js";
import { CarnotCycleModel, efficiencyAgrees } from "../src/common/model/CarnotCycleModel.js";
import { CycleDirection } from "../src/common/model/CycleDirection.js";
import { CycleProcess, CycleStage } from "../src/common/model/CycleStage.js";
import { GammaPreset } from "../src/common/model/GammaPreset.js";

describe("temperature clamping", () => {
  let model: CarnotCycleModel;
  beforeEach(() => {
    model = new CarnotCycleModel();
  });

  it("pushes T_cold down when T_hot is dragged into it", () => {
    model.tColdProperty.value = 500;
    model.tHotProperty.value = T_HOT_RANGE.min;
    expect(model.tHotProperty.value - model.tColdProperty.value).toBeGreaterThanOrEqual(MIN_TEMPERATURE_GAP);
  });

  it("pushes T_hot up when T_cold is dragged into it", () => {
    model.tHotProperty.value = 450;
    model.tColdProperty.value = T_COLD_RANGE.max;
    expect(model.tHotProperty.value - model.tColdProperty.value).toBeGreaterThanOrEqual(MIN_TEMPERATURE_GAP);
  });

  it("keeps the gap across a sweep of the whole T_cold range", () => {
    for (let tCold = T_COLD_RANGE.min; tCold <= T_COLD_RANGE.max; tCold += 10) {
      model.tColdProperty.value = tCold;
      expect(model.tHotProperty.value - model.tColdProperty.value).toBeGreaterThanOrEqual(MIN_TEMPERATURE_GAP);
    }
  });

  it("keeps the gap across a sweep of the whole T_hot range", () => {
    for (let tHot = T_HOT_RANGE.max; tHot >= T_HOT_RANGE.min; tHot -= 10) {
      model.tHotProperty.value = tHot;
      expect(model.tHotProperty.value - model.tColdProperty.value).toBeGreaterThanOrEqual(MIN_TEMPERATURE_GAP);
    }
  });
});

describe("stage stepper", () => {
  it("advances one leg at a time and wraps, running as an engine", () => {
    const model = new CarnotCycleModel(CycleDirection.ENGINE);
    const visited: CycleStage[] = [model.cycleStageProperty.value];
    for (let step = 0; step < 4; step++) {
      model.stepToNextStage();
      visited.push(model.cycleStageProperty.value);
    }
    expect(visited).toEqual([
      CycleStage.ISOTHERMAL_EXPANSION,
      CycleStage.ADIABATIC_EXPANSION,
      CycleStage.ISOTHERMAL_COMPRESSION,
      CycleStage.ADIABATIC_COMPRESSION,
      CycleStage.ISOTHERMAL_EXPANSION,
    ]);
  });

  it("advances one leg at a time and wraps, running as a refrigerator", () => {
    const model = new CarnotCycleModel(CycleDirection.REFRIGERATOR);
    const visited: CycleStage[] = [model.cycleStageProperty.value];
    for (let step = 0; step < 4; step++) {
      model.stepToNextStage();
      visited.push(model.cycleStageProperty.value);
    }
    expect(visited).toEqual([
      CycleStage.ISOTHERMAL_EXPANSION,
      CycleStage.ADIABATIC_COMPRESSION,
      CycleStage.ISOTHERMAL_COMPRESSION,
      CycleStage.ADIABATIC_EXPANSION,
      CycleStage.ISOTHERMAL_EXPANSION,
    ]);
  });

  it("makes previous the exact inverse of next, in both directions", () => {
    for (const direction of [CycleDirection.ENGINE, CycleDirection.REFRIGERATOR]) {
      const model = new CarnotCycleModel(direction);
      for (let step = 0; step < 9; step++) {
        const before = model.cycleStageProperty.value;
        model.stepToNextStage();
        model.stepToPreviousStage();
        expect(model.cycleStageProperty.value).toBe(before);
      }
    }
  });

  it("visits all four legs in any four consecutive steps", () => {
    for (const direction of [CycleDirection.ENGINE, CycleDirection.REFRIGERATOR]) {
      const model = new CarnotCycleModel(direction);
      const visited = new Set<CycleStage>();
      for (let step = 0; step < 4; step++) {
        visited.add(model.cycleStageProperty.value);
        model.stepToNextStage();
      }
      expect(visited.size).toBe(4);
    }
  });

  it("parks the playhead at the leg's own start corner for the direction", () => {
    const engine = new CarnotCycleModel(CycleDirection.ENGINE);
    engine.stepToNextStage();
    expect(engine.stageProgressProperty.value).toBe(0);

    const refrigerator = new CarnotCycleModel(CycleDirection.REFRIGERATOR);
    refrigerator.stepToNextStage();
    expect(refrigerator.stageProgressProperty.value).toBe(1);
  });

  it("sends rewind to the first leg and jump to the last one", () => {
    const model = new CarnotCycleModel();
    model.stepToNextStage();
    model.stepToNextStage();
    model.rewindToCycleStart();
    expect(model.cycleStageProperty.value).toBe(CycleStage.ISOTHERMAL_EXPANSION);

    model.jumpToLastStage();
    expect(model.cycleStageProperty.value).toBe(CycleStage.ADIABATIC_COMPRESSION);

    const refrigerator = new CarnotCycleModel(CycleDirection.REFRIGERATOR);
    refrigerator.jumpToLastStage();
    expect(refrigerator.cycleStageProperty.value).toBe(CycleStage.ADIABATIC_EXPANSION);
  });
});

describe("continuous stepping", () => {
  it("completes one leg per STAGE_DURATION_S at unit speed", () => {
    const model = new CarnotCycleModel();
    model.step(STAGE_DURATION_S);
    expect(model.cycleStageProperty.value).toBe(CycleStage.ADIABATIC_EXPANSION);
    expect(model.stageProgressProperty.value).toBeCloseTo(0, 9);
  });

  it("returns to the starting leg after four leg-durations", () => {
    const model = new CarnotCycleModel();
    for (let leg = 0; leg < 4; leg++) {
      model.step(STAGE_DURATION_S);
    }
    expect(model.cycleStageProperty.value).toBe(CycleStage.ISOTHERMAL_EXPANSION);
  });

  it("walks legs one at a time even across an enormous dt", () => {
    // A tab regaining focus can deliver a multi-second dt; the playhead must
    // land somewhere valid rather than run off the end of the parametrization.
    const model = new CarnotCycleModel();
    model.step(37 * STAGE_DURATION_S + 0.5);
    expect(model.stageProgressProperty.value).toBeGreaterThanOrEqual(0);
    expect(model.stageProgressProperty.value).toBeLessThanOrEqual(1);
    expect(Number.isFinite(model.pressureProperty.value)).toBe(true);
  });

  it("runs the legs backwards as a refrigerator", () => {
    const model = new CarnotCycleModel(CycleDirection.REFRIGERATOR);
    model.step(STAGE_DURATION_S);
    expect(model.cycleStageProperty.value).toBe(CycleStage.ADIABATIC_COMPRESSION);
  });

  it("ignores a zero or non-finite dt", () => {
    const model = new CarnotCycleModel();
    model.step(0);
    model.step(Number.NaN);
    expect(model.cycleStageProperty.value).toBe(CycleStage.ISOTHERMAL_EXPANSION);
    expect(model.stageProgressProperty.value).toBe(0);
  });
});

describe("direction-aware process naming", () => {
  it("names the hot isothermal leg an expansion for an engine", () => {
    const model = new CarnotCycleModel(CycleDirection.ENGINE);
    model.cycleStageProperty.value = CycleStage.ISOTHERMAL_EXPANSION;
    expect(model.processProperty.value).toBe(CycleProcess.ISOTHERMAL_EXPANSION_HOT);
  });

  it("names the same leg a compression for a refrigerator", () => {
    const model = new CarnotCycleModel(CycleDirection.REFRIGERATOR);
    model.cycleStageProperty.value = CycleStage.ISOTHERMAL_EXPANSION;
    expect(model.processProperty.value).toBe(CycleProcess.ISOTHERMAL_COMPRESSION_HOT);
  });

  it("turns the cold isothermal leg into the refrigeration effect when reversed", () => {
    const model = new CarnotCycleModel(CycleDirection.REFRIGERATOR);
    model.cycleStageProperty.value = CycleStage.ISOTHERMAL_COMPRESSION;
    expect(model.processProperty.value).toBe(CycleProcess.ISOTHERMAL_EXPANSION_COLD);
  });
});

describe("derived quantities", () => {
  it("keeps the integrated and closed-form efficiencies in agreement (spec §6.5)", () => {
    const model = new CarnotCycleModel();
    for (const gamma of [GammaPreset.MONATOMIC, GammaPreset.DIATOMIC]) {
      model.gammaPresetProperty.value = gamma;
      for (const ratio of [COMPRESSION_RATIO_RANGE.min, 4, COMPRESSION_RATIO_RANGE.max]) {
        model.compressionRatioProperty.value = ratio;
        for (const tHot of [T_HOT_RANGE.min, 600, T_HOT_RANGE.max]) {
          model.tHotProperty.value = tHot;
          for (const tCold of [T_COLD_RANGE.min, 300]) {
            model.tColdProperty.value = tCold;
            expect(model.efficiencyAgreesProperty.value).toBe(true);
            expect(efficiencyAgrees(model.geometryProperty.value)).toBe(true);
          }
        }
      }
    }
  });

  it("computes the two coefficients of performance", () => {
    const model = new CarnotCycleModel(CycleDirection.REFRIGERATOR);
    model.tHotProperty.value = 600;
    model.tColdProperty.value = 300;
    expect(model.coolingCopProperty.value).toBeCloseTo(1, 9);
    expect(model.heatingCopProperty.value).toBeCloseTo(2, 9);
    // COP_heating = COP_cooling + 1 always — the work shows up in both.
    expect(model.heatingCopProperty.value - model.coolingCopProperty.value).toBeCloseTo(1, 9);
  });

  it("exposes C_v = R/(γ − 1) for the selected gas", () => {
    const model = new CarnotCycleModel();
    model.gammaPresetProperty.value = GammaPreset.MONATOMIC;
    expect(model.molarHeatCapacityV).toBeCloseTo(1.5 * 8.314, 9);
    model.gammaPresetProperty.value = GammaPreset.DIATOMIC;
    expect(model.molarHeatCapacityV).toBeCloseTo(2.5 * 8.314, 9);
  });
});

describe("γ change mid-leg", () => {
  it("snaps the playhead to the start of the current leg rather than interpolating", () => {
    // Three of the four corner points move when γ changes; interpolating across
    // that discontinuity would put the playhead somewhere off the cycle.
    const model = new CarnotCycleModel();
    model.step(STAGE_DURATION_S * 0.4);
    expect(model.stageProgressProperty.value).toBeGreaterThan(0);

    const stageBefore = model.cycleStageProperty.value;
    model.gammaPresetProperty.value = GammaPreset.DIATOMIC;
    expect(model.cycleStageProperty.value).toBe(stageBefore);
    expect(model.stageProgressProperty.value).toBe(0);
  });
});

describe("reset", () => {
  it("restores every input, including the screen's own direction", () => {
    const model = new CarnotCycleModel(CycleDirection.REFRIGERATOR);
    model.tHotProperty.value = 750;
    model.tColdProperty.value = 220;
    model.compressionRatioProperty.value = 6;
    model.gammaPresetProperty.value = GammaPreset.DIATOMIC;
    model.stepToNextStage();

    model.reset();

    expect(model.tHotProperty.value).toBe(model.tHotProperty.initialValue);
    expect(model.tColdProperty.value).toBe(model.tColdProperty.initialValue);
    expect(model.compressionRatioProperty.value).toBe(model.compressionRatioProperty.initialValue);
    expect(model.gammaPresetProperty.value).toBe(GammaPreset.MONATOMIC);
    expect(model.cycleStageProperty.value).toBe(CycleStage.ISOTHERMAL_EXPANSION);
    // Reset must not silently turn the refrigerator back into an engine.
    expect(model.directionProperty.value).toBe(CycleDirection.REFRIGERATOR);
  });
});
