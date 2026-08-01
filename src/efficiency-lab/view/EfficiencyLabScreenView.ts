/**
 * EfficiencyLabScreenView.ts
 *
 * The Efficiency Lab's layout: the PV diagram at the left with the optional T–S
 * diagram beside it, the energy-budget panel in the middle, and the controls
 * down the right-hand edge.
 *
 *   ┌──────────────┬──────────────┬──────────────┐
 *   │  PV diagram  │  T–S diagram │   controls   │
 *   │  (+ ghost)   │  (optional)  │  (sliders,   │
 *   ├──────────────┼──────────────┤   checkboxes,│
 *   │  energy flow │  [η inset]   │   mode)      │
 *   │  + η         │  [Measure]   │              │
 *   └──────────────┴──────────────┴──────────────┘
 *
 * The T–S diagram and the η-vs-T_cold inset are hidden by default: they are
 * answers to questions a student has not asked yet on first arrival. Their
 * checkboxes are how the screen grows with them.
 */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { INTER_ELEMENT_GAP, SCREEN_VIEW_MARGIN } from "../../CarnotHeatEngineConstants.js";
import {
  createBackgroundFill,
  createPdomOrderNode,
  createResetAllButton,
  createTimeControlNode,
} from "../../common/view/createScreenChrome.js";
import { PVDiagramNode } from "../../common/view/PVDiagramNode.js";
import { TSDiagramNode } from "../../common/view/TSDiagramNode.js";
import type { CarnotHeatEnginePreferencesModel } from "../../preferences/CarnotHeatEnginePreferencesModel.js";
import type { EfficiencyLabModel } from "../model/EfficiencyLabModel.js";
import { CarnotLimitInsetNode } from "./CarnotLimitInsetNode.js";
import { EfficiencyLabControlPanel } from "./EfficiencyLabControlPanel.js";
import { EfficiencyLabScreenSummaryContent } from "./EfficiencyLabScreenSummaryContent.js";
import { EfficiencyPanelNode } from "./EfficiencyPanelNode.js";
import { MeasurePanelNode } from "./MeasurePanelNode.js";

// ── Layout offsets specific to this screen, px ────────────────────────────────

/** Gap between a panel/diagram and its neighbour to the right, px. */
const PANEL_NEIGHBOUR_GAP = 16;

/** Top offset of the Measure panel off the energy panel's top, px. */
const MEASURE_PANEL_TOP_OFFSET = 150;

/** Gap between the time control and the reset button, px. */
const TIME_CONTROL_TO_RESET_GAP = 24;

export type EfficiencyLabScreenViewOptions = ScreenViewOptions;

export class EfficiencyLabScreenView extends ScreenView {
  public constructor(
    model: EfficiencyLabModel,
    preferences: CarnotHeatEnginePreferencesModel,
    providedOptions?: EfficiencyLabScreenViewOptions,
  ) {
    const options = optionize<EfficiencyLabScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      {
        screenSummaryContent: new EfficiencyLabScreenSummaryContent(model),
      },
      providedOptions,
    );
    super(options);

    const backgroundRect = createBackgroundFill(this.layoutBounds);
    this.addChild(backgroundRect);

    // ── Controls, anchored to the right edge ──────────────────────────────────
    const controlPanel = new EfficiencyLabControlPanel(model);
    controlPanel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    controlPanel.top = SCREEN_VIEW_MARGIN;
    this.addChild(controlPanel);

    // ── PV diagram, with the ghosted previous cycle ───────────────────────────
    const pvDiagram = new PVDiagramNode({
      geometryProperty: model.cycle.geometryProperty,
      stateProperty: model.cycle.stateProperty,
      activeStageProperty: model.cycle.cycleStageProperty,
      directionProperty: model.cycle.directionProperty,
      ghostGeometryProperty: model.ghostGeometryProperty,
      showGhostProperty: model.showGhostProperty,
      showCornerLabelsProperty: preferences.showCornerLabelsProperty,
    });
    pvDiagram.left = SCREEN_VIEW_MARGIN;
    pvDiagram.top = SCREEN_VIEW_MARGIN;
    this.addChild(pvDiagram);

    // ── T–S diagram, off by default ───────────────────────────────────────────
    const tsDiagram = new TSDiagramNode({
      geometryProperty: model.cycle.geometryProperty,
      stateProperty: model.cycle.stateProperty,
    });
    tsDiagram.left = pvDiagram.right + INTER_ELEMENT_GAP;
    tsDiagram.top = SCREEN_VIEW_MARGIN;
    this.addChild(tsDiagram);
    model.showEntropyDiagramProperty.link((visible) => {
      tsDiagram.visible = visible;
    });

    // ── Energy budget + Measure self-check ────────────────────────────────────
    const efficiencyPanel = new EfficiencyPanelNode(model);
    efficiencyPanel.left = SCREEN_VIEW_MARGIN;
    efficiencyPanel.top = pvDiagram.bottom + INTER_ELEMENT_GAP;
    this.addChild(efficiencyPanel);

    // ── η-vs-T_cold reference inset, off by default ───────────────────────────
    const limitInset = new CarnotLimitInsetNode({
      tHotProperty: model.cycle.tHotProperty,
      tColdProperty: model.cycle.tColdProperty,
    });
    limitInset.left = efficiencyPanel.right + PANEL_NEIGHBOUR_GAP;
    limitInset.top = efficiencyPanel.top;
    this.addChild(limitInset);
    model.showCarnotLimitProperty.link((visible) => {
      limitInset.visible = visible;
    });

    // ── Measure-mode self-check, in the middle column ─────────────────────────
    // Its own panel, and positioned off a fixed y rather than off the inset
    // above it, so toggling either one never moves the other.
    const measurePanel = new MeasurePanelNode(model);
    measurePanel.left = efficiencyPanel.right + PANEL_NEIGHBOUR_GAP;
    measurePanel.top = efficiencyPanel.top + MEASURE_PANEL_TOP_OFFSET;
    this.addChild(measurePanel);

    // ── Playback ──────────────────────────────────────────────────────────────
    const timeControl = createTimeControlNode(model);

    const resetAllButton = createResetAllButton(this.layoutBounds, () => {
      model.reset();
      this.reset();
    });
    this.addChild(resetAllButton);

    // The speed radio buttons make the time control wide, so it is placed off
    // the reset button rather than off the panel above it.
    timeControl.right = resetAllButton.left - TIME_CONTROL_TO_RESET_GAP;
    timeControl.bottom = this.layoutBounds.maxY - SCREEN_VIEW_MARGIN;
    this.addChild(timeControl);

    // ── Accessibility: keyboard / reading traversal order ─────────────────────
    this.addChild(
      createPdomOrderNode(
        ...controlPanel.controlsInOrder,
        ...measurePanel.controlsInOrder,
        timeControl,
        resetAllButton,
      ),
    );
  }

  /** Resets view-side state. Panel visibility is model state, so nothing here. */
  public reset(): void {
    // Intentionally empty: every visual here is derived from the model.
  }
}
