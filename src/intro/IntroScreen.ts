/**
 * IntroScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createIntroIcon() in src/common/CarnotHeatEngineScreenIcons.ts
 * (see doc/implementation-notes.md).
 *
 * The preferences model is passed in positionally because the diagrams honour
 * the "label cycle corners" preference, and preferences are constructed once in
 * main.ts rather than per screen.
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import CarnotHeatEngineColors from "../CarnotHeatEngineColors.js";
import { createIntroIcon } from "../common/CarnotHeatEngineScreenIcons.js";
import type { CarnotHeatEnginePreferencesModel } from "../preferences/CarnotHeatEnginePreferencesModel.js";
import { IntroModel } from "./model/IntroModel.js";
import { IntroKeyboardHelpContent } from "./view/IntroKeyboardHelpContent.js";
import { IntroScreenView } from "./view/IntroScreenView.js";

// Require tandem explicitly: it registers this screen (and its view) in joist's
// tandem tree. Interactive nodes below the view are not individually instrumented
// for PhET-iO data-streaming — this sim is not a PhET-iO-enabled publication.
type IntroScreenOptions = ScreenOptions & { tandem: Tandem };

export class IntroScreen extends Screen<IntroModel, IntroScreenView> {
  public constructor(preferences: CarnotHeatEnginePreferencesModel, options: IntroScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new IntroModel(),
      // View factory — receives the model instance
      (model) =>
        new IntroScreenView(model, preferences, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<IntroScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: CarnotHeatEngineColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new IntroKeyboardHelpContent(),
          homeScreenIcon: createIntroIcon(),
          navigationBarIcon: createIntroIcon(),
        },
        options,
      ),
    );
  }
}
