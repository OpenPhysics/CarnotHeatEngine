/**
 * carnotHeatEngineQueryParameters.ts
 *
 * Sim-specific startup query parameters. This is the single place where every
 * sim-specific query parameter is declared and documented. Public-facing
 * parameters (intended for end users / sharing links) must set `public: true`.
 *
 * ── How to add a query parameter ──────────────────────────────────────────────
 * 1. Add an entry below with a `type`, `defaultValue`, and (if user-facing)
 *    `public: true`. Add `isValidValue` to bound numeric ranges.
 * 2. If it should also be user-editable at runtime, surface it as a preference
 *    in CarnotHeatEnginePreferencesModel (initialize that Property from this query parameter).
 *
 * Usage: append e.g. `?showCornerLabels=false` to the sim URL.
 */

import { logGlobal } from "scenerystack/phet-core";
import { QueryStringMachine } from "scenerystack/query-string-machine";
import CarnotHeatEngineNamespace from "../CarnotHeatEngineNamespace.js";

const carnotHeatEngineQueryParameters = QueryStringMachine.getAll({
  /**
   * Whether the four corner states of the cycle are labelled 1–4 on the PV and
   * T–S diagrams. On by default: the numbering is what lets a student say "the
   * hot isothermal leg runs from 1 to 2" out loud. Turn it off for a cleaner
   * diagram once the leg order is internalized.
   */
  showCornerLabels: {
    type: "boolean",
    defaultValue: true,
    public: true,
  },
});

CarnotHeatEngineNamespace.register("carnotHeatEngineQueryParameters", carnotHeatEngineQueryParameters);

// Log query parameters (for the console / PhET-iO).
logGlobal("phet.chipper.queryParameters");

export default carnotHeatEngineQueryParameters;
