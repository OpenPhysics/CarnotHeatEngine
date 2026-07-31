/**
 * EfficiencyLabModel.ts
 *
 * Model for the Efficiency Lab screen: the same {@link CarnotCycleModel} the
 * Intro screen uses, plus the quantitative-exploration state that only this
 * screen needs —
 *
 *  - a *ghost* of the previous cycle, so changing a parameter shows the before
 *    and after paths side by side rather than just replacing one with the other;
 *  - which auxiliary panels are showing (T–S diagram, Carnot-limit inset);
 *  - Explore vs. Measure mode and the student's own η answer.
 */
import {
  BooleanProperty,
  DerivedProperty,
  EnumerationProperty,
  NumberProperty,
  Property,
  type TReadOnlyProperty,
} from "scenerystack/axon";
import type { TModel } from "scenerystack/joist";
import {
  EFFICIENCY_ENTRY_RANGE_PERCENT,
  GHOST_SETTLE_TIME_S,
  MEASURE_TOLERANCE_PERCENT,
} from "../../CarnotHeatEngineConstants.js";
import { CarnotCycleModel } from "../../common/model/CarnotCycleModel.js";
import type { CycleGeometry } from "../../common/model/carnotCycleGeometry.js";
import { TimeModel } from "../../common/TimeModel.js";
import { LabMode } from "./LabMode.js";

export class EfficiencyLabModel implements TModel {
  /** The Carnot cycle itself — corner points, playhead, and energy totals. */
  public readonly cycle = new CarnotCycleModel();

  /** Play/pause plus the 0.25×–2× speed setting. */
  public readonly timer = new TimeModel();

  /**
   * The cycle as it was before the most recent parameter change, drawn ghosted
   * under the live path. Null until the first change.
   */
  public readonly ghostGeometryProperty: Property<CycleGeometry | null>;

  /** Whether the ghosted previous-cycle overlay is drawn at all. */
  public readonly showGhostProperty = new BooleanProperty(true);

  /** Whether the T–S panel (where a Carnot cycle is a rectangle) is showing. */
  public readonly showEntropyDiagramProperty = new BooleanProperty(false);

  /** Whether the "η vs. T_cold at this T_hot" reference inset is showing. */
  public readonly showCarnotLimitProperty = new BooleanProperty(false);

  /** Explore (everything live) vs. Measure (η withheld until checked). */
  public readonly modeProperty = new EnumerationProperty(LabMode.EXPLORE);

  /** The student's own η answer in Measure mode, as a percentage. */
  public readonly enteredEfficiencyPercentProperty = new NumberProperty(50, {
    range: EFFICIENCY_ENTRY_RANGE_PERCENT,
  });

  /** Whether the student has pressed Check and the real η is now visible. */
  public readonly isEfficiencyRevealedProperty = new BooleanProperty(false);

  /** Whether η is currently visible: always in Explore, only after Check in Measure. */
  public readonly isEfficiencyVisibleProperty: TReadOnlyProperty<boolean>;

  /** Whether the submitted answer is within MEASURE_TOLERANCE_PERCENT of the truth. */
  public readonly isAnswerCorrectProperty: TReadOnlyProperty<boolean>;

  /**
   * The geometry in place before the current run of parameter changes started.
   * Promoted to {@link ghostGeometryProperty} once the parameters settle — see
   * {@link step}.
   */
  private pendingGhostGeometry: CycleGeometry | null = null;

  /** Whether a run of parameter changes is in progress (see {@link step}). */
  private isSettlingGhost = false;

  /** Seconds since the last parameter change, while settling. */
  private ghostIdleTime = 0;

  public constructor() {
    // A DerivedProperty hands its listeners the previous value, so the ghost is
    // free to capture. Publishing it immediately would make it track one frame
    // behind a slider drag, though, which compares nothing useful — so the
    // capture is held until the parameters stop moving (see step()).
    this.ghostGeometryProperty = new Property<CycleGeometry | null>(null);
    this.cycle.geometryProperty.lazyLink((_geometry, previousGeometry) => {
      if (!this.isSettlingGhost) {
        this.pendingGhostGeometry = previousGeometry;
        this.isSettlingGhost = true;
      }
      this.ghostIdleTime = 0;
    });

    // Changing a parameter invalidates a submitted answer — otherwise a student
    // could reveal once and then drag the sliders with η permanently exposed.
    this.cycle.geometryProperty.lazyLink(() => {
      this.isEfficiencyRevealedProperty.value = false;
    });
    this.modeProperty.lazyLink(() => {
      this.isEfficiencyRevealedProperty.value = false;
    });

    this.isEfficiencyVisibleProperty = new DerivedProperty(
      [this.modeProperty, this.isEfficiencyRevealedProperty],
      (mode, revealed) => mode === LabMode.EXPLORE || revealed,
    );

    this.isAnswerCorrectProperty = new DerivedProperty(
      [this.enteredEfficiencyPercentProperty, this.cycle.efficiencyProperty],
      (enteredPercent, efficiency) => Math.abs(enteredPercent - efficiency * 100) <= MEASURE_TOLERANCE_PERCENT,
    );
  }

  /** Submit the student's answer and reveal the true η alongside it. */
  public revealEfficiency(): void {
    this.isEfficiencyRevealedProperty.value = true;
  }

  /** Discard the ghosted previous-cycle path. */
  public clearGhost(): void {
    this.ghostGeometryProperty.value = null;
    this.pendingGhostGeometry = null;
    this.isSettlingGhost = false;
  }

  /**
   * Called every frame whether or not the clock is running, so the ghost settles
   * on its own even with the animation paused.
   */
  public step(dt: number): void {
    this.timer.step(dt);
    this.cycle.step(this.timer.scaledDt(dt));

    if (this.isSettlingGhost) {
      this.ghostIdleTime += dt;
      if (this.ghostIdleTime >= GHOST_SETTLE_TIME_S) {
        this.ghostGeometryProperty.value = this.pendingGhostGeometry;
        this.pendingGhostGeometry = null;
        this.isSettlingGhost = false;
      }
    }
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
    // After cycle.reset(): resetting the parameters fires the ghost capture, so
    // clearing has to come last or Reset All would leave a ghost behind.
    this.clearGhost();
    this.showGhostProperty.reset();
    this.showEntropyDiagramProperty.reset();
    this.showCarnotLimitProperty.reset();
    this.modeProperty.reset();
    this.enteredEfficiencyPercentProperty.reset();
    this.isEfficiencyRevealedProperty.reset();
  }

  /**
   * Dispose every owned Property so the ghost-cycle machinery — whose lazyLinks
   * on `cycle.geometryProperty` capture `this` — releases the model for
   * collection. See {@link tests/memory-leak.test.ts}. Derived properties go
   * first, then screen state, then the composed cycle and timer (which removes
   * the geometryProperty listeners this model registered).
   *
   * Guarded so double-dispose is a no-op (DerivedProperty.dispose is not idempotent).
   */
  private disposed = false;
  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    // Derived
    this.isAnswerCorrectProperty.dispose();
    this.isEfficiencyVisibleProperty.dispose();
    // Screen-specific state
    this.isEfficiencyRevealedProperty.dispose();
    this.enteredEfficiencyPercentProperty.dispose();
    this.modeProperty.dispose();
    this.showCarnotLimitProperty.dispose();
    this.showEntropyDiagramProperty.dispose();
    this.showGhostProperty.dispose();
    this.ghostGeometryProperty.dispose();
    // Composed models (releases the geometryProperty lazyLinks capturing `this`)
    this.cycle.dispose();
    this.timer.dispose();
  }
}
