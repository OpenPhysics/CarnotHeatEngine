/**
 * CycleDiagramNode.ts
 *
 * The shared axes-and-frame renderer behind every diagram in the sim. It owns a
 * bamboo `ChartTransform`, the plotting-area frame, grid, ticks, tick labels,
 * the title and the two axis labels, and it re-derives "nice" tick spacings
 * whenever the plotted range changes.
 *
 * Subclasses supply only what is plotted: {@link PVDiagramNode} draws the four
 * analytic legs against (V, P) and {@link TSDiagramNode} draws the same cycle as
 * a rectangle against (S, T). A third user, the Carnot-limit inset, plots a
 * single curve. Factoring the frame out here is what makes the T–S diagram a
 * ~100-line file instead of a second copy of the PV one — and it is the piece an
 * Otto/Diesel/Brayton sim would reuse directly.
 *
 * ── Coordinates ───────────────────────────────────────────────────────────────
 * Everything a subclass plots is in *display* units (litres, kPa, K, J/K), not
 * SI: the axis labels say "V (L)" so the numbers behind them have to agree.
 * Conversion happens where the model data is read, not here.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { AxisLine, ChartRectangle, ChartTransform, GridLineSet, TickLabelSet, TickMarkSet } from "scenerystack/bamboo";
import type { Range } from "scenerystack/dot";
import { Orientation } from "scenerystack/phet-core";
import { Node, type NodeOptions, RichText, Text } from "scenerystack/scenery";
import CarnotHeatEngineColors from "../../CarnotHeatEngineColors.js";
import {
  DIAGRAM_BOTTOM_PADDING,
  DIAGRAM_LEFT_PADDING,
  DIAGRAM_RIGHT_PADDING,
  DIAGRAM_TITLE_FONT,
  DIAGRAM_TOP_PADDING,
  DIAGRAM_VIEW_HEIGHT,
  DIAGRAM_VIEW_WIDTH,
  TICK_LABEL_FONT,
} from "../../CarnotHeatEngineConstants.js";
import { decimalPlacesForStep, formatTickValue, niceStep } from "./chartUtils.js";

export type CycleDiagramNodeOptions = {
  /** Diagram heading, drawn above the plotting area. May contain `<sub>` markup. */
  titleProperty: TReadOnlyProperty<string>;
  /** Horizontal axis label including its unit, e.g. "V (L)". */
  xAxisLabelProperty: TReadOnlyProperty<string>;
  /** Vertical axis label including its unit, e.g. "P (kPa)". */
  yAxisLabelProperty: TReadOnlyProperty<string>;
  /** Plotting-area width in pixels. */
  viewWidth?: number;
  /** Plotting-area height in pixels. */
  viewHeight?: number;
  /** Roughly how many tick divisions to aim for on each axis. */
  targetDivisions?: number;
  /** Whether to draw the frame's grid lines. Off for the small inset. */
  showGrid?: boolean;
  /** Extra Node options (position, visibility, …). */
  nodeOptions?: NodeOptions;
};

export class CycleDiagramNode extends Node {
  /** Maps display-unit values to pixels inside the plotting area. */
  protected readonly chartTransform: ChartTransform;

  /** Where subclasses add their plots; clipped to the plotting area. */
  protected readonly plotLayer: Node;

  /**
   * Where subclasses add decoration that must NOT be clipped — direction arrows
   * just outside the frame, corner labels that overhang it.
   */
  protected readonly overlayLayer: Node;

  private readonly xGridLines: GridLineSet | null;
  private readonly yGridLines: GridLineSet | null;
  private readonly xTickMarks: TickMarkSet;
  private readonly yTickMarks: TickMarkSet;
  private readonly xTickLabels: TickLabelSet;
  private readonly yTickLabels: TickLabelSet;
  private readonly targetDivisions: number;
  private readonly chartRectangle: ChartRectangle;

  /** Decimal places the current x / y tick spacing calls for. */
  private xDecimalPlaces = 0;
  private yDecimalPlaces = 0;

  public constructor(providedOptions: CycleDiagramNodeOptions) {
    const viewWidth = providedOptions.viewWidth ?? DIAGRAM_VIEW_WIDTH;
    const viewHeight = providedOptions.viewHeight ?? DIAGRAM_VIEW_HEIGHT;
    const targetDivisions = providedOptions.targetDivisions ?? 5;
    const showGrid = providedOptions.showGrid ?? true;

    super();

    this.targetDivisions = targetDivisions;

    this.chartTransform = new ChartTransform({ viewWidth, viewHeight });

    this.chartRectangle = new ChartRectangle(this.chartTransform, {
      fill: CarnotHeatEngineColors.diagramBackgroundColorProperty,
      stroke: CarnotHeatEngineColors.diagramAxisColorProperty,
      lineWidth: 1,
    });

    this.xGridLines = showGrid
      ? new GridLineSet(this.chartTransform, Orientation.HORIZONTAL, 1, {
          stroke: CarnotHeatEngineColors.diagramGridColorProperty,
        })
      : null;
    this.yGridLines = showGrid
      ? new GridLineSet(this.chartTransform, Orientation.VERTICAL, 1, {
          stroke: CarnotHeatEngineColors.diagramGridColorProperty,
        })
      : null;

    this.xTickMarks = new TickMarkSet(this.chartTransform, Orientation.HORIZONTAL, 1, {
      edge: "min",
      stroke: CarnotHeatEngineColors.diagramAxisColorProperty,
      extent: 5,
    });
    this.yTickMarks = new TickMarkSet(this.chartTransform, Orientation.VERTICAL, 1, {
      edge: "min",
      stroke: CarnotHeatEngineColors.diagramAxisColorProperty,
      extent: 5,
    });

    this.xTickLabels = new TickLabelSet(this.chartTransform, Orientation.HORIZONTAL, 1, {
      edge: "min",
      extent: 5,
      createLabel: (value: number) =>
        new Text(formatTickValue(value, this.xDecimalPlaces), {
          font: TICK_LABEL_FONT,
          fill: CarnotHeatEngineColors.textColorProperty,
        }),
    });
    this.yTickLabels = new TickLabelSet(this.chartTransform, Orientation.VERTICAL, 1, {
      edge: "min",
      extent: 5,
      createLabel: (value: number) =>
        new Text(formatTickValue(value, this.yDecimalPlaces), {
          font: TICK_LABEL_FONT,
          fill: CarnotHeatEngineColors.textColorProperty,
        }),
    });

    // The two axis lines the cycle is read against. `value: 0` puts them at the
    // origin when it is in view and clamps them to the frame edge when it is not
    // — which is the usual case here, since P and V never reach zero.
    const xAxisLine = new AxisLine(this.chartTransform, Orientation.HORIZONTAL, {
      stroke: CarnotHeatEngineColors.diagramAxisColorProperty,
      lineWidth: 1,
    });
    const yAxisLine = new AxisLine(this.chartTransform, Orientation.VERTICAL, {
      stroke: CarnotHeatEngineColors.diagramAxisColorProperty,
      lineWidth: 1,
    });

    this.plotLayer = new Node({ clipArea: this.chartRectangle.getShape() });
    this.overlayLayer = new Node();

    // Everything above is drawn in chart coordinates with the plotting area's
    // top-left at the origin; shift the whole group to leave room for labels.
    const chartGroup = new Node({
      children: [
        this.chartRectangle,
        ...(this.xGridLines ? [this.xGridLines] : []),
        ...(this.yGridLines ? [this.yGridLines] : []),
        xAxisLine,
        yAxisLine,
        this.xTickMarks,
        this.yTickMarks,
        this.xTickLabels,
        this.yTickLabels,
        this.plotLayer,
        this.overlayLayer,
      ],
      x: DIAGRAM_LEFT_PADDING,
      y: DIAGRAM_TOP_PADDING,
    });
    this.addChild(chartGroup);

    const titleText = new RichText(providedOptions.titleProperty, {
      font: DIAGRAM_TITLE_FONT,
      fill: CarnotHeatEngineColors.textColorProperty,
      maxWidth: viewWidth,
      centerX: chartGroup.x + viewWidth / 2,
      bottom: DIAGRAM_TOP_PADDING - 6,
    });
    this.addChild(titleText);

    const xAxisLabel = new RichText(providedOptions.xAxisLabelProperty, {
      font: DIAGRAM_TITLE_FONT,
      fill: CarnotHeatEngineColors.secondaryTextColorProperty,
      maxWidth: viewWidth,
      centerX: chartGroup.x + viewWidth / 2,
      top: chartGroup.y + viewHeight + DIAGRAM_BOTTOM_PADDING - 20,
    });
    this.addChild(xAxisLabel);

    const yAxisLabel = new RichText(providedOptions.yAxisLabelProperty, {
      font: DIAGRAM_TITLE_FONT,
      fill: CarnotHeatEngineColors.secondaryTextColorProperty,
      maxWidth: viewHeight,
      rotation: -Math.PI / 2,
      centerY: chartGroup.y + viewHeight / 2,
      left: 2,
    });
    this.addChild(yAxisLabel);

    // Reserve the padding on the right so sibling layout code sees a stable
    // width even when the last x tick label is short.
    this.addChild(
      new Node({
        children: [],
        localBounds: this.chartRectangle.bounds.dilatedX(DIAGRAM_RIGHT_PADDING),
      }),
    );

    this.mutate(providedOptions.nodeOptions);
  }

  /** The plotting area's size in pixels — subclasses size overlays against it. */
  protected get plotViewWidth(): number {
    return this.chartTransform.viewWidth;
  }

  protected get plotViewHeight(): number {
    return this.chartTransform.viewHeight;
  }

  /**
   * Re-range both axes and re-derive the tick spacing and label precision from
   * the new spans. Call whenever the plotted data moves — the cycle's PV extent
   * changes by more than two orders of magnitude across the parameter ranges, so
   * fixed tick spacing is not an option.
   */
  protected setRanges(xRange: Range, yRange: Range): void {
    this.chartTransform.setModelXRange(xRange);
    this.chartTransform.setModelYRange(yRange);

    const xSpacing = niceStep(xRange.getLength(), this.targetDivisions);
    const ySpacing = niceStep(yRange.getLength(), this.targetDivisions);
    this.xDecimalPlaces = decimalPlacesForStep(xSpacing);
    this.yDecimalPlaces = decimalPlacesForStep(ySpacing);

    this.xGridLines?.setSpacing(xSpacing);
    this.yGridLines?.setSpacing(ySpacing);
    this.xTickMarks.setSpacing(xSpacing);
    this.yTickMarks.setSpacing(ySpacing);
    this.xTickLabels.setSpacing(xSpacing);
    this.yTickLabels.setSpacing(ySpacing);
  }
}
