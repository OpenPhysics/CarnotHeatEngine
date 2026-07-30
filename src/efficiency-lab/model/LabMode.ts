/**
 * LabMode.ts
 *
 * How much the Efficiency Lab gives away. EXPLORE shows every derived value
 * live. MEASURE hides η until the student has read Q_hot and W off the diagram,
 * entered their own answer, and pressed Check — the point being that η is
 * something you compute, not something the sim hands you.
 */

import { Enumeration, EnumerationValue } from "scenerystack/phet-core";

export class LabMode extends EnumerationValue {
  /** All values shown live, including η. */
  public static readonly EXPLORE = new LabMode();

  /** η withheld until the student submits their own value. */
  public static readonly MEASURE = new LabMode();

  public static readonly enumeration = new Enumeration(LabMode);
}
