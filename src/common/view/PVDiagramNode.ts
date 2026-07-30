/**
 * PVDiagramNode.ts
 *
 * The pressure–volume diagram, shared by all three screens. It draws:
 *
 *  - the four analytic legs, each in its own semantic colour (hot isotherm red,
 *    cold isotherm blue, both adiabats violet), with the leg the playhead is on
 *    drawn thicker;
 *  - the enclosed area, tinted in the work colour — the area *is* the net work,
 *    and tinting it is the cheapest way to make that land;
 *  - a direction arrowhead at each leg's midpoint, which flips with
 *    `directionProperty` and is the whole visual argument of the Reversed Cycle
 *    screen;
 *  - the four corner states, numbered 1–4 (preference-gated);
 *  - the playhead, and optionally a ghosted previous cycle underneath.
 *
 * Both axes auto-scale to the current cycle's bounding box. That is not
 * cosmetic: across the parameter ranges the volume span runs from about 3× to
 * 256× and the pressure span from 3× to 1000×, so a fixed scale would put most
 * cycles off-screen or in a corner.
 *
 * Everything is plotted in litres and kilopascals to match the axis labels; the
 * model works in m³ and Pa.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { LinePlot } from "scenerystack/bamboo";
import { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, type NodeOptions, Path, Text } from "scenerystack/scenery";
import { ArrowNode } from "scenerystack/scenery-phet";
import CarnotHeatEngineColors from "../../CarnotHeatEngineColors.js";
import { PLAYHEAD_RADIUS, TICK_LABEL_FONT } from "../../CarnotHeatEngineConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import { CycleDirection } from "../model/CycleDirection.js";
import { CYCLE_STAGE_ORDER, type CycleStage, isColdIsothermal, isHotIsothermal } from "../model/CycleStage.js";
import type { CycleGeometry, CycleShape, CycleState } from "../model/carnotCycleGeometry.js";
import { sampleLeg } from "../model/carnotCycleGeometry.js";
import { CycleDiagramNode } from "./CycleDiagramNode.js";
import { extentOf, padRange } from "./chartUtils.js";

/** m³ → litres, the unit the volume axis is labelled in. */
const toLitres = (volumeM3: number): number => volumeM3 * 1000;

/** Pa → kPa, the unit the pressure axis is labelled in. */
const toKilopascals = (pressurePa: number): number => pressurePa / 1000;

/** A cycle state as a plotted (V, P) point in display units. */
const toPoint = (state: CycleState): Vector2 => new Vector2(toLitres(state.volume), toKilopascals(state.pressure));

/** Half-length of the direction arrowheads, px. */
const DIRECTION_ARROW_LENGTH = 16;

export type PVDiagramNodeOptions = {
  /** The live cycle definition. */
  geometryProperty: TReadOnlyProperty<CycleGeometry>;
  /** The playhead state. */
  stateProperty: TReadOnlyProperty<CycleState>;
  /** The leg the playhead is on — drawn thicker than the rest. */
  activeStageProperty: TReadOnlyProperty<CycleStage>;
  /** Which way the cycle is being traversed; flips the direction arrowheads. */
  directionProperty: TReadOnlyProperty<CycleDirection>;
  /** The previous cycle, drawn ghosted underneath. Omit for no ghost. */
  ghostGeometryProperty?: TReadOnlyProperty<CycleGeometry | null>;
  /** Whether the ghost is drawn, when a ghost geometry is supplied. */
  showGhostProperty?: TReadOnlyProperty<boolean>;
  /** Whether corner states are numbered 1–4 (a Preferences toggle). */
  showCornerLabelsProperty?: TReadOnlyProperty<boolean>;
  /** Extra Node options (position, …). */
  nodeOptions?: NodeOptions;
};

export class PVDiagramNode extends CycleDiagramNode {
  private readonly legPlots: Map<CycleStage, LinePlot>;
  private readonly ghostPlot: LinePlot;
  private readonly workAreaPath: Path;
  private readonly directionArrows: Map<CycleStage, ArrowNode>;
  private readonly cornerMarkers: Circle[];
  private readonly cornerLabels: Text[];
  private readonly playhead: Circle;

  private readonly geometryProperty: TReadOnlyProperty<CycleGeometry>;
  private readonly activeStageProperty: TReadOnlyProperty<CycleStage>;
  private readonly directionProperty: TReadOnlyProperty<CycleDirection>;
  private readonly ghostGeometryProperty: TReadOnlyProperty<CycleGeometry | null> | null;
  private readonly showGhostProperty: TReadOnlyProperty<boolean> | null;

  public constructor(providedOptions: PVDiagramNodeOptions) {
    const diagramStrings = StringManager.getInstance().getDiagrams();

    super({
      titleProperty: diagramStrings.pvTitleStringProperty,
      xAxisLabelProperty: diagramStrings.pvXAxisStringProperty,
      yAxisLabelProperty: diagramStrings.pvYAxisStringProperty,
      ...(providedOptions.nodeOptions && { nodeOptions: providedOptions.nodeOptions }),
    });

    this.geometryProperty = providedOptions.geometryProperty;
    this.activeStageProperty = providedOptions.activeStageProperty;
    this.directionProperty = providedOptions.directionProperty;
    this.ghostGeometryProperty = providedOptions.ghostGeometryProperty ?? null;
    this.showGhostProperty = providedOptions.showGhostProperty ?? null;

    // ── Ghosted previous cycle, furthest back ─────────────────────────────────
    this.ghostPlot = new LinePlot(this.chartTransform, [], {
      stroke: CarnotHeatEngineColors.ghostPathColorProperty,
      lineWidth: 2,
      lineDash: [4, 3],
      visible: false,
    });
    this.plotLayer.addChild(this.ghostPlot);

    // ── Enclosed area = net work ──────────────────────────────────────────────
    this.workAreaPath = new Path(null, { fill: CarnotHeatEngineColors.workAreaColorProperty });
    this.plotLayer.addChild(this.workAreaPath);

    // ── The four legs ─────────────────────────────────────────────────────────
    this.legPlots = new Map();
    for (const stage of CYCLE_STAGE_ORDER) {
      const plot = new LinePlot(this.chartTransform, [], {
        stroke: legColorProperty(stage),
        lineWidth: 2,
      });
      this.legPlots.set(stage, plot);
      this.plotLayer.addChild(plot);
    }

    // ── Direction arrowheads, one per leg ─────────────────────────────────────
    this.directionArrows = new Map();
    for (const stage of CYCLE_STAGE_ORDER) {
      const arrow = new ArrowNode(0, 0, 0, 0, {
        fill: legColorProperty(stage),
        stroke: null,
        headWidth: 10,
        headHeight: 10,
        tailWidth: 0.01,
      });
      this.directionArrows.set(stage, arrow);
      this.plotLayer.addChild(arrow);
    }

    // ── Corner markers and their 1–4 labels ───────────────────────────────────
    this.cornerMarkers = [];
    this.cornerLabels = [];
    for (let index = 0; index < 4; index++) {
      const marker = new Circle(3, { fill: CarnotHeatEngineColors.cornerMarkerColorProperty });
      const label = new Text(String(index + 1), {
        font: TICK_LABEL_FONT,
        fill: CarnotHeatEngineColors.cornerMarkerColorProperty,
      });
      this.cornerMarkers.push(marker);
      this.cornerLabels.push(label);
      this.plotLayer.addChild(marker);
      this.overlayLayer.addChild(label);
    }

    if (providedOptions.showCornerLabelsProperty) {
      providedOptions.showCornerLabelsProperty.link((visible) => {
        for (const label of this.cornerLabels) {
          label.visible = visible;
        }
      });
    }

    // ── Playhead, drawn on top of everything in the plot area ─────────────────
    this.playhead = new Circle(PLAYHEAD_RADIUS, {
      fill: CarnotHeatEngineColors.playheadColorProperty,
      stroke: CarnotHeatEngineColors.backgroundColorProperty,
      lineWidth: 1,
    });
    this.plotLayer.addChild(this.playhead);

    // The cycle's shape depends on the geometry, the ghost, and which leg is
    // active; the playhead alone moves every frame, so it gets its own link.
    const cycleDependencies: TReadOnlyProperty<unknown>[] = [
      this.geometryProperty,
      this.activeStageProperty,
      this.directionProperty,
    ];
    if (this.ghostGeometryProperty) {
      cycleDependencies.push(this.ghostGeometryProperty);
    }
    if (this.showGhostProperty) {
      cycleDependencies.push(this.showGhostProperty);
    }
    Multilink.multilinkAny(cycleDependencies, () => this.updateCycle());

    providedOptions.stateProperty.link((state) => {
      this.playhead.translation = this.chartTransform.modelToViewPosition(toPoint(state));
    });

    this.updateCycle();
  }

  /**
   * Re-range the axes to fit the cycle (and the ghost, if showing) and redraw
   * every leg, arrowhead, corner marker, and the work-area fill.
   */
  private updateCycle(): void {
    const geometry = this.geometryProperty.value;
    const ghost = this.ghostVisible() ? this.ghostGeometryProperty?.value : null;

    const legSamples = new Map<CycleStage, Vector2[]>();
    for (const stage of CYCLE_STAGE_ORDER) {
      legSamples.set(stage, sampleLeg(geometry, stage).map(toPoint));
    }
    const ghostSamples = ghost ? cyclePoints(ghost) : [];

    // ── Auto-scale ────────────────────────────────────────────────────────────
    const allPoints = [...legSamples.values()].flat().concat(ghostSamples);
    const xExtent = extentOf(allPoints.map((point) => point.x));
    const yExtent = extentOf(allPoints.map((point) => point.y));
    if (xExtent && yExtent) {
      this.setRanges(padRange(xExtent.min, xExtent.max), padRange(yExtent.min, yExtent.max));
    }

    // ── Legs, thicker where the playhead is ───────────────────────────────────
    const activeStage = this.activeStageProperty.value;
    for (const stage of CYCLE_STAGE_ORDER) {
      const plot = this.legPlots.get(stage);
      const samples = legSamples.get(stage);
      if (!(plot && samples)) {
        continue;
      }
      plot.setDataSet(samples);
      plot.lineWidth = stage === activeStage ? 4 : 2;
    }

    this.ghostPlot.setDataSet(ghostSamples);
    this.ghostPlot.visible = ghostSamples.length > 0;

    // ── Enclosed area ─────────────────────────────────────────────────────────
    this.workAreaPath.shape = closedViewShape(
      this.chartTransform,
      CYCLE_STAGE_ORDER.flatMap((stage) => legSamples.get(stage) ?? []),
    );

    // ── Direction arrowheads at leg midpoints ─────────────────────────────────
    const forward = this.directionProperty.value === CycleDirection.ENGINE;
    for (const stage of CYCLE_STAGE_ORDER) {
      const arrow = this.directionArrows.get(stage);
      const samples = legSamples.get(stage);
      if (!(arrow && samples && samples.length >= 2)) {
        continue;
      }
      this.positionDirectionArrow(arrow, samples, forward);
    }

    // ── Corner markers and labels ─────────────────────────────────────────────
    const cornerViewPoints = geometry.corners.map((corner) => this.chartTransform.modelToViewPosition(toPoint(corner)));
    const centroid = averageOf(cornerViewPoints);
    for (let index = 0; index < cornerViewPoints.length; index++) {
      const viewPoint = cornerViewPoints[index];
      const marker = this.cornerMarkers[index];
      const label = this.cornerLabels[index];
      if (!(viewPoint && marker && label)) {
        continue;
      }
      marker.translation = viewPoint;
      // Push each label away from the middle of the cycle so it never sits on
      // top of the path it is labelling.
      const outward = viewPoint.minus(centroid);
      const offset = outward.magnitude > 1e-6 ? outward.normalized().timesScalar(12) : new Vector2(0, -12);
      label.center = viewPoint.plus(offset);
    }
  }

  /** Whether a ghost geometry exists and is currently meant to be shown. */
  private ghostVisible(): boolean {
    if (!this.ghostGeometryProperty) {
      return false;
    }
    return this.showGhostProperty ? this.showGhostProperty.value : true;
  }

  /**
   * Put an arrowhead at the leg's midpoint, pointing the way the playhead
   * travels. The arrow is drawn as a short tail plus a head so that reversing
   * the cycle only changes which sample is the tip.
   */
  private positionDirectionArrow(arrow: ArrowNode, samples: readonly Vector2[], forward: boolean): void {
    const midIndex = Math.floor(samples.length / 2);
    const beforeIndex = Math.max(0, midIndex - 1);
    const afterIndex = Math.min(samples.length - 1, midIndex + 1);
    const before = samples[forward ? beforeIndex : afterIndex];
    const after = samples[forward ? afterIndex : beforeIndex];
    if (!(before && after)) {
      return;
    }
    const tail = this.chartTransform.modelToViewPosition(before);
    const head = this.chartTransform.modelToViewPosition(after);
    const along = head.minus(tail);
    if (along.magnitude < 1e-6) {
      arrow.visible = false;
      return;
    }
    arrow.visible = true;
    const direction = along.normalized();
    const center = tail.plus(head).timesScalar(0.5);
    const tip = center.plus(direction.timesScalar(DIRECTION_ARROW_LENGTH / 2));
    const base = center.minus(direction.timesScalar(DIRECTION_ARROW_LENGTH / 2));
    arrow.setTailAndTip(base.x, base.y, tip.x, tip.y);
  }
}

/** The semantic colour of a leg: hot isotherm, cold isotherm, or adiabat. */
const legColorProperty = (stage: CycleStage) => {
  if (isHotIsothermal(stage)) {
    return CarnotHeatEngineColors.hotColorProperty;
  }
  if (isColdIsothermal(stage)) {
    return CarnotHeatEngineColors.coldColorProperty;
  }
  return CarnotHeatEngineColors.adiabaticColorProperty;
};

/** Every plotted (V, P) point around a whole cycle, in engine order. */
const cyclePoints = (shape: CycleShape): Vector2[] =>
  CYCLE_STAGE_ORDER.flatMap((stage, index) => {
    const samples = sampleLeg(shape, stage).map(toPoint);
    // Drop each later leg's first sample: it duplicates the previous leg's last.
    return index === 0 ? samples : samples.slice(1);
  });

/** A closed kite Shape through `modelPoints`, in view coordinates. */
const closedViewShape = (
  chartTransform: { modelToViewPosition: (point: Vector2) => Vector2 },
  modelPoints: readonly Vector2[],
): Shape | null => {
  if (modelPoints.length < 3) {
    return null;
  }
  const shape = new Shape();
  for (let index = 0; index < modelPoints.length; index++) {
    const modelPoint = modelPoints[index];
    if (!modelPoint) {
      continue;
    }
    const viewPoint = chartTransform.modelToViewPosition(modelPoint);
    if (index === 0) {
      shape.moveToPoint(viewPoint);
    } else {
      shape.lineToPoint(viewPoint);
    }
  }
  return shape.close();
};

/** Arithmetic mean of a set of points; the zero vector when there are none. */
const averageOf = (points: readonly Vector2[]): Vector2 => {
  if (points.length === 0) {
    return Vector2.ZERO;
  }
  let sum = new Vector2(0, 0);
  for (const point of points) {
    sum = sum.plus(point);
  }
  return sum.timesScalar(1 / points.length);
};
