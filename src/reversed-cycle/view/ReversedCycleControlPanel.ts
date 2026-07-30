/**
 * ReversedCycleControlPanel.ts
 *
 * The Reversed Cycle screen's controls: the same three cycle-parameter sliders
 * every screen has, the cooling/heating framing switch, the stage stepper, and
 * the COP readout block.
 *
 * The parameter sliders are deliberately identical to the other screens'. The
 * screen's claim is "same apparatus, opposite direction", and that claim is
 * weakened if the controls look different.
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { HSeparator, type Node, RichText, Text, VBox } from "scenerystack/scenery";
import { AquaRadioButtonGroup } from "scenerystack/sun";
import CarnotHeatEngineColors from "../../CarnotHeatEngineColors.js";
import { READOUT_FONT, SECTION_HEADING_FONT, STAGE_LABEL_FONT } from "../../CarnotHeatEngineConstants.js";
import { CarnotHeatEnginePanel } from "../../common/CarnotHeatEnginePanel.js";
import { CycleParameterControls } from "../../common/view/CycleParameterControls.js";
import { createReadoutColumn, createReadoutRow, toKilojoules, valueWithUnits } from "../../common/view/readouts.js";
import { StageStepperNode } from "../../common/view/StageStepperNode.js";
import { createStageLabelProperty } from "../../common/view/stageStrings.js";
import { StringManager } from "../../i18n/StringManager.js";
import { CopFraming } from "../model/CopFraming.js";
import type { ReversedCycleModel } from "../model/ReversedCycleModel.js";

export class ReversedCycleControlPanel extends CarnotHeatEnginePanel {
  /** The interactive nodes, in tab order, for the ScreenView's pdomOrder. */
  public readonly controlsInOrder: Node[];

  public constructor(model: ReversedCycleModel) {
    const strings = StringManager.getInstance();
    const controlStrings = strings.getControls();
    const readoutStrings = strings.getReadouts();
    const units = strings.getUnits();
    const a11y = strings.getReversedCycleA11yStrings();

    const parameterControls = new CycleParameterControls(model.cycle, a11y.controls);

    // ── Cooling vs. heating framing ───────────────────────────────────────────
    const framingRadioGroup = new AquaRadioButtonGroup(
      model.framingProperty,
      [
        {
          value: CopFraming.COOLING,
          createNode: () => framingLabel(controlStrings.coolingStringProperty),
          options: { accessibleName: controlStrings.coolingStringProperty },
        },
        {
          value: CopFraming.HEATING,
          createNode: () => framingLabel(controlStrings.heatingStringProperty),
          options: { accessibleName: controlStrings.heatingStringProperty },
        },
      ],
      {
        orientation: "vertical",
        align: "left",
        spacing: 5,
        radioButtonOptions: { radius: 7 },
        accessibleName: a11y.controls.framingStringProperty,
        accessibleHelpText: a11y.controls.framingHelpStringProperty,
      },
    );

    // ── Stage stepper + current stage ─────────────────────────────────────────
    // "Next" here moves counter-clockwise, because the model's stage stepper is
    // direction-aware; the label beside it names the process accordingly.
    const stageHeading = new Text(controlStrings.stageStringProperty, {
      font: SECTION_HEADING_FONT,
      fill: CarnotHeatEngineColors.textColorProperty,
      maxWidth: 190,
    });
    const stageLabel = new RichText(createStageLabelProperty(model.cycle.processProperty), {
      font: STAGE_LABEL_FONT,
      fill: CarnotHeatEngineColors.accentColorProperty,
      lineWrap: 200,
    });
    const stageStepper = new StageStepperNode(model.cycle, a11y.controls);

    // ── COP block ─────────────────────────────────────────────────────────────
    const copFormula = new RichText(
      new DerivedProperty(
        [
          model.framingProperty,
          readoutStrings.copCoolingFormulaStringProperty,
          readoutStrings.copHeatingFormulaStringProperty,
        ],
        (framing, coolingFormula, heatingFormula) => (framing === CopFraming.COOLING ? coolingFormula : heatingFormula),
      ),
      {
        font: READOUT_FONT,
        fill: CarnotHeatEngineColors.secondaryTextColorProperty,
        maxWidth: 210,
      },
    );

    // The short forms fit the readout column; the long descriptive phrases are
    // kept for the screen summary, which has no width limit.
    const usefulHeatLabelProperty = new DerivedProperty(
      [
        model.framingProperty,
        readoutStrings.heatRemovedShortStringProperty,
        readoutStrings.heatDeliveredShortStringProperty,
      ],
      (framing, removed, delivered) => (framing === CopFraming.COOLING ? removed : delivered),
    );

    const readouts = createReadoutColumn([
      createReadoutRow(
        readoutStrings.workInStringProperty,
        valueWithUnits(new DerivedProperty([model.cycle.workProperty], toKilojoules), units.kilojouleStringProperty, 2),
        { labelFill: CarnotHeatEngineColors.workColorProperty },
      ),
      createReadoutRow(
        usefulHeatLabelProperty,
        valueWithUnits(new DerivedProperty([model.usefulHeatProperty], toKilojoules), units.kilojouleStringProperty, 2),
      ),
      createReadoutRow(
        readoutStrings.copStringProperty,
        new DerivedProperty([model.copProperty], (cop) => (Number.isFinite(cop) ? cop.toPrecision(3) : "—")),
        { valueFill: CarnotHeatEngineColors.accentColorProperty },
      ),
    ]);

    super(
      new VBox({
        align: "left",
        spacing: 10,
        children: [
          parameterControls,
          new HSeparator({ stroke: CarnotHeatEngineColors.panelBorderColorProperty }),
          framingRadioGroup,
          new HSeparator({ stroke: CarnotHeatEngineColors.panelBorderColorProperty }),
          stageHeading,
          stageLabel,
          stageStepper,
          new HSeparator({ stroke: CarnotHeatEngineColors.panelBorderColorProperty }),
          readouts,
          copFormula,
        ],
      }),
    );

    this.controlsInOrder = [...parameterControls.controlsInOrder, framingRadioGroup, ...stageStepper.controlsInOrder];
  }
}

const framingLabel = (labelProperty: TReadOnlyProperty<string>): Text =>
  new Text(labelProperty, {
    font: READOUT_FONT,
    fill: CarnotHeatEngineColors.textColorProperty,
    maxWidth: 190,
  });
