/**
 * EfficiencyLabScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createEfficiencyLabIcon() in src/common/CarnotHeatEngineScreenIcons.ts
 * (see doc/implementation-notes.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import CarnotHeatEngineColors from "../CarnotHeatEngineColors.js";
import { createEfficiencyLabIcon } from "../common/CarnotHeatEngineScreenIcons.js";
import type { CarnotHeatEnginePreferencesModel } from "../preferences/CarnotHeatEnginePreferencesModel.js";
import { EfficiencyLabModel } from "./model/EfficiencyLabModel.js";
import { EfficiencyLabKeyboardHelpContent } from "./view/EfficiencyLabKeyboardHelpContent.js";
import { EfficiencyLabScreenView } from "./view/EfficiencyLabScreenView.js";

// Require tandem explicitly: it registers this screen (and its view) in joist's
// tandem tree. Interactive nodes below the view are not individually instrumented
// for PhET-iO data-streaming — this sim is not a PhET-iO-enabled publication.
type EfficiencyLabScreenOptions = ScreenOptions & { tandem: Tandem };

export class EfficiencyLabScreen extends Screen<EfficiencyLabModel, EfficiencyLabScreenView> {
  public constructor(preferences: CarnotHeatEnginePreferencesModel, options: EfficiencyLabScreenOptions) {
    super(
      () => new EfficiencyLabModel(),
      (model) =>
        new EfficiencyLabScreenView(model, preferences, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<EfficiencyLabScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: CarnotHeatEngineColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new EfficiencyLabKeyboardHelpContent(),
          homeScreenIcon: createEfficiencyLabIcon(),
          navigationBarIcon: createEfficiencyLabIcon(),
        },
        options,
      ),
    );
  }
}
