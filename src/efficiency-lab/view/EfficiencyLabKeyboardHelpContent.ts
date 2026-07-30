/**
 * EfficiencyLabKeyboardHelpContent.ts
 *
 * Content for the keyboard-help dialog (the "?" button in the navigation bar).
 * The Efficiency Lab's interactions are sliders (three cycle parameters plus the
 * Measure-mode answer), checkboxes, radio buttons, and the Check button — all
 * covered by the standard slider and basic-actions sections.
 */

import {
  BasicActionsKeyboardHelpSection,
  SliderControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";

export class EfficiencyLabKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super([new SliderControlsKeyboardHelpSection()], [new BasicActionsKeyboardHelpSection()]);
  }
}
