/**
 * stageStrings.ts
 *
 * Maps the model's current {@link CycleProcessValue} to its localized name.
 *
 * The mapping has to live in the view because the model deliberately does not
 * know about strings, and it has to be direction-aware because the *same* leg is
 * an expansion in an engine and a compression in a refrigerator — see
 * {@link processFor}. Every screen that shows a stage label uses this, so the
 * Reversed Cycle screen cannot drift out of sync with the Intro screen.
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { StringManager } from "../../i18n/StringManager.js";
import { CycleProcess, type CycleProcessValue } from "../model/CycleStage.js";

/** A live localized label for the process the playhead is currently on. */
export const createStageLabelProperty = (
  processProperty: TReadOnlyProperty<CycleProcessValue>,
): TReadOnlyProperty<string> => {
  const stages = StringManager.getInstance().getStages();
  return new DerivedProperty(
    [
      processProperty,
      stages.isothermalExpansionHotStringProperty,
      stages.isothermalCompressionHotStringProperty,
      stages.isothermalExpansionColdStringProperty,
      stages.isothermalCompressionColdStringProperty,
      stages.adiabaticExpansionStringProperty,
      stages.adiabaticCompressionStringProperty,
    ],
    (
      process,
      isothermalExpansionHot,
      isothermalCompressionHot,
      isothermalExpansionCold,
      isothermalCompressionCold,
      adiabaticExpansion,
      adiabaticCompression,
    ) => {
      if (process === CycleProcess.ISOTHERMAL_EXPANSION_HOT) {
        return isothermalExpansionHot;
      }
      if (process === CycleProcess.ISOTHERMAL_COMPRESSION_HOT) {
        return isothermalCompressionHot;
      }
      if (process === CycleProcess.ISOTHERMAL_EXPANSION_COLD) {
        return isothermalExpansionCold;
      }
      if (process === CycleProcess.ISOTHERMAL_COMPRESSION_COLD) {
        return isothermalCompressionCold;
      }
      if (process === CycleProcess.ADIABATIC_EXPANSION) {
        return adiabaticExpansion;
      }
      return adiabaticCompression;
    },
  );
};
