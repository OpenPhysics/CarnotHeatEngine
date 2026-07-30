/**
 * GammaPreset.ts
 *
 * The gas the cylinder is filled with, selected as a preset rather than a free
 * numeric γ so the value always corresponds to a real ideal gas. γ = C_p/C_v
 * fixes both the adiabat steepness (PV^γ = const) and the heat capacity
 * C_v = R/(γ − 1) used by the adiabatic legs.
 */

import { Enumeration, EnumerationValue } from "scenerystack/phet-core";
import { GAMMA_PRESETS, GAS_CONSTANT } from "../../CarnotHeatEngineConstants.js";

export class GammaPreset extends EnumerationValue {
  /** Ideal monatomic gas (He, Ar): γ = 5/3, C_v = 3R/2. */
  public static readonly MONATOMIC = new GammaPreset();

  /** Ideal diatomic gas (N₂, O₂) at room temperature: γ = 7/5, C_v = 5R/2. */
  public static readonly DIATOMIC = new GammaPreset();

  public static readonly enumeration = new Enumeration(GammaPreset);
}

/** Heat-capacity ratio γ for a preset. */
export const gammaValue = (preset: GammaPreset): number =>
  preset === GammaPreset.MONATOMIC ? GAMMA_PRESETS.MONATOMIC : GAMMA_PRESETS.DIATOMIC;

/** Molar heat capacity at constant volume, J/(mol·K), for a preset. */
export const molarHeatCapacityV = (preset: GammaPreset): number => GAS_CONSTANT / (gammaValue(preset) - 1);
