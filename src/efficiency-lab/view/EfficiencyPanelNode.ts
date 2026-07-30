/**
 * EfficiencyPanelNode.ts
 *
 * The energy-budget panel: the Sankey-style bars and the Q_hot / W / Q_cold
 * readouts students read their numbers off, with η beneath them.
 *
 * In Explore mode η and the closed form are simply shown. In Measure mode the η
 * readout becomes an em dash and the formula disappears until the student has
 * committed to an answer in {@link MeasurePanelNode} — the point of the mode is
 * to compute η, not to read it. This panel's height stays the same either way,
 * so the layout below it does not jump when the mode changes.
 */

import { DerivedProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { HSeparator, RichText, VBox } from "scenerystack/scenery";
import CarnotHeatEngineColors from "../../CarnotHeatEngineColors.js";
import { READOUT_FONT } from "../../CarnotHeatEngineConstants.js";
import { CarnotHeatEnginePanel } from "../../common/CarnotHeatEnginePanel.js";
import { EnergyFlowNode } from "../../common/view/EnergyFlowNode.js";
import { createReadoutColumn, createReadoutRow, toKilojoules, valueWithUnits } from "../../common/view/readouts.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { EfficiencyLabModel } from "../model/EfficiencyLabModel.js";

export class EfficiencyPanelNode extends CarnotHeatEnginePanel {
  public constructor(model: EfficiencyLabModel) {
    const strings = StringManager.getInstance();
    const readoutStrings = strings.getReadouts();
    const units = strings.getUnits();

    const energyFlow = new EnergyFlowNode({
      qHotProperty: model.cycle.qHotProperty,
      qColdProperty: model.cycle.qColdProperty,
      workProperty: model.cycle.workProperty,
      directionProperty: model.cycle.directionProperty,
    });

    // ── The numbers a student reads η off ─────────────────────────────────────
    const energyReadouts = createReadoutColumn([
      createReadoutRow(
        readoutStrings.qHotStringProperty,
        valueWithUnits(new DerivedProperty([model.cycle.qHotProperty], toKilojoules), units.kilojouleStringProperty, 2),
        { labelFill: CarnotHeatEngineColors.hotColorProperty },
      ),
      createReadoutRow(
        readoutStrings.workStringProperty,
        valueWithUnits(new DerivedProperty([model.cycle.workProperty], toKilojoules), units.kilojouleStringProperty, 2),
        { labelFill: CarnotHeatEngineColors.workColorProperty },
      ),
      createReadoutRow(
        readoutStrings.qColdStringProperty,
        valueWithUnits(
          new DerivedProperty([model.cycle.qColdProperty], toKilojoules),
          units.kilojouleStringProperty,
          2,
        ),
        { labelFill: CarnotHeatEngineColors.coldColorProperty },
      ),
    ]);

    // ── η, hidden in Measure mode until Check is pressed ──────────────────────
    const efficiencyValueProperty = new DerivedProperty(
      [model.isEfficiencyVisibleProperty, model.cycle.efficiencyProperty, readoutStrings.hiddenStringProperty],
      (visible, efficiency, hidden) => (visible ? `${toFixed(efficiency * 100, 1)} %` : hidden),
    );
    const efficiencyRow = createReadoutRow(readoutStrings.efficiencyStringProperty, efficiencyValueProperty, {
      valueFill: CarnotHeatEngineColors.accentColorProperty,
    });

    const efficiencyFormula = new RichText(readoutStrings.efficiencyFormulaStringProperty, {
      font: READOUT_FONT,
      fill: CarnotHeatEngineColors.secondaryTextColorProperty,
      maxWidth: 220,
    });
    // The closed form is the thing being verified in Measure mode, so it stays
    // out of sight until the student has committed to an answer.
    model.isEfficiencyVisibleProperty.link((visible) => {
      efficiencyFormula.visible = visible;
    });

    super(
      new VBox({
        align: "left",
        spacing: 10,
        children: [
          energyFlow,
          new HSeparator({ stroke: CarnotHeatEngineColors.panelBorderColorProperty }),
          energyReadouts,
          efficiencyRow,
          efficiencyFormula,
        ],
      }),
    );
  }
}
