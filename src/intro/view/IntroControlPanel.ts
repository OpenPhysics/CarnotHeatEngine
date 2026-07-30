/**
 * IntroControlPanel.ts
 *
 * The Intro screen's controls: the two reservoir-temperature sliders, the gas
 * selector, the discrete stage stepper, and the live stage / P / V / T readout.
 *
 * The expansion-ratio slider is deliberately absent here — the Intro screen is
 * about *what the four legs are*, and the Efficiency Lab is where the cycle's
 * shape becomes a variable.
 */

import { DerivedProperty } from "scenerystack/axon";
import { HSeparator, type Node, RichText, Text, VBox } from "scenerystack/scenery";
import { AquaRadioButtonGroup } from "scenerystack/sun";
import CarnotHeatEngineColors from "../../CarnotHeatEngineColors.js";
import { READOUT_FONT, SECTION_HEADING_FONT, STAGE_LABEL_FONT } from "../../CarnotHeatEngineConstants.js";
import { CarnotHeatEnginePanel } from "../../common/CarnotHeatEnginePanel.js";
import { GammaPreset } from "../../common/model/GammaPreset.js";
import { CycleParameterControls } from "../../common/view/CycleParameterControls.js";
import { createReadoutColumn, createReadoutRow, significantValueWithUnits } from "../../common/view/readouts.js";
import { StageStepperNode } from "../../common/view/StageStepperNode.js";
import { createStageLabelProperty } from "../../common/view/stageStrings.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { IntroModel } from "../model/IntroModel.js";

export class IntroControlPanel extends CarnotHeatEnginePanel {
  /** The interactive nodes, in tab order, for the ScreenView's pdomOrder. */
  public readonly controlsInOrder: Node[];

  public constructor(model: IntroModel) {
    const strings = StringManager.getInstance();
    const controlStrings = strings.getControls();
    const readoutStrings = strings.getReadouts();
    const units = strings.getUnits();
    const a11y = strings.getIntroA11yStrings();

    // ── Reservoir temperatures ────────────────────────────────────────────────
    const parameterControls = new CycleParameterControls(model.cycle, a11y.controls, {
      includeExpansionRatio: false,
    });

    // ── Gas selector ──────────────────────────────────────────────────────────
    const gasHeading = new Text(controlStrings.gasStringProperty, {
      font: SECTION_HEADING_FONT,
      fill: CarnotHeatEngineColors.textColorProperty,
      maxWidth: 190,
    });
    const gasRadioGroup = new AquaRadioButtonGroup(
      model.cycle.gammaPresetProperty,
      [
        {
          value: GammaPreset.MONATOMIC,
          createNode: () =>
            new RichText(controlStrings.monatomicStringProperty, {
              font: READOUT_FONT,
              fill: CarnotHeatEngineColors.textColorProperty,
              maxWidth: 170,
            }),
          options: { accessibleName: controlStrings.monatomicStringProperty },
        },
        {
          value: GammaPreset.DIATOMIC,
          createNode: () =>
            new RichText(controlStrings.diatomicStringProperty, {
              font: READOUT_FONT,
              fill: CarnotHeatEngineColors.textColorProperty,
              maxWidth: 170,
            }),
          options: { accessibleName: controlStrings.diatomicStringProperty },
        },
      ],
      {
        orientation: "vertical",
        align: "left",
        spacing: 5,
        radioButtonOptions: { radius: 7 },
        accessibleName: a11y.controls.gasStringProperty,
        accessibleHelpText: a11y.controls.gasHelpStringProperty,
      },
    );

    // ── Stage stepper + current stage ─────────────────────────────────────────
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

    // ── Live P / V / T ────────────────────────────────────────────────────────
    // Pressure and volume both range over more than two decades as the
    // parameters move, so they are shown to three significant figures rather
    // than a fixed number of decimals.
    const readouts = createReadoutColumn([
      createReadoutRow(
        readoutStrings.pressureStringProperty,
        significantValueWithUnits(
          new DerivedProperty([model.cycle.pressureProperty], (pressure) => pressure / 1000),
          units.kilopascalStringProperty,
        ),
      ),
      createReadoutRow(
        readoutStrings.volumeStringProperty,
        significantValueWithUnits(
          new DerivedProperty([model.cycle.volumeProperty], (volume) => volume * 1000),
          units.literStringProperty,
        ),
      ),
      createReadoutRow(
        readoutStrings.temperatureStringProperty,
        significantValueWithUnits(model.cycle.temperatureProperty, units.kelvinStringProperty, 4),
      ),
    ]);

    super(
      new VBox({
        align: "left",
        spacing: 10,
        children: [
          parameterControls,
          new HSeparator({ stroke: CarnotHeatEngineColors.panelBorderColorProperty }),
          gasHeading,
          gasRadioGroup,
          new HSeparator({ stroke: CarnotHeatEngineColors.panelBorderColorProperty }),
          stageHeading,
          stageLabel,
          stageStepper,
          new HSeparator({ stroke: CarnotHeatEngineColors.panelBorderColorProperty }),
          readouts,
        ],
      }),
    );

    this.controlsInOrder = [...parameterControls.controlsInOrder, gasRadioGroup, ...stageStepper.controlsInOrder];
  }
}
