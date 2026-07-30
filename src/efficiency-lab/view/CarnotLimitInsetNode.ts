/**
 * CarnotLimitInsetNode.ts
 *
 * A small reference plot of η = 1 − T_c/T_h against T_cold, at the currently
 * selected T_hot, with a marker at the cycle's own operating point.
 *
 * It answers the question the sliders alone cannot: *how much* efficiency is
 * left on the table by a warm cold reservoir. The curve is steep at low T_cold
 * and flattens off, which is why chasing a hotter boiler beats chasing a colder
 * condenser — visible in one glance, invisible in a table of numbers.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { LinePlot } from "scenerystack/bamboo";
import { Range, Vector2 } from "scenerystack/dot";
import { Circle, type NodeOptions } from "scenerystack/scenery";
import CarnotHeatEngineColors from "../../CarnotHeatEngineColors.js";
import {
  CARNOT_LIMIT_SAMPLES,
  INSET_VIEW_HEIGHT,
  INSET_VIEW_WIDTH,
  MIN_TEMPERATURE_GAP,
  T_COLD_RANGE,
} from "../../CarnotHeatEngineConstants.js";
import { CycleDiagramNode } from "../../common/view/CycleDiagramNode.js";
import { StringManager } from "../../i18n/StringManager.js";

export type CarnotLimitInsetNodeOptions = {
  /** Hot-reservoir temperature, K — the curve is drawn for this value. */
  tHotProperty: TReadOnlyProperty<number>;
  /** Cold-reservoir temperature, K — where the operating-point marker sits. */
  tColdProperty: TReadOnlyProperty<number>;
  /** Extra Node options (position, visibility, …). */
  nodeOptions?: NodeOptions;
};

export class CarnotLimitInsetNode extends CycleDiagramNode {
  public constructor(providedOptions: CarnotLimitInsetNodeOptions) {
    const strings = StringManager.getInstance();
    const diagramStrings = strings.getDiagrams();
    const units = strings.getUnits();

    super({
      titleProperty: diagramStrings.limitTitleStringProperty,
      // The title carries the quantity names (T_cold, η); the axes show just
      // their units, which is enough at this size without crowding the plot.
      xAxisLabelProperty: units.kelvinStringProperty,
      yAxisLabelProperty: units.percentStringProperty,
      viewWidth: INSET_VIEW_WIDTH,
      viewHeight: INSET_VIEW_HEIGHT,
      targetDivisions: 3,
      showGrid: false,
      ...(providedOptions.nodeOptions && { nodeOptions: providedOptions.nodeOptions }),
    });

    const curve = new LinePlot(this.chartTransform, [], {
      stroke: CarnotHeatEngineColors.accentColorProperty,
      lineWidth: 2,
    });
    this.plotLayer.addChild(curve);

    const operatingPoint = new Circle(4, {
      fill: CarnotHeatEngineColors.playheadColorProperty,
      stroke: CarnotHeatEngineColors.backgroundColorProperty,
      lineWidth: 1,
    });
    this.plotLayer.addChild(operatingPoint);

    Multilink.multilink([providedOptions.tHotProperty, providedOptions.tColdProperty], (tHot, tCold) => {
      // Only the part of the T_cold range that the minimum gap actually allows
      // for this T_hot is meaningful; beyond it the model would push T_hot up.
      const maximumCold = Math.min(T_COLD_RANGE.max, tHot - MIN_TEMPERATURE_GAP);
      const minimumCold = Math.min(T_COLD_RANGE.min, maximumCold);

      const points: Vector2[] = [];
      for (let index = 0; index <= CARNOT_LIMIT_SAMPLES; index++) {
        const sampleCold = minimumCold + ((maximumCold - minimumCold) * index) / CARNOT_LIMIT_SAMPLES;
        points.push(new Vector2(sampleCold, 100 * (1 - sampleCold / tHot)));
      }

      this.setRanges(new Range(minimumCold, maximumCold), new Range(0, 100));
      curve.setDataSet(points);
      operatingPoint.translation = this.chartTransform.modelToViewPosition(
        new Vector2(tCold, 100 * (1 - tCold / tHot)),
      );
    });
  }
}
