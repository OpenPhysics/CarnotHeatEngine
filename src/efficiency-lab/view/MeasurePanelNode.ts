/**
 * MeasurePanelNode.ts
 *
 * The Measure-mode self-check: a slider for the student's own η, a Check button,
 * and the verdict.
 *
 * It lives in its own panel rather than inside {@link EfficiencyPanelNode} so
 * that switching modes does not change the height of the energy-budget panel and
 * shove the rest of the screen around. It is only visible in Measure mode.
 *
 * Pressing Check reveals the true η in the energy panel alongside the student's
 * answer. The reveal is invalidated by any parameter change (see
 * {@link EfficiencyLabModel}), so the mode cannot be turned into a permanent
 * readout by revealing once and then dragging the sliders.
 */

import { DerivedProperty } from "scenerystack/axon";
import { type Node, RichText, VBox } from "scenerystack/scenery";
import { RectangularPushButton } from "scenerystack/sun";
import CarnotHeatEngineColors from "../../CarnotHeatEngineColors.js";
import { EFFICIENCY_ENTRY_RANGE_PERCENT, READOUT_FONT } from "../../CarnotHeatEngineConstants.js";
import {
  FLAT_RECTANGULAR_BUTTON_OPTIONS,
  LIGHT_SURFACE_TEXT_FILL,
} from "../../common/CarnotHeatEngineButtonOptions.js";
import { CarnotHeatEnginePanel } from "../../common/CarnotHeatEnginePanel.js";
import { createNumberControl } from "../../common/view/createNumberControl.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { EfficiencyLabModel } from "../model/EfficiencyLabModel.js";
import { LabMode } from "../model/LabMode.js";

/** Width the verdict text wraps at, px. */
const FEEDBACK_WRAP_WIDTH = 200;

export class MeasurePanelNode extends CarnotHeatEnginePanel {
  /** The interactive nodes, in tab order, for the ScreenView's pdomOrder. */
  public readonly controlsInOrder: Node[];

  public constructor(model: EfficiencyLabModel) {
    const strings = StringManager.getInstance();
    const controlStrings = strings.getControls();
    const readoutStrings = strings.getReadouts();
    const units = strings.getUnits();
    const a11y = strings.getEfficiencyLabA11yStrings();

    const answerControl = createNumberControl(
      controlStrings.yourEfficiencyStringProperty,
      model.enteredEfficiencyPercentProperty,
      EFFICIENCY_ENTRY_RANGE_PERCENT,
      {
        unitsProperty: units.percentStringProperty,
        decimalPlaces: 1,
        delta: 0.5,
        trackWidth: 120,
        accessibleName: a11y.controls.yourEfficiencyStringProperty,
      },
    );

    const checkButton = new RectangularPushButton({
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
      content: new RichText(controlStrings.checkStringProperty, {
        font: READOUT_FONT,
        fill: LIGHT_SURFACE_TEXT_FILL,
        maxWidth: 100,
      }),
      baseColor: CarnotHeatEngineColors.controlSurfaceColorProperty,
      listener: () => model.revealEfficiency(),
      accessibleName: a11y.controls.checkStringProperty,
    });

    const feedbackText = new RichText(
      new DerivedProperty(
        [
          model.isEfficiencyRevealedProperty,
          model.isAnswerCorrectProperty,
          readoutStrings.correctStringProperty,
          readoutStrings.incorrectStringProperty,
        ],
        (revealed, correct, correctMessage, incorrectMessage) =>
          revealed ? (correct ? correctMessage : incorrectMessage) : "",
      ),
      {
        font: READOUT_FONT,
        fill: CarnotHeatEngineColors.textColorProperty,
        lineWrap: FEEDBACK_WRAP_WIDTH,
      },
    );
    model.isAnswerCorrectProperty.link((correct) => {
      feedbackText.fill = correct
        ? CarnotHeatEngineColors.correctColorProperty
        : CarnotHeatEngineColors.incorrectColorProperty;
    });

    super(
      new VBox({
        align: "left",
        spacing: 8,
        children: [answerControl, checkButton, feedbackText],
      }),
    );

    model.modeProperty.link((mode) => {
      this.visible = mode === LabMode.MEASURE;
    });

    this.controlsInOrder = [answerControl, checkButton];
  }
}
