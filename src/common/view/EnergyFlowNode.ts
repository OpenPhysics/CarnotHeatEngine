/**
 * EnergyFlowNode.ts
 *
 * The Sankey-style energy budget: one bar for the heat exchanged with the hot
 * reservoir, and beneath it the same length split into work and the heat
 * exchanged with the cold reservoir.
 *
 * The bars are normalized so the Q_hot bar is always full width. That is
 * deliberate: it makes the green work segment *literally* the efficiency as a
 * fraction of the bar, which is the reading students are being asked to make.
 * Absolute magnitudes are one line away in the numeric readouts beside it.
 *
 * The same picture serves both traversal directions, because the same equality
 * holds either way — Q_hot = W + Q_cold. Only which quantities are inputs and
 * which are outputs changes, which is what the caption says.
 */

import { DerivedProperty, Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2 } from "scenerystack/dot";
import { AlignBox, HBox, type Node, type NodeOptions, Rectangle, RichText, VBox } from "scenerystack/scenery";
import CarnotHeatEngineColors from "../../CarnotHeatEngineColors.js";
import { READOUT_FONT, SECTION_HEADING_FONT } from "../../CarnotHeatEngineConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import { CycleDirection } from "../model/CycleDirection.js";

/** Full width of the Q_hot reference bar, px. */
const BAR_WIDTH = 220;

/** Height of each bar, px. */
const BAR_HEIGHT = 22;

/** Smallest drawable segment width, px — keeps a near-zero segment visible. */
const MIN_SEGMENT_WIDTH = 1;

export type EnergyFlowNodeOptions = {
  /** Heat exchanged with the hot reservoir per cycle, J (always positive). */
  qHotProperty: TReadOnlyProperty<number>;
  /** Heat exchanged with the cold reservoir per cycle, J (always positive). */
  qColdProperty: TReadOnlyProperty<number>;
  /** Net work per cycle, J (always positive; direction decides in or out). */
  workProperty: TReadOnlyProperty<number>;
  /** Engine or refrigerator — selects the caption. */
  directionProperty: TReadOnlyProperty<CycleDirection>;
  /** Extra Node options. */
  nodeOptions?: NodeOptions;
};

export class EnergyFlowNode extends VBox {
  public constructor(providedOptions: EnergyFlowNodeOptions) {
    const strings = StringManager.getInstance();
    const energyFlowStrings = strings.getEnergyFlow();
    const readoutStrings = strings.getReadouts();

    const heading = new RichText(energyFlowStrings.titleStringProperty, {
      font: SECTION_HEADING_FONT,
      fill: CarnotHeatEngineColors.textColorProperty,
      maxWidth: BAR_WIDTH + 60,
    });

    // ── Row 1: the whole of Q_hot ─────────────────────────────────────────────
    const qHotBar = new Rectangle(0, 0, BAR_WIDTH, BAR_HEIGHT, {
      fill: CarnotHeatEngineColors.hotColorProperty,
      cornerRadius: 2,
    });
    const qHotRow = labelledRow(readoutStrings.qHotStringProperty, qHotBar);

    // ── Row 2: the same length, split into W and Q_cold ───────────────────────
    const workSegment = new Rectangle(0, 0, BAR_WIDTH / 2, BAR_HEIGHT, {
      fill: CarnotHeatEngineColors.workColorProperty,
      cornerRadius: 2,
    });
    const qColdSegment = new Rectangle(0, 0, BAR_WIDTH / 2, BAR_HEIGHT, {
      fill: CarnotHeatEngineColors.coldColorProperty,
      cornerRadius: 2,
    });
    const splitBar = new HBox({ children: [workSegment, qColdSegment], spacing: 1, align: "top" });
    const splitLabel = new RichText(
      new DerivedProperty(
        [readoutStrings.workStringProperty, readoutStrings.qColdStringProperty],
        (work, qCold) => `${work} + ${qCold}`,
      ),
      {
        font: READOUT_FONT,
        fill: CarnotHeatEngineColors.textColorProperty,
        maxWidth: 70,
      },
    );
    const splitRow = new HBox({ children: [rowLabelBox(splitLabel), splitBar], spacing: 8, align: "center" });

    const caption = new RichText(
      new DerivedProperty(
        [
          providedOptions.directionProperty,
          energyFlowStrings.engineCaptionStringProperty,
          energyFlowStrings.refrigeratorCaptionStringProperty,
        ],
        (direction, engineCaption, refrigeratorCaption) =>
          direction === CycleDirection.ENGINE ? engineCaption : refrigeratorCaption,
      ),
      {
        font: READOUT_FONT,
        fill: CarnotHeatEngineColors.secondaryTextColorProperty,
        lineWrap: BAR_WIDTH + 60,
      },
    );

    super({
      align: "left",
      spacing: 8,
      children: [heading, qHotRow, splitRow, caption],
      ...providedOptions.nodeOptions,
    });

    // Q_hot is the reference length; W and Q_cold divide it in proportion. The
    // guard is for the degenerate Q_hot → 0 case, which the ranges exclude but
    // which would otherwise produce a NaN width.
    Multilink.multilink(
      [providedOptions.qHotProperty, providedOptions.workProperty, providedOptions.qColdProperty],
      (qHot, work, qCold) => {
        const scale = Number.isFinite(qHot) && qHot > 0 ? BAR_WIDTH / qHot : 0;
        workSegment.rectWidth = Math.max(MIN_SEGMENT_WIDTH, work * scale);
        qColdSegment.rectWidth = Math.max(MIN_SEGMENT_WIDTH, qCold * scale);
      },
    );
  }
}

/** A fixed-width label column followed by a bar, so the bars line up. */
const labelledRow = (labelProperty: TReadOnlyProperty<string>, bar: Node): HBox =>
  new HBox({
    children: [
      rowLabelBox(
        new RichText(labelProperty, {
          font: READOUT_FONT,
          fill: CarnotHeatEngineColors.textColorProperty,
          maxWidth: 70,
        }),
      ),
      bar,
    ],
    spacing: 8,
    align: "center",
  });

/** Width of the label column, px — fixed so every bar starts at the same x. */
const LABEL_COLUMN_WIDTH = 74;

/** Right-aligns a label in the fixed-width label column. */
const rowLabelBox = (label: Node): Node =>
  new AlignBox(label, {
    alignBounds: new Bounds2(0, 0, LABEL_COLUMN_WIDTH, BAR_HEIGHT),
    xAlign: "right",
    yAlign: "center",
  });
