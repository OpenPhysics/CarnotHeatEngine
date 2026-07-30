/**
 * CarnotHeatEnginePreferencesNode.ts
 *
 * Custom preferences UI shown in Preferences → Simulation. Controls are bound
 * to CarnotHeatEnginePreferencesModel Properties (whose initial values come from
 * carnotHeatEngineQueryParameters).
 */

import { Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox } from "scenerystack/sun";
import type { Tandem } from "scenerystack/tandem";
import CarnotHeatEngineColors from "../CarnotHeatEngineColors.js";
import CarnotHeatEngineNamespace from "../CarnotHeatEngineNamespace.js";
import { StringManager } from "../i18n/StringManager.js";
import type { CarnotHeatEnginePreferencesModel } from "./CarnotHeatEnginePreferencesModel.js";

export class CarnotHeatEnginePreferencesNode extends VBox {
  public constructor(preferencesModel: CarnotHeatEnginePreferencesModel, tandem?: Tandem) {
    const prefStrings = StringManager.getInstance().getPreferences();

    // The Preferences dialog is always white, so use the dark "light control surface"
    // colors (readable on white in both default and projector profiles), not textColorProperty
    // (which is near-white in default mode and would be invisible on the white dialog).
    const header = new Text(prefStrings.titleStringProperty, {
      font: new PhetFont({ size: 18, weight: "bold" }),
      fill: CarnotHeatEngineColors.controlSurfaceTextColorProperty,
    });

    const showCornerLabelsCheckbox = new Checkbox(
      preferencesModel.showCornerLabelsProperty,
      new Text(prefStrings.showCornerLabelsStringProperty, {
        font: new PhetFont(14),
        fill: CarnotHeatEngineColors.controlSurfaceTextColorProperty,
      }),
      {
        checkboxColor: CarnotHeatEngineColors.controlSurfaceTextColorProperty,
        checkboxColorBackground: CarnotHeatEngineColors.controlSurfaceColorProperty,
        spacing: 8,
        ...(tandem && { tandem: tandem.createTandem("showCornerLabelsCheckbox") }),
      },
    );

    super({
      align: "left",
      spacing: 12,
      children: [header, showCornerLabelsCheckbox],
    });
  }
}

CarnotHeatEngineNamespace.register("CarnotHeatEnginePreferencesNode", CarnotHeatEnginePreferencesNode);
