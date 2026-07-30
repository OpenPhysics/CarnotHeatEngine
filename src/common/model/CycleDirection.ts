/**
 * CycleDirection.ts
 *
 * Which way the apparatus is run. ENGINE traverses the four legs clockwise on a
 * PV diagram — heat in at T_hot, net work out. REFRIGERATOR traverses exactly
 * the same legs counter-clockwise: work in, heat pumped from cold to hot. The
 * Reversed Cycle screen is the second case; the physics and the corner points
 * are identical, only the traversal and the framing change.
 */

import { Enumeration, EnumerationValue } from "scenerystack/phet-core";

export class CycleDirection extends EnumerationValue {
  public static readonly ENGINE = new CycleDirection();
  public static readonly REFRIGERATOR = new CycleDirection();

  public static readonly enumeration = new Enumeration(CycleDirection);
}

/** Sign applied to stage progress per unit time: forward for an engine. */
export const directionSign = (direction: CycleDirection): number => (direction === CycleDirection.ENGINE ? 1 : -1);
