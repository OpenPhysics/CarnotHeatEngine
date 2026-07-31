/**
 * ReversedCycleModel.ts
 *
 * Model for the Reversed Cycle screen. It is the *same* {@link CarnotCycleModel}
 * the other two screens use, constructed in REFRIGERATOR direction: identical
 * corner points, identical Q_hot / Q_cold / W, only the traversal reversed. The
 * screen-specific state is just which coefficient of performance is being framed
 * as the useful output.
 */
import { DerivedProperty, EnumerationProperty, type TReadOnlyProperty } from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import { CarnotCycleModel } from "../../common/model/CarnotCycleModel.js";
import { CycleDirection } from "../../common/model/CycleDirection.js";
import { TimeModel } from "../../common/TimeModel.js";
import { CopFraming } from "./CopFraming.js";

export class ReversedCycleModel implements TModel {
  /** The Carnot cycle, run counter-clockwise: work in, heat pumped cold → hot. */
  public readonly cycle = new CarnotCycleModel(CycleDirection.REFRIGERATOR);

  /** Play/pause plus the 0.25×–2× speed setting. */
  public readonly timer = new TimeModel();

  /** Refrigerator (cooling) or heat-pump (heating) framing. */
  public readonly framingProperty = new EnumerationProperty(CopFraming.COOLING);

  /** The coefficient of performance for the current framing. */
  public readonly copProperty: TReadOnlyProperty<number>;

  /**
   * The heat flow the current framing treats as the useful output, J:
   * Q_cold when cooling, Q_hot when heating.
   */
  public readonly usefulHeatProperty: TReadOnlyProperty<number>;

  public constructor() {
    this.copProperty = new DerivedProperty(
      [this.framingProperty, this.cycle.coolingCopProperty, this.cycle.heatingCopProperty],
      (framing, coolingCop, heatingCop) => (framing === CopFraming.COOLING ? coolingCop : heatingCop),
    );
    this.usefulHeatProperty = new DerivedProperty(
      [this.framingProperty, this.cycle.qColdProperty, this.cycle.qHotProperty],
      (framing, qCold, qHot) => (framing === CopFraming.COOLING ? qCold : qHot),
    );
  }

  public step(dt: number): void {
    this.timer.step(dt);
    this.cycle.step(this.timer.scaledDt(dt));
  }

  /** Advance one frame while paused — what the step-forward button needs. */
  public stepForward(dt: number): void {
    this.timer.stepForward(dt);
    this.cycle.step(dt);
  }

  /** Rewind one frame while paused — what the step-backward button needs. */
  public stepBackward(dt: number): void {
    this.timer.stepBackward(dt);
    this.cycle.step(-dt);
  }

  public reset(): void {
    this.cycle.reset();
    this.timer.reset();
    this.framingProperty.reset();
  }

  /**
   * Dispose every owned Property so AXON listeners are freed. Derived properties
   * go first, then the framing state, then the composed cycle and timer.
   * Guarded so double-dispose is a no-op (DerivedProperty.dispose is not
   * idempotent). See {@link tests/memory-leak.test.ts}.
   */
  private disposed = false;
  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    // Derived
    this.copProperty.dispose();
    this.usefulHeatProperty.dispose();
    // Screen-specific state
    this.framingProperty.dispose();
    // Composed models
    this.cycle.dispose();
    this.timer.dispose();
  }
}
