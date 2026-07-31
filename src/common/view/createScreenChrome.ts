/**
 * createScreenChrome.ts
 *
 * Factory functions for the screen-level chrome shared by all three screens —
 * the full-screen background fill, the TimeControlNode (play/pause + step +
 * speed), the Reset All button, and the pdom-order wrapper. Each screen's view
 * built these inline and identically; centralizing them keeps the flat-button
 * option spread, the step-forward dt, and the right/bottom anchoring in one
 * place.
 */

import type { Bounds2 } from "scenerystack/dot";
import { Node, Rectangle } from "scenerystack/scenery";
import { ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import CarnotHeatEngineColors from "../../CarnotHeatEngineColors.js";
import { SCREEN_VIEW_MARGIN, STEP_FORWARD_DT_SECONDS } from "../../CarnotHeatEngineConstants.js";
import {
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RECTANGULAR_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  TIME_CONTROL_SPEED_RADIO_OPTIONS,
} from "../CarnotHeatEngineButtonOptions.js";
import { DEFAULT_TIME_SPEEDS, type TimeModel } from "../TimeModel.js";

/**
 * Any model that drives the shared chrome: a {@link TimeModel} for play/pause
 * and speed, plus `stepForward` / `stepBackward` hooks for the step buttons.
 * All three screen models satisfy this.
 */
type ChromeModel = {
  readonly timer: TimeModel;
  stepForward(dt: number): void;
  stepBackward(dt: number): void;
};

/** Full-screen background fill behind a screen's content. */
export const createBackgroundFill = (layoutBounds: Bounds2): Rectangle =>
  new Rectangle(0, 0, layoutBounds.width, layoutBounds.height, {
    fill: CarnotHeatEngineColors.backgroundColorProperty,
  });

/**
 * The shared TimeControlNode: step-backward + play/pause + step-forward + the
 * speed radio group, in the sim's flat style. Each step button advances or
 * rewinds the model by one ~60 Hz frame; they are only ever pressed while
 * paused, so they bypass the scaled dt.
 */
export const createTimeControlNode = (model: ChromeModel): TimeControlNode =>
  new TimeControlNode(model.timer.isPlayingProperty, {
    timeSpeedProperty: model.timer.timeSpeedProperty,
    timeSpeeds: DEFAULT_TIME_SPEEDS,
    ...TIME_CONTROL_SPEED_RADIO_OPTIONS,
    playPauseStepButtonOptions: {
      ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
      includeStepBackwardButton: true,
      stepForwardButtonOptions: {
        ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
        listener: () => model.stepForward(STEP_FORWARD_DT_SECONDS),
      },
      stepBackwardButtonOptions: {
        ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
        listener: () => model.stepBackward(STEP_FORWARD_DT_SECONDS),
      },
    },
  });

/** The shared Reset All button, anchored to the bottom-right of `layoutBounds`. */
export const createResetAllButton = (layoutBounds: Bounds2, onReset: () => void): ResetAllButton =>
  new ResetAllButton({
    ...FLAT_RESET_ALL_BUTTON_OPTIONS,
    listener: onReset,
    right: layoutBounds.maxX - SCREEN_VIEW_MARGIN,
    bottom: layoutBounds.maxY - SCREEN_VIEW_MARGIN,
  });

/**
 * Wraps the interactive nodes that make up a screen's keyboard/reading order.
 * ScreenView rejects `pdomOrder` set on itself, so a lightweight wrapper Node
 * borrows them in the order a user should reach them.
 */
export const createPdomOrderNode = (...nodes: Node[]): Node => new Node({ pdomOrder: nodes });
