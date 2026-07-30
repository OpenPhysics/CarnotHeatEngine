/**
 * EfficiencyLabControlPanel.ts
 *
 * The Efficiency Lab's controls: the three cycle-parameter sliders, the three
 * view checkboxes (previous-cycle ghost, T–S diagram, Carnot-limit inset), and
 * the Explore / Measure mode switch.
 */

import type { Property, TReadOnlyProperty } from "scenerystack/axon";
import { HSeparator, type Node, RichText, Text, VBox } from "scenerystack/scenery";
import { AquaRadioButtonGroup, Checkbox } from "scenerystack/sun";
import CarnotHeatEngineColors from "../../CarnotHeatEngineColors.js";
import { READOUT_FONT } from "../../CarnotHeatEngineConstants.js";
import { CarnotHeatEnginePanel } from "../../common/CarnotHeatEnginePanel.js";
import { CycleParameterControls } from "../../common/view/CycleParameterControls.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { EfficiencyLabModel } from "../model/EfficiencyLabModel.js";
import { LabMode } from "../model/LabMode.js";

export class EfficiencyLabControlPanel extends CarnotHeatEnginePanel {
  /** The interactive nodes, in tab order, for the ScreenView's pdomOrder. */
  public readonly controlsInOrder: Node[];

  public constructor(model: EfficiencyLabModel) {
    const strings = StringManager.getInstance();
    const controlStrings = strings.getControls();
    const a11y = strings.getEfficiencyLabA11yStrings();

    const parameterControls = new CycleParameterControls(model.cycle, a11y.controls);

    const ghostCheckbox = createCheckbox(
      model.showGhostProperty,
      controlStrings.showPreviousCycleStringProperty,
      a11y.controls.showPreviousCycleStringProperty,
    );
    const entropyCheckbox = createCheckbox(
      model.showEntropyDiagramProperty,
      controlStrings.showEntropyDiagramStringProperty,
      a11y.controls.showEntropyDiagramStringProperty,
    );
    const limitCheckbox = createCheckbox(
      model.showCarnotLimitProperty,
      controlStrings.showCarnotLimitStringProperty,
      a11y.controls.showCarnotLimitStringProperty,
    );

    const modeRadioGroup = new AquaRadioButtonGroup(
      model.modeProperty,
      [
        {
          value: LabMode.EXPLORE,
          createNode: () => modeLabel(controlStrings.exploreStringProperty),
          options: { accessibleName: controlStrings.exploreStringProperty },
        },
        {
          value: LabMode.MEASURE,
          createNode: () => modeLabel(controlStrings.measureStringProperty),
          options: { accessibleName: controlStrings.measureStringProperty },
        },
      ],
      {
        orientation: "horizontal",
        spacing: 16,
        radioButtonOptions: { radius: 7 },
        accessibleName: a11y.controls.modeStringProperty,
        accessibleHelpText: a11y.controls.modeHelpStringProperty,
      },
    );

    super(
      new VBox({
        align: "left",
        spacing: 10,
        children: [
          parameterControls,
          new HSeparator({ stroke: CarnotHeatEngineColors.panelBorderColorProperty }),
          ghostCheckbox,
          entropyCheckbox,
          limitCheckbox,
          new HSeparator({ stroke: CarnotHeatEngineColors.panelBorderColorProperty }),
          modeRadioGroup,
        ],
      }),
    );

    this.controlsInOrder = [
      ...parameterControls.controlsInOrder,
      ghostCheckbox,
      entropyCheckbox,
      limitCheckbox,
      modeRadioGroup,
    ];
  }
}

const modeLabel = (labelProperty: TReadOnlyProperty<string>): Text =>
  new Text(labelProperty, {
    font: READOUT_FONT,
    fill: CarnotHeatEngineColors.textColorProperty,
    maxWidth: 90,
  });

const createCheckbox = (
  property: Property<boolean>,
  labelProperty: TReadOnlyProperty<string>,
  accessibleName: TReadOnlyProperty<string>,
): Checkbox =>
  new Checkbox(
    property,
    new RichText(labelProperty, {
      font: READOUT_FONT,
      fill: CarnotHeatEngineColors.textColorProperty,
      maxWidth: 190,
    }),
    {
      checkboxColor: CarnotHeatEngineColors.textColorProperty,
      checkboxColorBackground: CarnotHeatEngineColors.controlSurfaceColorProperty,
      spacing: 8,
      accessibleName,
    },
  );
