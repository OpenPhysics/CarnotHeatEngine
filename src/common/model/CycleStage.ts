/**
 * CycleStage.ts
 *
 * The four legs of the Carnot cycle, named for the *engine* (clockwise on a PV
 * diagram) traversal. A stage identifies a leg **geometrically** — the pair of
 * corner states it connects — not the direction it is being traversed:
 *
 *   ISOTHERMAL_EXPANSION   state 1 → 2, at T_hot
 *   ADIABATIC_EXPANSION    state 2 → 3, T_hot → T_cold
 *   ISOTHERMAL_COMPRESSION state 3 → 4, at T_cold
 *   ADIABATIC_COMPRESSION  state 4 → 1, T_cold → T_hot
 *
 * A refrigerator runs the same four legs backwards ({@link CycleDirection}), so
 * the physical process a leg represents flips with the direction. Use
 * {@link processFor} to get the process actually happening, and never assume the
 * stage name describes it.
 */

import { Enumeration, EnumerationValue } from "scenerystack/phet-core";
import { CycleDirection } from "./CycleDirection.js";

export class CycleStage extends EnumerationValue {
  public static readonly ISOTHERMAL_EXPANSION = new CycleStage();
  public static readonly ADIABATIC_EXPANSION = new CycleStage();
  public static readonly ISOTHERMAL_COMPRESSION = new CycleStage();
  public static readonly ADIABATIC_COMPRESSION = new CycleStage();

  public static readonly enumeration = new Enumeration(CycleStage);
}

/**
 * The stages in engine (clockwise) order. Index i is the leg from corner i to
 * corner i+1, matching `CycleGeometry.corners`.
 */
export const CYCLE_STAGE_ORDER = [
  CycleStage.ISOTHERMAL_EXPANSION,
  CycleStage.ADIABATIC_EXPANSION,
  CycleStage.ISOTHERMAL_COMPRESSION,
  CycleStage.ADIABATIC_COMPRESSION,
] as const;

/** Index of `stage` in {@link CYCLE_STAGE_ORDER} (0–3). */
export const stageIndex = (stage: CycleStage): number => CYCLE_STAGE_ORDER.indexOf(stage);

/**
 * The stage at `index` in engine order, wrapping. Spelled out rather than
 * indexed so the return type stays `CycleStage` under `noUncheckedIndexedAccess`.
 */
export const stageAtIndex = (index: number): CycleStage => {
  const wrapped = ((index % CYCLE_STAGE_ORDER.length) + CYCLE_STAGE_ORDER.length) % CYCLE_STAGE_ORDER.length;
  if (wrapped === 0) {
    return CycleStage.ISOTHERMAL_EXPANSION;
  }
  if (wrapped === 1) {
    return CycleStage.ADIABATIC_EXPANSION;
  }
  if (wrapped === 2) {
    return CycleStage.ISOTHERMAL_COMPRESSION;
  }
  return CycleStage.ADIABATIC_COMPRESSION;
};

/**
 * The stage reached by advancing one leg from `stage` in `direction`.
 * Engine advances 1→2→3→4→1; refrigerator retreats 1→4→3→2→1. Never skips a
 * stage and wraps at the cycle boundary in both directions.
 */
export const nextStage = (stage: CycleStage, direction: CycleDirection): CycleStage =>
  stageAtIndex(stageIndex(stage) + (direction === CycleDirection.ENGINE ? 1 : -1));

/** The stage reached by retreating one leg from `stage` in `direction`. */
export const previousStage = (stage: CycleStage, direction: CycleDirection): CycleStage =>
  nextStage(stage, direction === CycleDirection.ENGINE ? CycleDirection.REFRIGERATOR : CycleDirection.ENGINE);

/** Whether a leg is isothermal (heat exchanged with a reservoir) or adiabatic (Q = 0). */
export const isIsothermal = (stage: CycleStage): boolean =>
  stage === CycleStage.ISOTHERMAL_EXPANSION || stage === CycleStage.ISOTHERMAL_COMPRESSION;

/** Whether a leg touches the hot reservoir / hot adiabat endpoint at T_hot. */
export const isHotIsothermal = (stage: CycleStage): boolean => stage === CycleStage.ISOTHERMAL_EXPANSION;

/** Whether a leg touches the cold reservoir at T_cold. */
export const isColdIsothermal = (stage: CycleStage): boolean => stage === CycleStage.ISOTHERMAL_COMPRESSION;

/**
 * The six physical processes a leg can represent, once traversal direction is
 * taken into account. View code maps these to localized labels.
 */
export const CycleProcess = {
  ISOTHERMAL_EXPANSION_HOT: "isothermalExpansionHot",
  ISOTHERMAL_COMPRESSION_HOT: "isothermalCompressionHot",
  ISOTHERMAL_EXPANSION_COLD: "isothermalExpansionCold",
  ISOTHERMAL_COMPRESSION_COLD: "isothermalCompressionCold",
  ADIABATIC_EXPANSION: "adiabaticExpansion",
  ADIABATIC_COMPRESSION: "adiabaticCompression",
} as const;

export type CycleProcessValue = (typeof CycleProcess)[keyof typeof CycleProcess];

/**
 * The process actually taking place on `stage` when traversed in `direction`.
 * Reversing the cycle turns every expansion into a compression and vice versa,
 * while the reservoir each isothermal leg touches stays the same.
 */
export const processFor = (stage: CycleStage, direction: CycleDirection): CycleProcessValue => {
  const forward = direction === CycleDirection.ENGINE;
  if (stage === CycleStage.ISOTHERMAL_EXPANSION) {
    return forward ? CycleProcess.ISOTHERMAL_EXPANSION_HOT : CycleProcess.ISOTHERMAL_COMPRESSION_HOT;
  }
  if (stage === CycleStage.ISOTHERMAL_COMPRESSION) {
    return forward ? CycleProcess.ISOTHERMAL_COMPRESSION_COLD : CycleProcess.ISOTHERMAL_EXPANSION_COLD;
  }
  if (stage === CycleStage.ADIABATIC_EXPANSION) {
    return forward ? CycleProcess.ADIABATIC_EXPANSION : CycleProcess.ADIABATIC_COMPRESSION;
  }
  return forward ? CycleProcess.ADIABATIC_COMPRESSION : CycleProcess.ADIABATIC_EXPANSION;
};
