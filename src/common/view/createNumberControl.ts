/**
 * createNumberControl.ts
 *
 * Factory for the themed `NumberControl` every control panel in the sim uses.
 * It standardizes:
 *  - title and value text in the sim's text colour;
 *  - an optional unit suffix rendered through `numberDisplayOptions.valuePattern`
 *    (units come from a localized StringProperty, never an English literal);
 *  - rich text, so titles like "Expansion Ratio V<sub>2</sub>/V<sub>1</sub>"
 *    render their subscripts;
 *  - an `accessibleName` (defaulting to the visible title) so every slider is
 *    reachable and announced.
 *
 * Units use the `{{value}}` placeholder convention that `NumberDisplay` fills in.
 */

import { DerivedProperty, type PhetioProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Dimension2, type Range } from "scenerystack/dot";
import { NumberControl, type NumberControlOptions } from "scenerystack/scenery-phet";
import CarnotHeatEngineColors from "../../CarnotHeatEngineColors.js";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS, LIGHT_SURFACE_TEXT_FILL } from "../CarnotHeatEngineButtonOptions.js";

export type CreateNumberControlOptions = {
  /** Localized unit suffix appended after the value (e.g. "K", "kPa"). */
  unitsProperty?: TReadOnlyProperty<string>;
  /** Digits shown after the decimal point in the readout (default 0). */
  decimalPlaces?: number;
  /** Arrow-button / keyboard step (default: 1/100 of the range). */
  delta?: number;
  /** Accessible name; defaults to the visible title. */
  accessibleName?: TReadOnlyProperty<string>;
  /** Accessible help text read after the name. */
  accessibleHelpText?: TReadOnlyProperty<string>;
  /** Width the slider track is laid out to. */
  trackWidth?: number;
  /** Extra NumberControl options merged last. */
  numberControlOptions?: NumberControlOptions;
};

export const createNumberControl = (
  titleProperty: TReadOnlyProperty<string>,
  numberProperty: PhetioProperty<number>,
  range: Range,
  providedOptions?: CreateNumberControlOptions,
): NumberControl => {
  const options = providedOptions ?? {};
  const decimalPlaces = options.decimalPlaces ?? 0;
  const delta = options.delta ?? (range.max - range.min) / 100;
  const trackWidth = options.trackWidth ?? 150;

  // Build "<value> <units>" lazily so the unit label stays localized.
  const valuePattern = options.unitsProperty
    ? new DerivedProperty([options.unitsProperty], (units) => `{{value}} ${units}`)
    : undefined;

  return new NumberControl(titleProperty, numberProperty, range, {
    delta,
    accessibleName: options.accessibleName ?? titleProperty,
    // Titles carry <sub> markup (V₂/V₁, T_hot); without this they render literally.
    useRichText: true,
    ...(options.accessibleHelpText && { accessibleHelpText: options.accessibleHelpText }),
    titleNodeOptions: {
      fill: CarnotHeatEngineColors.textColorProperty,
      maxWidth: 170,
    },
    sliderOptions: {
      trackSize: new Dimension2(trackWidth, 4),
      thumbFill: CarnotHeatEngineColors.accentColorProperty,
    },
    numberDisplayOptions: {
      decimalPlaces,
      useRichText: true,
      textOptions: {
        // NumberDisplay paints its value on a white background rectangle, so the
        // value must use the light-surface text colour, not the panel text colour
        // (near-white in default mode) — otherwise it is invisible on white.
        fill: LIGHT_SURFACE_TEXT_FILL,
      },
      ...(valuePattern ? { valuePattern } : {}),
    },
    arrowButtonOptions: FLAT_RECTANGULAR_BUTTON_OPTIONS,
    ...options.numberControlOptions,
  });
};
