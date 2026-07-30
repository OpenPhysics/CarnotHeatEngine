/**
 * IntroScreenSummaryContent.ts
 *
 * The accessible screen summary read by screen readers (SceneryStack's
 * Interactive Description). It appears at the top of the parallel DOM and gives
 * a non-visual user a way to orient themselves and to re-read the simulation's
 * current state at any time.
 *
 * The current-details paragraph is live: it names the leg the playhead is on and
 * the gas's pressure, volume and temperature, so a screen-reader user stepping
 * through the cycle with the stage stepper hears the same story a sighted user
 * reads off the apparatus and the diagram.
 */
import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { formatSignificant } from "../../common/view/chartUtils.js";
import { createStageLabelProperty } from "../../common/view/stageStrings.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { IntroModel } from "../model/IntroModel.js";

export class IntroScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: IntroModel) {
    const a11y = StringManager.getInstance().getIntroA11yStrings();

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: new PatternStringProperty(a11y.currentDetailsStringProperty, {
        stage: createStageLabelProperty(model.cycle.processProperty),
        pressure: new DerivedProperty([model.cycle.pressureProperty], (pressure) => formatSignificant(pressure / 1000)),
        volume: new DerivedProperty([model.cycle.volumeProperty], (volume) => formatSignificant(volume * 1000)),
        temperature: new DerivedProperty([model.cycle.temperatureProperty], (temperature) =>
          formatSignificant(temperature, 4),
        ),
      }),
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
