/**
 * CarnotHeatEngineColors.ts
 *
 * Defines all dynamic colors for the simulation using ProfileColorProperty.
 *
 * Each color has two profiles:
 *   - "default"   — used in standard (dark) mode
 *   - "projector" — used when the user enables Projector Mode in Preferences
 *
 * SceneryStack switches profiles automatically; no manual toggling is needed.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 * Import CarnotHeatEngineColors and pass properties directly to Node's fill or
 * stroke options:
 *
 *   import CarnotHeatEngineColors from "../../CarnotHeatEngineColors.js";
 *
 *   new Rectangle( 0, 0, 100, 50, {
 *     fill: CarnotHeatEngineColors.backgroundColorProperty,
 *   });
 *
 * ── The sim's color language ──────────────────────────────────────────────────
 * One idea, one hue, everywhere it appears:
 *   warm red/orange  hot reservoir, T_hot, the hot isothermal leg, Q_hot
 *   cool blue        cold reservoir, T_cold, the cold isothermal leg, Q_cold
 *   violet           adiabatic legs and the insulating sleeve (no heat flow)
 *   green            work
 * A student who learns the palette on the Intro screen reads the Efficiency Lab
 * bars and the Reversed Cycle arrows without a second legend.
 *
 * ── How to add a color ────────────────────────────────────────────────────────
 * Add a new ProfileColorProperty entry to the CarnotHeatEngineColors object below.
 * Always provide both "default" and "projector" values.
 */
import { ProfileColorProperty } from "scenerystack/scenery";
import CarnotHeatEngineNamespace from "./CarnotHeatEngineNamespace.js";

const CarnotHeatEngineColors = {
  /**
   * Background color for the simulation screen.
   * Deep navy in default mode; white in projector mode.
   */
  backgroundColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "background", {
    default: "#1a1a2e",
    projector: "#ffffff",
  }),

  /**
   * Primary accent color for highlights, selected items, and key UI elements.
   * Sky blue in default mode; dark navy in projector mode.
   */
  accentColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "accent", {
    default: "#4fc3f7",
    projector: "#1a1a2e",
  }),

  /**
   * Background fill for control panels and dialogs.
   * Deep blue in default mode; light gray in projector mode.
   */
  panelBackgroundColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "panelBackground", {
    default: "#16213e",
    projector: "#f5f5f5",
  }),

  /**
   * Border/stroke color for control panels and dialogs.
   * Teal-navy in default mode; medium gray in projector mode.
   */
  panelBorderColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "panelBorder", {
    default: "#0f3460",
    projector: "#999999",
  }),

  /**
   * Text color for labels, readouts, and general UI text.
   * Near-white in default mode; near-black in projector mode.
   */
  textColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "text", {
    default: "#e0e0e0",
    projector: "#1a1a1a",
  }),

  /** Secondary text: units, hints, and de-emphasized labels. */
  secondaryTextColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "secondaryText", {
    default: "#9aa5c4",
    projector: "#5a5a5a",
  }),

  // ── Light control surfaces ───────────────────────────────────────────────────
  // White chrome (combo boxes, flat push buttons, editable input fields) stays light
  // in both profiles; its text stays dark. Same values in default and projector mode,
  // but defined here so every color lives in one themeable place.

  /** Fill of light control surfaces: combo-box button/list, editable input fields. */
  controlSurfaceColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "controlSurface", {
    default: "#ffffff",
    projector: "#ffffff",
  }),

  /** Fill of a disabled control surface (grayed-out editable input field). */
  controlSurfaceDisabledColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "controlSurfaceDisabled", {
    default: "#cccccc",
    projector: "#cccccc",
  }),

  /** Text on light control surfaces: combo items, flat-button labels, field values, preferences. */
  controlSurfaceTextColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "controlSurfaceText", {
    default: "#1a1a1a",
    projector: "#1a1a1a",
  }),

  // ── Diagram chrome ───────────────────────────────────────────────────────────

  /** Plotting-area fill of the PV, T–S, and Carnot-limit diagrams. */
  diagramBackgroundColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "diagramBackground", {
    default: "#10142a",
    projector: "#fbfbfb",
  }),

  /** Grid lines inside a diagram's plotting area. */
  diagramGridColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "diagramGrid", {
    default: "#2b3358",
    projector: "#dddddd",
  }),

  /** Axis lines, tick marks, and the plotting-area frame. */
  diagramAxisColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "diagramAxis", {
    default: "#8892b8",
    projector: "#666666",
  }),

  // ── The cycle itself ─────────────────────────────────────────────────────────

  /** The persistent full-cycle path, always visible under the active leg. */
  cyclePathColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "cyclePath", {
    default: "#5b6488",
    projector: "#b4b4b4",
  }),

  /** The ghosted path of the previous cycle (Efficiency Lab). */
  ghostPathColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "ghostPath", {
    default: "#3d4468",
    projector: "#d8d0e4",
  }),

  /** The playhead marker tracing the cycle. */
  playheadColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "playhead", {
    default: "#ffe066",
    projector: "#b8860b",
  }),

  /** Corner-state markers (states 1–4) on a diagram. */
  cornerMarkerColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "cornerMarker", {
    default: "#c3cbe8",
    projector: "#4a4a4a",
  }),

  // ── Hot / cold / adiabatic / work: the sim's four semantic hues ──────────────

  /** Hot reservoir, T_hot, the hot isothermal leg, and Q_hot. */
  hotColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "hot", {
    default: "#ff6b4a",
    projector: "#c62828",
  }),

  /** Cold reservoir, T_cold, the cold isothermal leg, and Q_cold. */
  coldColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "cold", {
    default: "#4fc3f7",
    projector: "#1565c0",
  }),

  /** Adiabatic legs and the insulating sleeve — the "no heat flows" hue. */
  adiabaticColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "adiabatic", {
    default: "#b39ddb",
    projector: "#6a1b9a",
  }),

  /** Work: the W arrow, the work bar, and the enclosed-area fill. */
  workColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "work", {
    default: "#7ed957",
    projector: "#2e7d32",
  }),

  /** Translucent fill of the area enclosed by the cycle (= net work). */
  workAreaColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "workArea", {
    default: "rgba(126,217,87,0.14)",
    projector: "rgba(46,125,50,0.12)",
  }),

  // ── Apparatus (Intro screen) ─────────────────────────────────────────────────

  /** Cylinder walls and the piston rod. */
  cylinderColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "cylinder", {
    default: "#8d99ae",
    projector: "#607d8b",
  }),

  /** The piston face. */
  pistonColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "piston", {
    default: "#cfd8e3",
    projector: "#455a64",
  }),

  /** Gas fill at the coldest temperature in range — interpolated toward hot with T. */
  gasColdColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "gasCold", {
    default: "#1e3a5f",
    projector: "#bbdefb",
  }),

  /** Gas fill at the hottest temperature in range. */
  gasHotColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "gasHot", {
    default: "#c0392b",
    projector: "#ef9a9a",
  }),

  /** The insulating sleeve drawn around the cylinder on adiabatic legs. */
  insulationColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "insulation", {
    default: "#6d5b9e",
    projector: "#ce93d8",
  }),

  // ── Measure-mode feedback (Efficiency Lab) ───────────────────────────────────

  /**
   * A submitted answer inside the tolerance. Teal rather than the work green so a
   * student cannot conflate "correct answer" with "work" — the two appear in
   * different panels but share the positive-feedback intent.
   */
  correctColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "correct", {
    default: "#14b8a6",
    projector: "#0f766e",
  }),

  /** A submitted answer outside the tolerance. */
  incorrectColorProperty: new ProfileColorProperty(CarnotHeatEngineNamespace, "incorrect", {
    default: "#ffab40",
    projector: "#e65100",
  }),
};

export default CarnotHeatEngineColors;
