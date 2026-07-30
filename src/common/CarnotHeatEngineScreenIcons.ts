/**
 * CarnotHeatEngineScreenIcons.ts
 *
 * Programmatic home-screen / navigation-bar icons for each screen.
 * Drawn on the standard PhET 548 × 373 canvas using CarnotHeatEngineColors.
 *
 * All three icons share one motif — the actual PV loop of the sim's default
 * cycle, sampled from {@link computeCycleGeometry} rather than hand-drawn, so
 * the icons cannot drift away from the physics. What distinguishes them is what
 * sits beside the loop: the apparatus (Intro), the energy split (Efficiency
 * Lab), or the reversed traversal arrows (Reversed Cycle).
 */
import { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Node, Path, Rectangle } from "scenerystack/scenery";
import { ArrowNode } from "scenerystack/scenery-phet";
import { ScreenIcon } from "scenerystack/sim";
import CarnotHeatEngineColors from "../CarnotHeatEngineColors.js";
import {
  DEFAULT_COMPRESSION_RATIO,
  DEFAULT_N_MOLES,
  DEFAULT_T_COLD,
  DEFAULT_T_HOT,
  GAMMA_PRESETS,
} from "../CarnotHeatEngineConstants.js";
import { computeCycleGeometry, sampleCycle } from "./model/carnotCycleGeometry.js";

const W = 548;
const H = 373;

function background(): Rectangle {
  return new Rectangle(0, 0, W, H, { fill: CarnotHeatEngineColors.backgroundColorProperty });
}

function iconFrom(content: Node): ScreenIcon {
  return new ScreenIcon(content, {
    maxIconWidthProportion: 1,
    maxIconHeightProportion: 1,
    fill: CarnotHeatEngineColors.backgroundColorProperty,
  });
}

/**
 * The default cycle's PV loop, fitted into a `width × height` box at
 * (`left`, `top`). Pressure runs up the screen, so the y mapping is inverted.
 */
function cycleLoopShape(left: number, top: number, width: number, height: number): Shape {
  const geometry = computeCycleGeometry({
    tHot: DEFAULT_T_HOT,
    tCold: DEFAULT_T_COLD,
    compressionRatio: DEFAULT_COMPRESSION_RATIO,
    gamma: GAMMA_PRESETS.MONATOMIC,
    nMoles: DEFAULT_N_MOLES,
  });
  const states = sampleCycle(geometry, 24);

  const volumes = states.map((state) => state.volume);
  const pressures = states.map((state) => state.pressure);
  const minVolume = Math.min(...volumes);
  const maxVolume = Math.max(...volumes);
  const minPressure = Math.min(...pressures);
  const maxPressure = Math.max(...pressures);

  const toView = (volume: number, pressure: number): Vector2 =>
    new Vector2(
      left + (width * (volume - minVolume)) / (maxVolume - minVolume),
      top + height - (height * (pressure - minPressure)) / (maxPressure - minPressure),
    );

  const shape = new Shape();
  states.forEach((state, index) => {
    const point = toView(state.volume, state.pressure);
    if (index === 0) {
      shape.moveToPoint(point);
    } else {
      shape.lineToPoint(point);
    }
  });
  return shape.close();
}

/** The loop as a filled-and-stroked Path, the shared element of all three icons. */
function cycleLoopPath(left: number, top: number, width: number, height: number): Path {
  return new Path(cycleLoopShape(left, top, width, height), {
    stroke: CarnotHeatEngineColors.accentColorProperty,
    lineWidth: 9,
    fill: CarnotHeatEngineColors.workAreaColorProperty,
  });
}

/** Intro: the piston-cylinder apparatus beside the PV loop. */
export function createIntroIcon(): ScreenIcon {
  const cylinder = new Rectangle(70, 90, 130, 200, {
    fill: null,
    stroke: CarnotHeatEngineColors.cylinderColorProperty,
    lineWidth: 12,
    cornerRadius: 6,
  });
  const gas = new Rectangle(82, 195, 106, 83, { fill: CarnotHeatEngineColors.hotColorProperty });
  const piston = new Rectangle(76, 178, 118, 22, { fill: CarnotHeatEngineColors.pistonColorProperty });
  const hotBlock = new Rectangle(10, 210, 50, 70, {
    fill: CarnotHeatEngineColors.hotColorProperty,
    cornerRadius: 5,
  });

  return iconFrom(
    new Node({
      children: [background(), hotBlock, cylinder, gas, piston, cycleLoopPath(250, 80, 250, 220)],
    }),
  );
}

/** Efficiency Lab: the PV loop above the Q_hot → W + Q_cold energy split. */
export function createEfficiencyLabIcon(): ScreenIcon {
  const barLeft = 90;
  const barWidth = 368;
  const efficiency = 1 - DEFAULT_T_COLD / DEFAULT_T_HOT;

  const qHotBar = new Rectangle(barLeft, 250, barWidth, 36, {
    fill: CarnotHeatEngineColors.hotColorProperty,
    cornerRadius: 4,
  });
  const workBar = new Rectangle(barLeft, 300, barWidth * efficiency, 36, {
    fill: CarnotHeatEngineColors.workColorProperty,
    cornerRadius: 4,
  });
  const qColdBar = new Rectangle(barLeft + barWidth * efficiency + 6, 300, barWidth * (1 - efficiency) - 6, 36, {
    fill: CarnotHeatEngineColors.coldColorProperty,
    cornerRadius: 4,
  });

  return iconFrom(
    new Node({
      children: [background(), cycleLoopPath(150, 30, 250, 190), qHotBar, workBar, qColdBar],
    }),
  );
}

/** Reversed Cycle: the same loop, with the traversal arrows pointing the other way. */
export function createReversedCycleIcon(): ScreenIcon {
  const loop = cycleLoopPath(150, 60, 250, 250);

  // Counter-clockwise on a PV diagram: down the left-hand side, right along the
  // bottom. Two arrows are enough to read the sense at navbar size.
  const downArrow = new ArrowNode(150, 130, 150, 250, {
    fill: CarnotHeatEngineColors.coldColorProperty,
    stroke: null,
    headWidth: 34,
    headHeight: 30,
    tailWidth: 12,
  });
  const rightArrow = new ArrowNode(230, 320, 370, 320, {
    fill: CarnotHeatEngineColors.coldColorProperty,
    stroke: null,
    headWidth: 34,
    headHeight: 30,
    tailWidth: 12,
  });

  return iconFrom(
    new Node({
      children: [background(), loop, downArrow, rightArrow],
    }),
  );
}
