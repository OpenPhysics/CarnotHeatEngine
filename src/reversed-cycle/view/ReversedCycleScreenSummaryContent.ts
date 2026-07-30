/**
 * ReversedCycleScreenSummaryContent.ts
 *
 * The accessible screen summary for the Reversed Cycle screen. The
 * current-details paragraph names the leg (already direction-aware, so it says
 * "isothermal compression (hot)" where the Intro screen would say "expansion"),
 * the work put in, the useful heat under the current framing, and the COP.
 */
import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { ScreenSummaryContent } from "scenerystack/sim";
import { toKilojoules } from "../../common/view/readouts.js";
import { createStageLabelProperty } from "../../common/view/stageStrings.js";
import { StringManager } from "../../i18n/StringManager.js";
import { CopFraming } from "../model/CopFraming.js";
import type { ReversedCycleModel } from "../model/ReversedCycleModel.js";

export class ReversedCycleScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: ReversedCycleModel) {
    const strings = StringManager.getInstance();
    const a11y = strings.getReversedCycleA11yStrings();
    const readoutStrings = strings.getReadouts();

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: new PatternStringProperty(a11y.currentDetailsStringProperty, {
        stage: createStageLabelProperty(model.cycle.processProperty),
        work: new DerivedProperty([model.cycle.workProperty], (value) => toFixed(toKilojoules(value), 2)),
        usefulLabel: new DerivedProperty(
          [model.framingProperty, readoutStrings.heatRemovedStringProperty, readoutStrings.heatDeliveredStringProperty],
          (framing, removed, delivered) => (framing === CopFraming.COOLING ? removed : delivered),
        ),
        usefulHeat: new DerivedProperty([model.usefulHeatProperty], (value) => toFixed(toKilojoules(value), 2)),
        cop: new DerivedProperty([model.copProperty], (cop) => (Number.isFinite(cop) ? cop.toPrecision(3) : "—")),
      }),
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
