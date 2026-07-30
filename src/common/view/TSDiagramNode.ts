/**
 * TSDiagramNode.ts
 *
 * The temperature–entropy diagram: the same four legs of the same cycle, drawn
 * against (S, T) instead of (V, P), where they come out as a **rectangle**.
 * Isothermal legs are horizontal (T constant, S changing); adiabatic legs are
 * vertical (S constant, T changing). The enclosed area is again the net work,
 * this time as a plain width × height — ΔS·(T_hot − T_cold).
 *
 * That is the deferred payoff for the Intro screen's PV-only framing, and the
 * bridge to entropy: the reason η = 1 − T_c/T_h is *visible* here, because both
 * isothermal legs sweep the same ΔS.
 *
 * It is a short file only because {@link CycleDiagramNode} already owns the
 * frame, axes, ticks, and auto-scaling.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { LinePlot } from "scenerystack/bamboo";
import { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, type NodeOptions, Path } from "scenerystack/scenery";
import CarnotHeatEngineColors from "../../CarnotHeatEngineColors.js";
import { PLAYHEAD_RADIUS } from "../../CarnotHeatEngineConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { CycleGeometry, CycleState } from "../model/carnotCycleGeometry.js";
import { CycleDiagramNode } from "./CycleDiagramNode.js";
import { padRange } from "./chartUtils.js";

/** A cycle state as a plotted (S, T) point. Entropy is already in J/K. */
const toPoint = (state: CycleState): Vector2 => new Vector2(state.entropy, state.temperature);

export type TSDiagramNodeOptions = {
  /** The live cycle definition. */
  geometryProperty: TReadOnlyProperty<CycleGeometry>;
  /** The playhead state. */
  stateProperty: TReadOnlyProperty<CycleState>;
  /** Extra Node options (position, visibility, …). */
  nodeOptions?: NodeOptions;
};

export class TSDiagramNode extends CycleDiagramNode {
  private readonly rectanglePlot: LinePlot;
  private readonly workAreaPath: Path;
  private readonly playhead: Circle;
  private readonly geometryProperty: TReadOnlyProperty<CycleGeometry>;

  public constructor(providedOptions: TSDiagramNodeOptions) {
    const diagramStrings = StringManager.getInstance().getDiagrams();

    super({
      titleProperty: diagramStrings.tsTitleStringProperty,
      xAxisLabelProperty: diagramStrings.tsXAxisStringProperty,
      yAxisLabelProperty: diagramStrings.tsYAxisStringProperty,
      targetDivisions: 4,
      ...(providedOptions.nodeOptions && { nodeOptions: providedOptions.nodeOptions }),
    });

    this.geometryProperty = providedOptions.geometryProperty;

    this.workAreaPath = new Path(null, { fill: CarnotHeatEngineColors.workAreaColorProperty });
    this.plotLayer.addChild(this.workAreaPath);

    // One plot for the whole rectangle: unlike the PV diagram there is no need
    // to distinguish the legs by colour, because their orientation already says
    // which is which — horizontal is isothermal, vertical is adiabatic.
    this.rectanglePlot = new LinePlot(this.chartTransform, [], {
      stroke: CarnotHeatEngineColors.accentColorProperty,
      lineWidth: 2,
    });
    this.plotLayer.addChild(this.rectanglePlot);

    this.playhead = new Circle(PLAYHEAD_RADIUS, {
      fill: CarnotHeatEngineColors.playheadColorProperty,
      stroke: CarnotHeatEngineColors.backgroundColorProperty,
      lineWidth: 1,
    });
    this.plotLayer.addChild(this.playhead);

    Multilink.multilinkAny([this.geometryProperty], () => this.updateCycle());
    providedOptions.stateProperty.link((state) => {
      this.playhead.translation = this.chartTransform.modelToViewPosition(toPoint(state));
    });

    this.updateCycle();
  }

  /** Re-range the axes to the cycle's entropy and temperature spans, and redraw. */
  private updateCycle(): void {
    const geometry = this.geometryProperty.value;
    const { tHot, tCold } = geometry.parameters;
    const entropySpan = geometry.entropySpan;

    // Corners in engine order, with the first repeated to close the rectangle.
    const corners = [
      new Vector2(0, tHot),
      new Vector2(entropySpan, tHot),
      new Vector2(entropySpan, tCold),
      new Vector2(0, tCold),
      new Vector2(0, tHot),
    ];

    // MIN_TEMPERATURE_GAP keeps the height well above zero, so padRange's
    // degenerate-window fallback is only ever reached if the ranges are loosened.
    this.setRanges(padRange(0, entropySpan, 0.12), padRange(tCold, tHot, 0.12));

    this.rectanglePlot.setDataSet(corners);

    const shape = new Shape();
    for (let index = 0; index < corners.length; index++) {
      const corner = corners[index];
      if (!corner) {
        continue;
      }
      const viewPoint = this.chartTransform.modelToViewPosition(corner);
      if (index === 0) {
        shape.moveToPoint(viewPoint);
      } else {
        shape.lineToPoint(viewPoint);
      }
    }
    this.workAreaPath.shape = shape.close();
  }
}
