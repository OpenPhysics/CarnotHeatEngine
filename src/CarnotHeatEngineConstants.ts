/**
 * CarnotHeatEngineConstants.ts
 *
 * Central repository for every named numeric constant used across the
 * simulation. Bare numbers that carry semantic meaning (sizes, margins,
 * physics defaults, ranges) belong here rather than inline in model or view
 * code, so they are named, documented, and changed in one place.
 *
 * Conventions
 * ───────────
 *  - Physics / model values use SI units (metres, seconds, kilograms, …);
 *    note the unit in a comment on each value.
 *  - Layout / chrome values are in screen pixels.
 *  - Colour strings live in CarnotHeatEngineColors.ts, not here.
 *  - Computed expressions (e.g. `2 * Math.PI`) may stay inline.
 */

import { Range } from "scenerystack/dot";
import CarnotHeatEngineNamespace from "./CarnotHeatEngineNamespace.js";

// ── Layout / chrome (screen pixels) ───────────────────────────────────────────

/** Margin between the screen edge and edge-anchored controls (e.g. Reset All). */
export const SCREEN_VIEW_MARGIN = 20;

/** Standard gap left between two adjacent panels or diagrams, px. */
export const INTER_ELEMENT_GAP = 12;

/** Corner radius shared by control panels and dialogs. */
export const PANEL_CORNER_RADIUS = 6;

/**
 * Plotting-area width of the main PV / T–S diagrams. Sized so the Efficiency Lab
 * can show both side by side and still clear the control panel.
 */
export const DIAGRAM_VIEW_WIDTH = 250;

/** Plotting-area height of the main PV / T–S diagrams. */
export const DIAGRAM_VIEW_HEIGHT = 225;

/** Room left of a diagram's plotting area for its y-axis tick labels and title. */
export const DIAGRAM_LEFT_PADDING = 62;

/** Room below a diagram's plotting area for its x-axis tick labels and title. */
export const DIAGRAM_BOTTOM_PADDING = 42;

/** Room above a diagram's plotting area for its title. */
export const DIAGRAM_TOP_PADDING = 24;

/** Room right of a diagram's plotting area so the last x tick label is not clipped. */
export const DIAGRAM_RIGHT_PADDING = 18;

/** Plotting-area size of the small "η vs. T_cold" inset on the Efficiency Lab screen. */
export const INSET_VIEW_WIDTH = 152;
export const INSET_VIEW_HEIGHT = 92;

/** Radius of the playhead marker that traces the cycle on a diagram. */
export const PLAYHEAD_RADIUS = 5;

/** Font used for diagram tick labels. */
export const TICK_LABEL_FONT = "11px sans-serif";

/** Font used for diagram titles and axis labels. */
export const DIAGRAM_TITLE_FONT = "13px sans-serif";

/** Font used for panel section headings. */
export const SECTION_HEADING_FONT = "bold 14px sans-serif";

/** Font used for numeric readouts and most panel labels. */
export const READOUT_FONT = "13px sans-serif";

/** Font used for the prominent current-stage label. */
export const STAGE_LABEL_FONT = "bold 15px sans-serif";

// ── Physics constants (SI units) ──────────────────────────────────────────────

/** Universal gas constant, J/(mol·K). */
export const GAS_CONSTANT = 8.314;

/**
 * Heat-capacity ratio γ = C_p/C_v for the two selectable ideal gases.
 * Monatomic (He, Ar): 5/3. Diatomic (N₂, O₂): 7/5.
 */
export const GAMMA_PRESETS = {
  MONATOMIC: 5 / 3,
  DIATOMIC: 7 / 5,
} as const;

/** Amount of gas in the cylinder, mol. Fixed for v1 but exposed as a Property. */
export const DEFAULT_N_MOLES = 1;

/** Allowed range for the number of moles, mol. Not user-facing in v1. */
export const N_MOLES_RANGE = new Range(0.1, 5);

/**
 * Volume of the gas at state 1 — the smallest volume in the cycle, m³.
 * Every other corner volume is derived from it, so it only fixes the absolute
 * scale: 10 L of 1 mol of ideal gas at 600 K sits near 5 bar, which keeps the
 * pressure readout in a comfortable few-hundred-kPa range.
 */
export const MINIMUM_VOLUME_M3 = 0.01;

/** Hot-reservoir temperature range, K. */
export const T_HOT_RANGE = new Range(400, 800);

/** Cold-reservoir temperature range, K. */
export const T_COLD_RANGE = new Range(200, 500);

/** Minimum enforced separation between T_hot and T_cold, K (see CLAUDE.md § Edge cases). */
export const MIN_TEMPERATURE_GAP = 50;

/** Default hot-reservoir temperature, K. */
export const DEFAULT_T_HOT = 600;

/** Default cold-reservoir temperature, K. */
export const DEFAULT_T_COLD = 300;

/**
 * Range of the free volume ratio that closes the cycle: V₂/V₁, the expansion
 * across the hot isothermal leg (equal to V₃/V₄ across the cold one). See
 * doc/model.md § "Why the free parameter is a per-leg ratio".
 */
export const COMPRESSION_RATIO_RANGE = new Range(2, 8);

/** Default value of the free volume ratio V₂/V₁. */
export const DEFAULT_COMPRESSION_RATIO = 2;

/**
 * Floor applied to any temperature difference used as a divisor (COP, T–S
 * aspect scaling). MIN_TEMPERATURE_GAP keeps ΔT far above this in practice; the
 * floor is insurance for the day the ranges are loosened.
 */
export const MIN_SAFE_TEMPERATURE_DELTA = 1e-6;

// ── Efficiency Lab: Measure mode ──────────────────────────────────────────────

/** Range of the student's own η answer in Measure mode, %. */
export const EFFICIENCY_ENTRY_RANGE_PERCENT = new Range(0, 100);

/** How close the student's answer must be to count as correct, percentage points. */
export const MEASURE_TOLERANCE_PERCENT = 2;

/** Number of T_cold samples drawn on the "Carnot limit" reference inset. */
export const CARNOT_LIMIT_SAMPLES = 60;

// ── Animation / playback ──────────────────────────────────────────────────────

/**
 * Seconds the cycle parameters must hold still before the previous cycle is
 * promoted to the ghosted overlay. Publishing the ghost on every change would
 * make it trail a slider drag by one frame and compare nothing useful.
 */
export const GHOST_SETTLE_TIME_S = 0.4;

/**
 * Wall-clock seconds one leg of the cycle takes at 1× speed. Every leg gets the
 * same duration regardless of how much volume or heat it moves, which doubles as
 * the per-leg minimum-duration floor the stage stepper needs at extreme ratios.
 */
export const STAGE_DURATION_S = 2;

/**
 * Seconds the step-forward button advances the model by — one ~60 Hz frame.
 * The button is only ever pressed while paused, so this is the only path that
 * moves the playhead a fixed wall-clock slice rather than a scaled one.
 */
export const STEP_FORWARD_DT_SECONDS = 1 / 60;

/** Samples per leg used when drawing an analytic curve on a diagram. */
export const CURVE_SAMPLES_PER_LEG = 48;

/**
 * Simpson's-rule intervals per leg used by the numerical ∫P dV integration that
 * cross-checks the closed-form efficiency. Must be even.
 */
export const INTEGRATION_INTERVALS_PER_LEG = 200;

/**
 * Relative tolerance for "numerically integrated η agrees with 1 − T_c/T_h".
 * Simpson's rule on these smooth curves lands orders of magnitude inside it; the
 * check exists to catch a wrong corner-point derivation, not quadrature error.
 */
export const EFFICIENCY_AGREEMENT_TOLERANCE = 1e-6;

CarnotHeatEngineNamespace.register("CarnotHeatEngineConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
  DIAGRAM_VIEW_WIDTH,
  DIAGRAM_VIEW_HEIGHT,
  GAS_CONSTANT,
  GAMMA_PRESETS,
  DEFAULT_N_MOLES,
  MINIMUM_VOLUME_M3,
  T_HOT_RANGE,
  T_COLD_RANGE,
  MIN_TEMPERATURE_GAP,
  COMPRESSION_RATIO_RANGE,
  STAGE_DURATION_S,
});
