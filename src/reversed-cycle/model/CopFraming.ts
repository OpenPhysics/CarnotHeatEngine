/**
 * CopFraming.ts
 *
 * The same reversed cycle is a refrigerator or a heat pump depending only on
 * which side of it you care about: the heat pulled out of the cold reservoir
 * (COP_cooling = T_c/(T_h − T_c)) or the heat delivered to the hot one
 * (COP_heating = T_h/(T_h − T_c)). Nothing in the physics changes between the
 * two — this selects which quantity the screen puts front and centre.
 */

import { Enumeration, EnumerationValue } from "scenerystack/phet-core";

export class CopFraming extends EnumerationValue {
  /** Refrigerator framing: the useful output is Q_cold, the heat removed. */
  public static readonly COOLING = new CopFraming();

  /** Heat-pump framing: the useful output is Q_hot, the heat delivered. */
  public static readonly HEATING = new CopFraming();

  public static readonly enumeration = new Enumeration(CopFraming);
}
