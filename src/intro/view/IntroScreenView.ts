/**
 * IntroScreenView.ts
 *
 * The Intro screen's split view: the piston-cylinder apparatus on the left and
 * the PV diagram on the right, sharing one playhead, with the controls in a
 * panel down the right-hand edge and the time control beneath the apparatus.
 *
 * Layout (within layoutBounds 1024 × 618):
 *
 *   ┌──────────────┬──────────────────┬──────────────┐
 *   │  apparatus   │   PV diagram     │   controls   │
 *   │  (piston,    │   (four legs +   │   (T sliders,│
 *   │  reservoirs) │    playhead)     │    gas,      │
 *   │              │                  │    stepper,  │
 *   │ time control │                  │    P/V/T)    │
 *   └──────────────┴──────────────────┴──────────────┘
 *                                        Reset All ↘
 */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { SCREEN_VIEW_MARGIN } from "../../CarnotHeatEngineConstants.js";
import {
  createBackgroundFill,
  createPdomOrderNode,
  createResetAllButton,
  createTimeControlNode,
} from "../../common/view/createScreenChrome.js";
import { PVDiagramNode } from "../../common/view/PVDiagramNode.js";
import type { CarnotHeatEnginePreferencesModel } from "../../preferences/CarnotHeatEnginePreferencesModel.js";
import type { IntroModel } from "../model/IntroModel.js";
import { CarnotCycleNode } from "./CarnotCycleNode.js";
import { IntroControlPanel } from "./IntroControlPanel.js";
import { IntroScreenSummaryContent } from "./IntroScreenSummaryContent.js";

// ── Layout offsets specific to this screen, px ────────────────────────────────

/** Left inset of the apparatus past the screen margin — clears the piston rod. */
const APPARATUS_LEFT_INSET = 45;

/** Top inset of the apparatus past the screen margin — clears the work arrow. */
const APPARATUS_TOP_INSET = 95;

/** Gap between the PV diagram and the right-anchored control panel. */
const DIAGRAM_TO_PANEL_GAP = 16;

export type IntroScreenViewOptions = ScreenViewOptions;

export class IntroScreenView extends ScreenView {
  public constructor(
    model: IntroModel,
    preferences: CarnotHeatEnginePreferencesModel,
    providedOptions?: IntroScreenViewOptions,
  ) {
    const options = optionize<IntroScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      {
        screenSummaryContent: new IntroScreenSummaryContent(model),
      },
      providedOptions,
    );
    super(options);

    const backgroundRect = createBackgroundFill(this.layoutBounds);
    this.addChild(backgroundRect);

    // ── Controls, anchored to the right edge ──────────────────────────────────
    const controlPanel = new IntroControlPanel(model);
    controlPanel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    controlPanel.top = SCREEN_VIEW_MARGIN;
    this.addChild(controlPanel);

    // ── The apparatus ─────────────────────────────────────────────────────────
    const apparatus = new CarnotCycleNode(model.cycle);
    apparatus.left = SCREEN_VIEW_MARGIN + APPARATUS_LEFT_INSET;
    apparatus.top = SCREEN_VIEW_MARGIN + APPARATUS_TOP_INSET;
    this.addChild(apparatus);

    // ── The PV diagram, between the apparatus and the controls ────────────────
    const pvDiagram = new PVDiagramNode({
      geometryProperty: model.cycle.geometryProperty,
      stateProperty: model.cycle.stateProperty,
      activeStageProperty: model.cycle.cycleStageProperty,
      directionProperty: model.cycle.directionProperty,
      showCornerLabelsProperty: preferences.showCornerLabelsProperty,
    });
    // Right-aligned against the panel rather than centred in the gap: the
    // diagram's corner labels overhang its frame, and centring let them collide
    // with the panel edge.
    pvDiagram.right = controlPanel.left - DIAGRAM_TO_PANEL_GAP;
    pvDiagram.top = SCREEN_VIEW_MARGIN;
    this.addChild(pvDiagram);

    // ── Playback, beneath the apparatus ───────────────────────────────────────
    const timeControl = createTimeControlNode(model);
    timeControl.centerX = apparatus.centerX;
    timeControl.bottom = this.layoutBounds.maxY - SCREEN_VIEW_MARGIN;
    this.addChild(timeControl);

    const resetAllButton = createResetAllButton(this.layoutBounds, () => {
      model.reset();
      this.reset();
    });
    this.addChild(resetAllButton);

    // ── Accessibility: keyboard / reading traversal order ─────────────────────
    // The cycle parameters, then the gas, then the stepper, then playback, with
    // Reset All last.
    this.addChild(createPdomOrderNode(...controlPanel.controlsInOrder, timeControl, resetAllButton));
  }

  /** Resets view-side state. The Intro screen keeps none of its own. */
  public reset(): void {
    // Intentionally empty: every visual here is derived from the model.
  }

  // No step() override: joist calls model.step(dt) itself, and nothing in this
  // view animates independently of the model.
}
