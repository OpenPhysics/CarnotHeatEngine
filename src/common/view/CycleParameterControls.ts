/**
 * CycleParameterControls.ts
 *
 * The three sliders that define the cycle — T_hot, T_cold, and the free volume
 * ratio — shared by all three screens so the same physics is driven the same way
 * everywhere. The Intro screen omits the ratio slider (it has the gas selector
 * and the stage stepper competing for space, and the ratio is the Efficiency
 * Lab's variable); the other two show all three.
 *
 * T_hot and T_cold are clamped against each other in the model, not here: drag
 * either one into the other and the model pushes it back, so the sliders can be
 * plain NumberControls.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { type Node, type NodeOptions, VBox } from "scenerystack/scenery";
import { COMPRESSION_RATIO_RANGE, T_COLD_RANGE, T_HOT_RANGE } from "../../CarnotHeatEngineConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { CarnotCycleModel } from "../model/CarnotCycleModel.js";
import { createNumberControl } from "./createNumberControl.js";

/**
 * The accessible names and help text the three sliders need. Every screen's
 * `a11y.<screen>.controls` group satisfies at least the required subset.
 */
export type CycleParameterA11yStrings = {
  readonly hotTemperatureStringProperty: TReadOnlyProperty<string>;
  readonly coldTemperatureStringProperty: TReadOnlyProperty<string>;
  readonly expansionRatioStringProperty: TReadOnlyProperty<string>;
};

export type CycleParameterControlsOptions = {
  /** Whether to include the expansion-ratio slider (off on the Intro screen). */
  includeExpansionRatio?: boolean;
  /** Extra Node options. */
  nodeOptions?: NodeOptions;
};

export class CycleParameterControls extends VBox {
  /** The sliders in tab order, for the ScreenView's pdomOrder. */
  public readonly controlsInOrder: Node[];

  public constructor(
    cycle: CarnotCycleModel,
    a11y: CycleParameterA11yStrings,
    providedOptions?: CycleParameterControlsOptions,
  ) {
    const strings = StringManager.getInstance();
    const controlStrings = strings.getControls();
    const units = strings.getUnits();

    const hotControl = createNumberControl(
      controlStrings.hotTemperatureStringProperty,
      cycle.tHotProperty,
      T_HOT_RANGE,
      {
        unitsProperty: units.kelvinStringProperty,
        delta: 10,
        accessibleName: a11y.hotTemperatureStringProperty,
      },
    );
    const coldControl = createNumberControl(
      controlStrings.coldTemperatureStringProperty,
      cycle.tColdProperty,
      T_COLD_RANGE,
      {
        unitsProperty: units.kelvinStringProperty,
        delta: 10,
        accessibleName: a11y.coldTemperatureStringProperty,
      },
    );

    const controls: Node[] = [hotControl, coldControl];
    if (providedOptions?.includeExpansionRatio !== false) {
      controls.push(
        createNumberControl(
          controlStrings.expansionRatioStringProperty,
          cycle.compressionRatioProperty,
          COMPRESSION_RATIO_RANGE,
          {
            decimalPlaces: 1,
            delta: 0.1,
            accessibleName: a11y.expansionRatioStringProperty,
          },
        ),
      );
    }

    super({
      children: controls,
      align: "center",
      spacing: 6,
      ...providedOptions?.nodeOptions,
    });

    this.controlsInOrder = controls;
  }
}
