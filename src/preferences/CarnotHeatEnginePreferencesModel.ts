/**
 * CarnotHeatEnginePreferencesModel.ts
 *
 * Model for the simulation-specific preferences shown in Preferences →
 * Simulation. Each preference Property takes its initial value from the
 * corresponding query parameter in carnotHeatEngineQueryParameters.
 *
 * The sim's one preference is whether the PV and T–S diagrams label their four
 * corner states 1–4.
 */

import { BooleanProperty } from "scenerystack/axon";
import type { Tandem } from "scenerystack/tandem";
import CarnotHeatEngineNamespace from "../CarnotHeatEngineNamespace.js";
import carnotHeatEngineQueryParameters from "./carnotHeatEngineQueryParameters.js";

export class CarnotHeatEnginePreferencesModel {
  /** Whether the diagrams label the four corner states 1–4. */
  public readonly showCornerLabelsProperty: BooleanProperty;

  public constructor(tandem?: Tandem) {
    this.showCornerLabelsProperty = new BooleanProperty(
      carnotHeatEngineQueryParameters.showCornerLabels,
      tandem ? { tandem: tandem.createTandem("showCornerLabelsProperty") } : undefined,
    );
  }

  public reset(): void {
    this.showCornerLabelsProperty.reset();
  }
}

CarnotHeatEngineNamespace.register("CarnotHeatEnginePreferencesModel", CarnotHeatEnginePreferencesModel);
