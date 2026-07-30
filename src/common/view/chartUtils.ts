/**
 * chartUtils.ts
 *
 * Small pure helpers shared by every diagram in the sim (PV, T–S, and the
 * Carnot-limit inset). They pick a "nice" tick spacing for an arbitrary value
 * range, work out how many decimal places the labels then need, and pad a data
 * range so the plotted curve never touches the frame.
 *
 * Bamboo's `GridLineSet` / `TickMarkSet` / `TickLabelSet` all take a model-space
 * spacing and lay ticks at `origin + n·spacing`; these helpers choose that
 * spacing and the matching label formatting so the diagrams stay legible as the
 * cycle parameters move them over more than two orders of magnitude.
 */

import { Range, toFixed } from "scenerystack/dot";

/**
 * Pick a "nice" step (1, 2, or 5 × 10ⁿ) that yields roughly `targetDivisions`
 * segments across `rangeSpan`. The standard "nice numbers" algorithm, so ticks
 * land on round values (0, 20, 40 … rather than 17, 34 …).
 */
export const niceStep = (rangeSpan: number, targetDivisions = 5): number => {
  const safeSpan = Number.isFinite(rangeSpan) && rangeSpan > 0 ? rangeSpan : 1;
  const raw = safeSpan / targetDivisions;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  let coefficient: number;
  if (normalized < 1.5) {
    coefficient = 1;
  } else if (normalized < 3) {
    coefficient = 2;
  } else if (normalized < 7) {
    coefficient = 5;
  } else {
    coefficient = 10;
  }
  return coefficient * magnitude;
};

/** Number of decimal places a tick label needs so it lines up with its step. */
export const decimalPlacesForStep = (step: number): number => {
  if (step <= 0 || !Number.isFinite(step)) {
    return 0;
  }
  return Math.min(4, Math.max(0, -Math.floor(Math.log10(step))));
};

/** Format a tick value to a fixed number of decimals (uses dot's stable toFixed). */
export const formatTickValue = (value: number, decimalPlaces: number): string => {
  if (!Number.isFinite(value)) {
    return "—";
  }
  // -0 formats as "-0", which reads as an error rather than as zero.
  return toFixed(value === 0 ? 0 : value, decimalPlaces);
};

/**
 * Format to `digits` significant figures, dropping trailing zeros — the readout
 * format for quantities like pressure that range over three decades as the
 * parameters move.
 */
export const formatSignificant = (value: number, digits = 3): string => {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return String(Number(value.toPrecision(digits)));
};

/**
 * Expand [min, max] by `fraction` on each side so a plotted curve keeps clear of
 * the frame. A degenerate (zero-span) range falls back to a symmetric window of
 * `flatHalfWindow` so the diagram never collapses to a line.
 */
export const padRange = (min: number, max: number, fraction = 0.08, flatHalfWindow = 1): Range => {
  if (!(Number.isFinite(min) && Number.isFinite(max))) {
    return new Range(-flatHalfWindow, flatHalfWindow);
  }
  const span = max - min;
  if (span <= Math.abs(max) * 1e-9) {
    const center = (max + min) / 2;
    return new Range(center - flatHalfWindow, center + flatHalfWindow);
  }
  const pad = span * fraction;
  return new Range(min - pad, max + pad);
};

/** The [min, max] extent of `values`, or null if there are none that are finite. */
export const extentOf = (values: readonly number[]): { min: number; max: number } | null => {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!Number.isFinite(value)) {
      continue;
    }
    if (value < min) {
      min = value;
    }
    if (value > max) {
      max = value;
    }
  }
  return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
};
