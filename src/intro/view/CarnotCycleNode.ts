/**
 * CarnotCycleNode.ts
 *
 * The physical apparatus on the Intro screen: a piston-cylinder with the gas
 * inside it, the two reservoirs, the insulating sleeve, and the heat/work
 * arrows. Its whole job is to give the PV diagram beside it something to *be* —
 * a student who has only ever seen the four curves usually cannot say what the
 * gas is doing on any of them.
 *
 * What it shows, driven entirely by the model:
 *
 *  - **Piston height ∝ volume.** Mapped logarithmically, because the cycle's
 *    volume span reaches 256× and a linear map would leave the piston pinned at
 *    the bottom for most of the cycle.
 *  - **Gas colour ∝ temperature**, interpolated between the cold and hot fills.
 *    A colour cue, not particle kinetics — this sim is not about the micro
 *    picture.
 *  - **Reservoir docking.** The hot block slides against the cylinder base
 *    during the hot isothermal leg, the cold block during the cold one, and
 *    neither during the adiabats.
 *  - **Insulating sleeve** wrapping the cylinder on the adiabatic legs, when
 *    both reservoirs are away.
 *  - **Q and W arrows**, sized by the magnitude of the flow and shown only on
 *    the leg they apply to. Their direction flips with the traversal direction,
 *    so the same node serves an engine and a refrigerator.
 */

import { DerivedProperty, Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Color, Node, type NodeOptions, Rectangle, RichText } from "scenerystack/scenery";
import { ArrowNode } from "scenerystack/scenery-phet";
import CarnotHeatEngineColors from "../../CarnotHeatEngineColors.js";
import { READOUT_FONT, T_COLD_RANGE, T_HOT_RANGE } from "../../CarnotHeatEngineConstants.js";
import type { CarnotCycleModel } from "../../common/model/CarnotCycleModel.js";
import { CycleDirection } from "../../common/model/CycleDirection.js";
import { CycleStage, isColdIsothermal, isHotIsothermal, isIsothermal } from "../../common/model/CycleStage.js";
import { StringManager } from "../../i18n/StringManager.js";

// ── Layout of the apparatus, px ───────────────────────────────────────────────

/** Inner width of the cylinder bore. */
const BORE_WIDTH = 110;

/** Height of the bore at the largest volume in the cycle. */
const BORE_HEIGHT = 250;

/** Thickness of the cylinder walls and base. */
const WALL_THICKNESS = 7;

/** Height of the piston face. */
const PISTON_HEIGHT = 12;

/** Length of the piston rod above the face. */
const ROD_LENGTH = 30;

/** Width of the piston rod. */
const ROD_WIDTH = 12;

/** Size of a reservoir block. */
const RESERVOIR_WIDTH = 68;
const RESERVOIR_HEIGHT = 62;

/** How far a reservoir sits from the cylinder when it is not docked. */
const RESERVOIR_UNDOCKED_GAP = 34;

/** How far a reservoir sits from the cylinder when docked. */
const RESERVOIR_DOCKED_GAP = 2;

/** Smallest drawn gas height so the gas never disappears entirely. */
const MIN_GAS_HEIGHT = 10;

/** Longest a heat or work arrow gets drawn, px. */
const MAX_ARROW_LENGTH = 46;

/** Shortest a heat or work arrow gets drawn, px. */
const MIN_ARROW_LENGTH = 14;

/** Arrowhead width shared by the heat and work arrows, px. */
const ARROW_HEAD_WIDTH = 13;

/** Arrowhead height shared by the heat and work arrows, px. */
const ARROW_HEAD_HEIGHT = 12;

/** Arrow tail width shared by the heat and work arrows, px. */
const ARROW_TAIL_WIDTH = 5;

/**
 * Work-arrow length as a fraction of the max. The per-leg work is not exposed
 * (only the net), so the work arrow is shown at a fixed size and only its
 * direction carries meaning — unlike the heat arrow, which scales by magnitude.
 */
const WORK_ARROW_FRACTION = 0.8;

/** Gap left above the piston face for the work arrow, px. */
const WORK_ARROW_PISTON_GAP = 10;

/** How far an arrow caption sits clear of its arrow, px. */
const ARROW_CAPTION_GAP = 12;

/** How far the insulating sleeve overhangs the cylinder on every side, px. */
const INSULATION_PADDING = 5;

/** Dash pattern of the insulating sleeve outline. */
const INSULATION_LINE_DASH = [7, 4];

export class CarnotCycleNode extends Node {
  public constructor(cycle: CarnotCycleModel, options?: NodeOptions) {
    super();

    const apparatusStrings = StringManager.getInstance().getApparatus();

    // ── Cylinder ──────────────────────────────────────────────────────────────
    const cylinderOuter = new Rectangle(
      -WALL_THICKNESS,
      0,
      BORE_WIDTH + 2 * WALL_THICKNESS,
      BORE_HEIGHT + WALL_THICKNESS,
      {
        fill: CarnotHeatEngineColors.cylinderColorProperty,
        cornerRadius: 3,
      },
    );
    const bore = new Rectangle(0, 0, BORE_WIDTH, BORE_HEIGHT, {
      fill: CarnotHeatEngineColors.backgroundColorProperty,
    });

    // The gas fills the bore from the base upward; its height and colour are set
    // in the multilink below.
    const gas = new Rectangle(0, 0, BORE_WIDTH, BORE_HEIGHT, {});

    // ── Insulating sleeve, shown on the adiabatic legs ────────────────────────
    const insulation = new Rectangle(
      -WALL_THICKNESS - INSULATION_PADDING,
      -INSULATION_PADDING,
      BORE_WIDTH + 2 * WALL_THICKNESS + 2 * INSULATION_PADDING,
      BORE_HEIGHT + WALL_THICKNESS + 2 * INSULATION_PADDING,
      {
        fill: null,
        stroke: CarnotHeatEngineColors.insulationColorProperty,
        lineWidth: INSULATION_PADDING,
        lineDash: INSULATION_LINE_DASH,
        cornerRadius: INSULATION_PADDING,
      },
    );
    const insulationLabel = new RichText(apparatusStrings.insulatedStringProperty, {
      font: READOUT_FONT,
      fill: CarnotHeatEngineColors.insulationColorProperty,
      maxWidth: BORE_WIDTH + 40,
      centerX: BORE_WIDTH / 2,
      bottom: -12,
    });

    // ── Piston ────────────────────────────────────────────────────────────────
    const pistonFace = new Rectangle(-2, 0, BORE_WIDTH + 4, PISTON_HEIGHT, {
      fill: CarnotHeatEngineColors.pistonColorProperty,
      cornerRadius: 2,
    });
    const pistonRod = new Rectangle((BORE_WIDTH - ROD_WIDTH) / 2, -ROD_LENGTH, ROD_WIDTH, ROD_LENGTH, {
      fill: CarnotHeatEngineColors.cylinderColorProperty,
    });
    const piston = new Node({ children: [pistonRod, pistonFace] });

    // ── Reservoirs ────────────────────────────────────────────────────────────
    const hotReservoir = createReservoir(
      apparatusStrings.hotReservoirStringProperty,
      CarnotHeatEngineColors.hotColorProperty,
    );
    const coldReservoir = createReservoir(
      apparatusStrings.coldReservoirStringProperty,
      CarnotHeatEngineColors.coldColorProperty,
    );
    hotReservoir.centerY = BORE_HEIGHT - RESERVOIR_HEIGHT / 2;
    coldReservoir.centerY = BORE_HEIGHT - RESERVOIR_HEIGHT / 2;

    // ── Heat and work arrows ──────────────────────────────────────────────────
    // The heat arrow lives between the docked reservoir and the cylinder; the
    // work arrow rides above the piston rod.
    const heatArrow = new ArrowNode(0, 0, 0, 0, {
      fill: CarnotHeatEngineColors.hotColorProperty,
      stroke: null,
      headWidth: ARROW_HEAD_WIDTH,
      headHeight: ARROW_HEAD_HEIGHT,
      tailWidth: ARROW_TAIL_WIDTH,
    });
    const heatLabel = new RichText("", {
      font: READOUT_FONT,
      fill: CarnotHeatEngineColors.hotColorProperty,
      maxWidth: 60,
    });
    const workArrow = new ArrowNode(0, 0, 0, 0, {
      fill: CarnotHeatEngineColors.workColorProperty,
      stroke: null,
      headWidth: ARROW_HEAD_WIDTH,
      headHeight: ARROW_HEAD_HEIGHT,
      tailWidth: ARROW_TAIL_WIDTH,
    });
    const workLabel = new RichText("", {
      font: READOUT_FONT,
      fill: CarnotHeatEngineColors.workColorProperty,
      maxWidth: 60,
    });

    this.children = [
      insulation,
      insulationLabel,
      hotReservoir,
      coldReservoir,
      cylinderOuter,
      bore,
      gas,
      piston,
      heatArrow,
      heatLabel,
      workArrow,
      workLabel,
    ];

    // ── Live wiring ───────────────────────────────────────────────────────────

    // Piston height and gas colour follow the playhead every frame. The two gas
    // colours are dependencies too: otherwise toggling Projector Mode would
    // refresh every other coloured element but leave the gas fill in the old
    // profile until the next state change.
    Multilink.multilink(
      [
        cycle.stateProperty,
        cycle.geometryProperty,
        CarnotHeatEngineColors.gasColdColorProperty,
        CarnotHeatEngineColors.gasHotColorProperty,
      ],
      (state, geometry) => {
        const gasHeight = gasHeightFor(state.volume, geometry.volumeRange.min, geometry.volumeRange.max);
        gas.setRect(0, BORE_HEIGHT - gasHeight, BORE_WIDTH, gasHeight);
        gas.fill = gasColorFor(state.temperature);
        piston.bottom = BORE_HEIGHT - gasHeight;
        // Keep the arrows pinned to the piston as it moves.
        workArrow.centerX = BORE_WIDTH / 2;
        // Clear of the bore, so the caption never sits on the cylinder wall.
        workLabel.left = BORE_WIDTH + WALL_THICKNESS + ARROW_CAPTION_GAP;
      },
    );

    // Reservoir docking and sleeve visibility key off the leg alone, not off the
    // playhead position within it — and not off the direction either, since the
    // same leg touches the same reservoir whichever way it is traversed.
    cycle.cycleStageProperty.link((stage) => {
      const hotDocked = isHotIsothermal(stage);
      const coldDocked = isColdIsothermal(stage);

      hotReservoir.right = -(hotDocked ? RESERVOIR_DOCKED_GAP : RESERVOIR_UNDOCKED_GAP) - WALL_THICKNESS;
      coldReservoir.left = BORE_WIDTH + (coldDocked ? RESERVOIR_DOCKED_GAP : RESERVOIR_UNDOCKED_GAP) + WALL_THICKNESS;
      hotReservoir.opacity = hotDocked ? 1 : 0.45;
      coldReservoir.opacity = coldDocked ? 1 : 0.45;

      const adiabatic = !isIsothermal(stage);
      insulation.visible = adiabatic;
      insulationLabel.visible = adiabatic;
    });

    // Arrow geometry: which way heat and work flow on this leg, and how big.
    Multilink.multilink(
      [cycle.cycleStageProperty, cycle.directionProperty, cycle.qHotProperty, cycle.qColdProperty],
      (stage, direction, qHot, qCold) => {
        const engine = direction === CycleDirection.ENGINE;
        const largestHeat = Math.max(qHot, qCold, Number.EPSILON);

        // Heat arrow: only on the isothermal legs, on the side of the reservoir
        // it is exchanging with, pointing into the cylinder when heat is
        // absorbed and away when it is rejected.
        if (isIsothermal(stage)) {
          const hotLeg = isHotIsothermal(stage);
          const heat = hotLeg ? qHot : qCold;
          // An engine absorbs on the hot leg and rejects on the cold one; a
          // refrigerator does exactly the opposite.
          const intoCylinder = heatIntoCylinder(stage, direction);
          const length = arrowLengthFor(heat, largestHeat);
          const y = BORE_HEIGHT - RESERVOIR_HEIGHT / 2;
          const outerX = hotLeg
            ? -WALL_THICKNESS - RESERVOIR_DOCKED_GAP
            : BORE_WIDTH + WALL_THICKNESS + RESERVOIR_DOCKED_GAP;
          const inwardSign = hotLeg ? 1 : -1;
          const tipX = outerX + inwardSign * (intoCylinder ? length : 0);
          const tailX = outerX + inwardSign * (intoCylinder ? 0 : length);
          heatArrow.setTailAndTip(tailX, y, tipX, y);
          heatArrow.visible = true;
          heatArrow.fill = hotLeg ? CarnotHeatEngineColors.hotColorProperty : CarnotHeatEngineColors.coldColorProperty;
          heatLabel.fill = heatArrow.fill;
          heatLabel.visible = true;
          heatLabel.centerX = (tailX + tipX) / 2;
          heatLabel.bottom = y - ARROW_CAPTION_GAP;
        } else {
          heatArrow.visible = false;
          heatLabel.visible = false;
        }

        // Work arrow: always present, above the piston. It points up (out of the
        // system) while the gas expands and down (in) while it is compressed.
        const expanding = isExpanding(stage, engine);
        const workLength = MAX_ARROW_LENGTH * WORK_ARROW_FRACTION;
        const topY = piston.top - WORK_ARROW_PISTON_GAP;
        workArrow.setTailAndTip(
          BORE_WIDTH / 2,
          expanding ? topY : topY - workLength,
          BORE_WIDTH / 2,
          expanding ? topY - workLength : topY,
        );
        workLabel.centerY = topY - workLength / 2;
      },
    );

    // Arrow captions follow the traversal direction: what is "Q in" for an
    // engine is "Q out" for a refrigerator on the very same leg.
    const strings = StringManager.getInstance().getApparatus();
    heatLabel.stringProperty = new DerivedProperty(
      [cycle.cycleStageProperty, cycle.directionProperty, strings.heatInStringProperty, strings.heatOutStringProperty],
      (stage, direction, heatIn, heatOut) => {
        const intoCylinder = heatIntoCylinder(stage, direction);
        return intoCylinder ? heatIn : heatOut;
      },
    );
    workLabel.stringProperty = new DerivedProperty(
      [cycle.cycleStageProperty, cycle.directionProperty, strings.workOutStringProperty, strings.workInStringProperty],
      (stage, direction, workOut, workIn) =>
        isExpanding(stage, direction === CycleDirection.ENGINE) ? workOut : workIn,
    );

    // Both reservoirs slide in and out, which would otherwise change this node's
    // bounds every leg and drag the cylinder sideways under a `left`-anchored
    // layout. Pin the bounds to the widest arrangement so the apparatus holds
    // still and only the reservoirs move.
    this.localBounds = this.localBounds
      .withMinX(-WALL_THICKNESS - RESERVOIR_UNDOCKED_GAP - RESERVOIR_WIDTH)
      .withMaxX(BORE_WIDTH + WALL_THICKNESS + RESERVOIR_UNDOCKED_GAP + RESERVOIR_WIDTH);

    this.mutate(options);
  }
}

/** Whether the gas is expanding on `stage` when traversed forwards or backwards. */
const isExpanding = (stage: CycleStage, forward: boolean): boolean => {
  const expandsForward = stage === CycleStage.ISOTHERMAL_EXPANSION || stage === CycleStage.ADIABATIC_EXPANSION;
  return forward === expandsForward;
};

/**
 * Whether heat flows *into* the cylinder on `stage` under `direction`. An engine
 * absorbs on the hot leg and rejects on the cold one; a refrigerator does the
 * opposite. The arrow geometry and its caption both read this so they cannot
 * drift apart.
 */
const heatIntoCylinder = (stage: CycleStage, direction: CycleDirection): boolean =>
  (direction === CycleDirection.ENGINE) === isHotIsothermal(stage);

/**
 * Piston position for a volume, mapped logarithmically between the cycle's own
 * extremes. A linear map is unusable here: at the top of the parameter ranges
 * V_max/V_min reaches 256, so three of the four corners would sit within a few
 * pixels of the cylinder base.
 */
const gasHeightFor = (volume: number, minVolume: number, maxVolume: number): number => {
  if (!(Number.isFinite(volume) && maxVolume > minVolume && minVolume > 0)) {
    return MIN_GAS_HEIGHT;
  }
  const fraction = Math.log(volume / minVolume) / Math.log(maxVolume / minVolume);
  const clamped = Math.min(1, Math.max(0, fraction));
  return MIN_GAS_HEIGHT + clamped * (BORE_HEIGHT - MIN_GAS_HEIGHT - PISTON_HEIGHT);
};

/**
 * Gas fill interpolated between the cold and hot profile colours over the full
 * temperature range the sim allows, so the same temperature always reads as the
 * same colour regardless of where the reservoirs happen to be set.
 */
const gasColorFor = (temperature: number): Color => {
  const min = T_COLD_RANGE.min;
  const max = T_HOT_RANGE.max;
  const fraction = Math.min(1, Math.max(0, (temperature - min) / (max - min)));
  return Color.interpolateRGBA(
    CarnotHeatEngineColors.gasColdColorProperty.value,
    CarnotHeatEngineColors.gasHotColorProperty.value,
    fraction,
  );
};

/** Arrow length scaled by magnitude, floored so a small flow is still visible. */
const arrowLengthFor = (magnitude: number, largestMagnitude: number): number => {
  if (!(Number.isFinite(magnitude) && largestMagnitude > 0)) {
    return MIN_ARROW_LENGTH;
  }
  const fraction = Math.min(1, Math.max(0, magnitude / largestMagnitude));
  return MIN_ARROW_LENGTH + fraction * (MAX_ARROW_LENGTH - MIN_ARROW_LENGTH);
};

/** A reservoir block with its name beneath it. */
const createReservoir = (
  labelProperty: TReadOnlyProperty<string>,
  fill: typeof CarnotHeatEngineColors.hotColorProperty,
): Node => {
  const block = new Rectangle(0, 0, RESERVOIR_WIDTH, RESERVOIR_HEIGHT, { fill, cornerRadius: 4 });
  const label = new RichText(labelProperty, {
    font: READOUT_FONT,
    fill: CarnotHeatEngineColors.textColorProperty,
    maxWidth: RESERVOIR_WIDTH + 24,
    centerX: RESERVOIR_WIDTH / 2,
    top: RESERVOIR_HEIGHT + 4,
  });
  return new Node({ children: [block, label] });
};
