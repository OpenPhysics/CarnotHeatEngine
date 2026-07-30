/**
 * ReversedCycleScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createReversedCycleIcon() in src/common/CarnotHeatEngineScreenIcons.ts
 * (see doc/implementation-notes.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import CarnotHeatEngineColors from "../CarnotHeatEngineColors.js";
import { createReversedCycleIcon } from "../common/CarnotHeatEngineScreenIcons.js";
import type { CarnotHeatEnginePreferencesModel } from "../preferences/CarnotHeatEnginePreferencesModel.js";
import { ReversedCycleModel } from "./model/ReversedCycleModel.js";
import { ReversedCycleKeyboardHelpContent } from "./view/ReversedCycleKeyboardHelpContent.js";
import { ReversedCycleScreenView } from "./view/ReversedCycleScreenView.js";

// Require tandem explicitly: it registers this screen (and its view) in joist's
// tandem tree. Interactive nodes below the view are not individually instrumented
// for PhET-iO data-streaming — this sim is not a PhET-iO-enabled publication.
type ReversedCycleScreenOptions = ScreenOptions & { tandem: Tandem };

export class ReversedCycleScreen extends Screen<ReversedCycleModel, ReversedCycleScreenView> {
  public constructor(preferences: CarnotHeatEnginePreferencesModel, options: ReversedCycleScreenOptions) {
    super(
      () => new ReversedCycleModel(),
      (model) =>
        new ReversedCycleScreenView(model, preferences, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<ReversedCycleScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: CarnotHeatEngineColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new ReversedCycleKeyboardHelpContent(),
          homeScreenIcon: createReversedCycleIcon(),
          navigationBarIcon: createReversedCycleIcon(),
        },
        options,
      ),
    );
  }
}
