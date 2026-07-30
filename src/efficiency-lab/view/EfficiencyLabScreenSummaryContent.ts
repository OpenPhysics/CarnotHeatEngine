/**
 * EfficiencyLabScreenSummaryContent.ts
 *
 * The accessible screen summary for the Efficiency Lab.
 *
 * The current-details paragraph carries the three energies a student needs to
 * compute η, and then — crucially — respects Measure mode: it says the
 * efficiency is hidden rather than reading it out, so a screen-reader user gets
 * the same exercise a sighted user does instead of a spoiler.
 */
import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { ScreenSummaryContent } from "scenerystack/sim";
import { toKilojoules } from "../../common/view/readouts.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { EfficiencyLabModel } from "../model/EfficiencyLabModel.js";

export class EfficiencyLabScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: EfficiencyLabModel) {
    const a11y = StringManager.getInstance().getEfficiencyLabA11yStrings();

    const efficiencySentenceProperty = new DerivedProperty(
      [
        model.isEfficiencyVisibleProperty,
        model.cycle.efficiencyProperty,
        a11y.efficiencyKnownStringProperty,
        a11y.efficiencyHiddenStringProperty,
      ],
      (visible, efficiency, knownPattern, hidden) =>
        visible ? knownPattern.replace("{{value}}", toFixed(efficiency * 100, 1)) : hidden,
    );

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: new PatternStringProperty(a11y.currentDetailsStringProperty, {
        qHot: new DerivedProperty([model.cycle.qHotProperty], (value) => toFixed(toKilojoules(value), 2)),
        work: new DerivedProperty([model.cycle.workProperty], (value) => toFixed(toKilojoules(value), 2)),
        qCold: new DerivedProperty([model.cycle.qColdProperty], (value) => toFixed(toKilojoules(value), 2)),
        efficiency: efficiencySentenceProperty,
      }),
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
