/**
 * ReversedCycleScreenView.ts
 *
 * The Reversed Cycle screen's layout: the PV diagram on the left with its
 * direction arrows flipped, the energy-flow panel beneath it, and the controls
 * down the right-hand edge.
 *
 * The only things that differ from the Efficiency Lab are the traversal
 * direction (set once, in the model's constructor) and the framing — which is
 * exactly the claim the screen is making. Everything else is the same
 * `PVDiagramNode`, the same `EnergyFlowNode`, the same parameter sliders.
 */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { INTER_ELEMENT_GAP, SCREEN_VIEW_MARGIN } from "../../CarnotHeatEngineConstants.js";
import { CarnotHeatEnginePanel } from "../../common/CarnotHeatEnginePanel.js";
import {
  createBackgroundFill,
  createPdomOrderNode,
  createResetAllButton,
  createTimeControlNode,
} from "../../common/view/createScreenChrome.js";
import { EnergyFlowNode } from "../../common/view/EnergyFlowNode.js";
import { PVDiagramNode } from "../../common/view/PVDiagramNode.js";
import type { CarnotHeatEnginePreferencesModel } from "../../preferences/CarnotHeatEnginePreferencesModel.js";
import type { ReversedCycleModel } from "../model/ReversedCycleModel.js";
import { ReversedCycleControlPanel } from "./ReversedCycleControlPanel.js";
import { ReversedCycleScreenSummaryContent } from "./ReversedCycleScreenSummaryContent.js";

// ── Layout offsets specific to this screen, px ────────────────────────────────

/**
 * Left inset of the PV diagram past the screen margin, px — leaves room for the
 * direction-arrowhead labels that overhang the diagram's left edge.
 */
const DIAGRAM_LEFT_INSET = 40;

export type ReversedCycleScreenViewOptions = ScreenViewOptions;

export class ReversedCycleScreenView extends ScreenView {
  public constructor(
    model: ReversedCycleModel,
    preferences: CarnotHeatEnginePreferencesModel,
    providedOptions?: ReversedCycleScreenViewOptions,
  ) {
    const options = optionize<ReversedCycleScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      {
        screenSummaryContent: new ReversedCycleScreenSummaryContent(model),
      },
      providedOptions,
    );
    super(options);

    const backgroundRect = createBackgroundFill(this.layoutBounds);
    this.addChild(backgroundRect);

    const controlPanel = new ReversedCycleControlPanel(model);
    controlPanel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    controlPanel.top = SCREEN_VIEW_MARGIN;
    this.addChild(controlPanel);

    // The direction arrows on this diagram point counter-clockwise, because
    // `model.cycle` was constructed in REFRIGERATOR direction.
    const pvDiagram = new PVDiagramNode({
      geometryProperty: model.cycle.geometryProperty,
      stateProperty: model.cycle.stateProperty,
      activeStageProperty: model.cycle.cycleStageProperty,
      directionProperty: model.cycle.directionProperty,
      showCornerLabelsProperty: preferences.showCornerLabelsProperty,
    });
    pvDiagram.left = SCREEN_VIEW_MARGIN + DIAGRAM_LEFT_INSET;
    pvDiagram.top = SCREEN_VIEW_MARGIN;
    this.addChild(pvDiagram);

    const energyFlowPanel = new CarnotHeatEnginePanel(
      new EnergyFlowNode({
        qHotProperty: model.cycle.qHotProperty,
        qColdProperty: model.cycle.qColdProperty,
        workProperty: model.cycle.workProperty,
        directionProperty: model.cycle.directionProperty,
      }),
    );
    energyFlowPanel.centerX = pvDiagram.centerX;
    energyFlowPanel.top = pvDiagram.bottom + INTER_ELEMENT_GAP;
    this.addChild(energyFlowPanel);

    const timeControl = createTimeControlNode(model);

    const resetAllButton = createResetAllButton(this.layoutBounds, () => {
      model.reset();
      this.reset();
    });
    this.addChild(resetAllButton);

    timeControl.centerX = pvDiagram.centerX;
    timeControl.bottom = this.layoutBounds.maxY - SCREEN_VIEW_MARGIN;
    this.addChild(timeControl);

    this.addChild(createPdomOrderNode(...controlPanel.controlsInOrder, timeControl, resetAllButton));
  }

  /** Resets view-side state. This screen keeps none of its own. */
  public reset(): void {
    // Intentionally empty: every visual here is derived from the model.
  }
}
