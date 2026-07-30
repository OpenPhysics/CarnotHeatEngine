/**
 * Fleet-standard memory-leak regression suite (SceneryStackTemplate / QubitSketch pattern).
 *
 * Creates a disposable model object inside a function boundary, disposes it, forces
 * garbage collection via global.gc (--expose-gc in vitest.config.ts), then asserts via
 * WeakRef that the object was collected. V8 requires a function boundary (not merely
 * a block scope) so local strong references die when the helper returns.
 */

import { describe, expect, it } from "vitest";
import { GHOST_SETTLE_TIME_S } from "../src/CarnotHeatEngineConstants.js";
import { CarnotCycleModel } from "../src/common/model/CarnotCycleModel.js";
import { GammaPreset } from "../src/common/model/GammaPreset.js";
import { TimeModel } from "../src/common/TimeModel.js";
import { EfficiencyLabModel } from "../src/efficiency-lab/model/EfficiencyLabModel.js";
import { IntroModel } from "../src/intro/model/IntroModel.js";
import { CopFraming } from "../src/reversed-cycle/model/CopFraming.js";
import { ReversedCycleModel } from "../src/reversed-cycle/model/ReversedCycleModel.js";

/**
 * Force garbage collection with multiple passes. When `earlyExitRef` is supplied
 * the loop bails as soon as the object is confirmed collected. The setTimeout(0)
 * yield after a live deref() avoids the WeakRef macrotask-liveness pin.
 */
async function forceGC(earlyExitRef?: WeakRef<object>): Promise<void> {
  for (let i = 0; i < 15; i++) {
    globalThis.gc?.();
    await new Promise<void>((r) => setTimeout(r, 50));
    if (earlyExitRef !== undefined && earlyExitRef.deref() === undefined) {
      return;
    }
    if (earlyExitRef !== undefined) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
}

function createAndDisposeTimeModel(): WeakRef<object> {
  const model = new TimeModel();
  const ref = new WeakRef<object>(model);
  model.dispose();
  return ref;
}

// The cycle model's lazyLinks (temperature clamp, γ-snap, the η cross-check)
// capture `this`; dispose must release them or the model stays pinned.
function createAndDisposeCarnotCycleModel(): WeakRef<object> {
  const model = new CarnotCycleModel();
  model.tHotProperty.value = 750; // fire the temperature-clamp lazyLinks
  model.gammaPresetProperty.value = GammaPreset.DIATOMIC; // fire the γ-snap lazyLink
  model.stepToNextStage();
  const ref = new WeakRef<object>(model);
  model.dispose();
  return ref;
}

function createAndDisposeIntroModel(): WeakRef<object> {
  const model = new IntroModel();
  const ref = new WeakRef<object>(model);
  model.dispose();
  return ref;
}

// The ghost-cycle machinery registers lazyLinks on cycle.geometryProperty that
// capture the model; exercise that path before disposing so the regression
// actually covers it.
function createAndDisposeEfficiencyLabModel(): WeakRef<object> {
  const model = new EfficiencyLabModel();
  model.cycle.tHotProperty.value = 700; // trigger geometry change -> ghost capture + reveal-clear
  model.step(GHOST_SETTLE_TIME_S + 1); // settle the pending ghost into the property
  model.revealEfficiency();
  const ref = new WeakRef<object>(model);
  model.dispose();
  return ref;
}

function createAndDisposeReversedCycleModel(): WeakRef<object> {
  const model = new ReversedCycleModel();
  model.framingProperty.value = CopFraming.HEATING; // exercise the framing-derived path
  const ref = new WeakRef<object>(model);
  model.dispose();
  return ref;
}

describe("Memory leak regression", () => {
  it("global.gc is available (--expose-gc)", () => {
    expect(globalThis.gc).toBeDefined();
  });

  it("sanity: plain object is collected", async () => {
    const ref = (() => new WeakRef({ hello: "world" }))();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("TimeModel is collected after dispose", async () => {
    const ref = createAndDisposeTimeModel();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("CarnotCycleModel is collected after dispose", async () => {
    const ref = createAndDisposeCarnotCycleModel();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("IntroModel is collected after dispose", async () => {
    const ref = createAndDisposeIntroModel();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("EfficiencyLabModel is collected after dispose (ghost machinery exercised)", async () => {
    const ref = createAndDisposeEfficiencyLabModel();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("ReversedCycleModel is collected after dispose", async () => {
    const ref = createAndDisposeReversedCycleModel();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("double dispose() does not throw on the composed models", () => {
    const timer = new TimeModel();
    timer.dispose();
    expect(() => timer.dispose()).not.toThrow();

    const intro = new IntroModel();
    intro.dispose();
    expect(() => intro.dispose()).not.toThrow();

    const lab = new EfficiencyLabModel();
    lab.dispose();
    expect(() => lab.dispose()).not.toThrow();

    const reversed = new ReversedCycleModel();
    reversed.dispose();
    expect(() => reversed.dispose()).not.toThrow();

    const cycle = new CarnotCycleModel();
    cycle.dispose();
    expect(() => cycle.dispose()).not.toThrow();
  });

  it("repeated create/dispose cycles leave no survivors", async () => {
    const refs: WeakRef<object>[] = [];
    for (let i = 0; i < 10; i++) {
      refs.push(createAndDisposeTimeModel());
    }
    await forceGC();
    const survivors = refs.filter((r) => r.deref() !== undefined).length;
    expect(survivors).toBe(0);
  });
});
