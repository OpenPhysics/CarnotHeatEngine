/**
 * StageStepperNode.ts
 *
 * The discrete stage stepper: ⏮ ◀ ▶ ⏭ over the four legs of the cycle.
 *
 * This is the pedagogically load-bearing control on the Intro screen. Watching
 * the playhead loop continuously does not teach the leg *order* — students end
 * up with four curves and no sequence. Stepping one leg at a time, with the
 * apparatus and the diagram moving together, does.
 *
 * The buttons drive the model's stage stepper directly, so "next" always
 * advances exactly one leg in the current traversal direction and wraps at the
 * cycle boundary. On the Reversed Cycle screen "next" therefore moves the
 * playhead counter-clockwise, which is the correct meaning of "next leg" there.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { HBox, type NodeOptions, Path } from "scenerystack/scenery";
import { RectangularPushButton } from "scenerystack/sun";
import CarnotHeatEngineColors from "../../CarnotHeatEngineColors.js";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS } from "../CarnotHeatEngineButtonOptions.js";
import type { CarnotCycleModel } from "../model/CarnotCycleModel.js";

/** Size of the triangle/bar glyphs, px. */
const GLYPH_SIZE = 11;

/**
 * Localized accessible names for the four buttons. A screen's
 * `a11y.<screen>.controls` group satisfies this structurally, so callers just
 * hand over their own group.
 */
export type StageStepperA11yStrings = {
  readonly firstStageStringProperty: TReadOnlyProperty<string>;
  readonly previousStageStringProperty: TReadOnlyProperty<string>;
  readonly nextStageStringProperty: TReadOnlyProperty<string>;
  readonly lastStageStringProperty: TReadOnlyProperty<string>;
};

export class StageStepperNode extends HBox {
  /** The four buttons in tab order, for the ScreenView's pdomOrder. */
  public readonly controlsInOrder: RectangularPushButton[];

  public constructor(cycle: CarnotCycleModel, a11y: StageStepperA11yStrings, options?: NodeOptions) {
    const firstButton = createStepperButton(
      firstGlyph(),
      () => cycle.rewindToCycleStart(),
      a11y.firstStageStringProperty,
    );
    const previousButton = createStepperButton(
      previousGlyph(),
      () => cycle.stepToPreviousStage(),
      a11y.previousStageStringProperty,
    );
    const nextButton = createStepperButton(nextGlyph(), () => cycle.stepToNextStage(), a11y.nextStageStringProperty);
    const lastButton = createStepperButton(lastGlyph(), () => cycle.jumpToLastStage(), a11y.lastStageStringProperty);

    super({
      children: [firstButton, previousButton, nextButton, lastButton],
      spacing: 6,
      ...options,
    });

    this.controlsInOrder = [firstButton, previousButton, nextButton, lastButton];
  }
}

const createStepperButton = (
  glyph: Shape,
  listener: () => void,
  accessibleName: TReadOnlyProperty<string>,
): RectangularPushButton =>
  new RectangularPushButton({
    ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
    content: new Path(glyph, { fill: CarnotHeatEngineColors.controlSurfaceTextColorProperty }),
    baseColor: CarnotHeatEngineColors.controlSurfaceColorProperty,
    xMargin: 8,
    yMargin: 6,
    listener,
    accessibleName,
  });

/** ▶ — a right-pointing triangle. */
const nextGlyph = (): Shape =>
  new Shape()
    .moveTo(0, 0)
    .lineTo(GLYPH_SIZE, GLYPH_SIZE / 2)
    .lineTo(0, GLYPH_SIZE)
    .close();

/** ◀ — a left-pointing triangle. */
const previousGlyph = (): Shape =>
  new Shape()
    .moveTo(GLYPH_SIZE, 0)
    .lineTo(0, GLYPH_SIZE / 2)
    .lineTo(GLYPH_SIZE, GLYPH_SIZE)
    .close();

/** ⏮ — a left-pointing triangle against a bar. */
const firstGlyph = (): Shape =>
  previousGlyph().moveTo(-3, 0).lineTo(-3, GLYPH_SIZE).lineTo(-0.5, GLYPH_SIZE).lineTo(-0.5, 0).close();

/** ⏭ — a right-pointing triangle against a bar. */
const lastGlyph = (): Shape =>
  nextGlyph()
    .moveTo(GLYPH_SIZE + 0.5, 0)
    .lineTo(GLYPH_SIZE + 0.5, GLYPH_SIZE)
    .lineTo(GLYPH_SIZE + 3, GLYPH_SIZE)
    .lineTo(GLYPH_SIZE + 3, 0)
    .close();
