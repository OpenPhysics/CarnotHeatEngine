/**
 * IntroModel.ts
 *
 * Model for the Intro screen, where the PV diagram is anchored to a physical
 * piston-cylinder so the cycle stops being four disconnected curves.
 *
 * It composes a {@link CarnotCycleModel} (engine direction) and a
 * {@link TimeModel} for play/pause and speed, and adds nothing else: none of the
 * physics is screen-specific. The discrete stage stepper the view drives calls
 * straight through to the cycle model.
 */
import type { TModel } from "scenerystack/joist";
import { CarnotCycleModel } from "../../common/model/CarnotCycleModel.js";
import { TimeModel } from "../../common/TimeModel.js";

export class IntroModel implements TModel {
  /** The Carnot cycle itself — corner points, playhead, and energy totals. */
  public readonly cycle = new CarnotCycleModel();

  /** Play/pause plus the 0.25×–2× speed setting. */
  public readonly timer = new TimeModel();

  /**
   * Advance the playhead around the cycle. The clock and the cycle share one
   * speed setting, so a paused sim yields dt = 0 and the playhead holds still.
   */
  public step(dt: number): void {
    this.timer.step(dt);
    this.cycle.step(this.timer.scaledDt(dt));
  }

  /** Advance one frame while paused — what the step-forward button needs. */
  public stepForward(dt: number): void {
    this.timer.stepForward(dt);
    this.cycle.step(dt);
  }

  public reset(): void {
    this.cycle.reset();
    this.timer.reset();
  }

  /**
   * Dispose the composed models so AXON listeners are freed. Honors the contract
   * documented on {@link TimeModel.dispose} — see {@link tests/memory-leak.test.ts}.
   */
  public dispose(): void {
    this.cycle.dispose();
    this.timer.dispose();
  }
}
