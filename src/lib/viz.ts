import type { MachineState, Rag, Stage, TimeCategory } from "@/api/types";

/**
 * The visual grammar, in one place.
 *
 * One chart form per question and one colour per meaning, used identically
 * everywhere - so learning one screen means learning all three.
 */

export const STAGES: Stage[] = ["board_manufacturing", "printing", "bundling"];

export const STAGE_LABEL: Record<Stage, string> = {
  board_manufacturing: "Boarding",
  printing: "Printing",
  bundling: "Bundling",
};

export const STAGE_BLURB: Record<Stage, string> = {
  board_manufacturing: "reels → board sheets",
  printing: "sheets → printed",
  bundling: "count, strap, stage",
};

/**
 * RAG never travels as colour alone.
 *
 * Every pill carries a glyph and a word as well as a hue, because two of the
 * four status colours sit below 3:1 on a light surface and because a
 * colour-blind reader should not have to guess. Grey is not a failure colour: it
 * means the value cannot be judged, which is a different statement from "bad".
 */
export const RAG_META: Record<Rag, { label: string; glyph: string; color: string; wash: string }> = {
  green: { label: "on target", glyph: "●", color: "var(--color-good)", wash: "rgb(12 163 12 / 0.12)" },
  amber: { label: "watch", glyph: "◐", color: "var(--color-warning)", wash: "rgb(250 178 25 / 0.14)" },
  red: { label: "off target", glyph: "▲", color: "var(--color-critical)", wash: "rgb(208 59 59 / 0.14)" },
  grey: { label: "no reading", glyph: "○", color: "var(--color-ink-muted)", wash: "rgb(137 135 129 / 0.12)" },
};

export const STATE_META: Record<
  MachineState,
  { label: string; color: string; glyph: string }
> = {
  running: { label: "Running", color: "var(--color-state-running)", glyph: "▶" },
  setup: { label: "Setup", color: "var(--color-state-setup)", glyph: "⟳" },
  down: { label: "Down", color: "var(--color-state-breakdown)", glyph: "■" },
  waiting: { label: "Waiting", color: "var(--color-state-waiting)", glyph: "⏸" },
  idle: { label: "Idle", color: "var(--color-state-idle)", glyph: "·" },
  // A failed data feed is not a failed machine, so it is never drawn red.
  no_data: { label: "No data", color: "var(--color-state-nodata)", glyph: "?" },
};

/** Stack order for every time-split strip and hour row, always the same, so the
 *  eye compares rows without re-reading the legend. */
export const TIME_CATEGORIES: TimeCategory[] = [
  "running",
  "setup",
  "breakdown",
  "waiting",
  "idle",
];

export const TIME_CATEGORY_META: Record<
  TimeCategory,
  { label: string; color: string; planned: boolean }
> = {
  running: { label: "Running", color: "var(--color-state-running)", planned: false },
  // Planned time is grey, never red: painting a changeover the same colour as a
  // breakdown is how a dashboard loses the shop floor.
  setup: { label: "Setup / changeover", color: "var(--color-state-setup)", planned: true },
  breakdown: { label: "Breakdown", color: "var(--color-state-breakdown)", planned: false },
  waiting: { label: "Waiting", color: "var(--color-state-waiting)", planned: false },
  idle: { label: "Idle", color: "var(--color-state-idle)", planned: false },
};

export const SERIES = {
  actual: "var(--color-series-1)",
  secondary: "var(--color-series-2)",
  tertiary: "var(--color-series-3)",
  plan: "var(--color-ink-muted)",
} as const;

/** A Pareto bar is red when the time was lost and grey when it was planned. */
export function paretoColor(planned: boolean): string {
  return planned ? "var(--color-state-setup)" : "var(--color-series-2)";
}

export function deltaTone(direction: string | null | undefined): {
  color: string;
  glyph: string;
} {
  switch (direction) {
    case "up_good":
      return { color: "var(--color-good)", glyph: "▲" };
    case "up_bad":
      return { color: "var(--color-critical)", glyph: "▲" };
    case "down_good":
      return { color: "var(--color-good)", glyph: "▼" };
    case "down_bad":
      return { color: "var(--color-critical)", glyph: "▼" };
    default:
      return { color: "var(--color-ink-muted)", glyph: "–" };
  }
}

export const ALERT_META: Record<
  string,
  { label: string; color: string }
> = {
  event: { label: "Event", color: "var(--color-critical)" },
  breach: { label: "Breach", color: "var(--color-serious)" },
  drift: { label: "Drift", color: "var(--color-warning)" },
  pattern: { label: "Pattern", color: "var(--color-series-1)" },
};

/** Shared Recharts chrome. Grid and axes stay recessive so the marks carry the
 *  chart. */
export const AXIS_PROPS = {
  stroke: "var(--color-axis)",
  tick: { fill: "var(--color-ink-muted)", fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: "var(--color-axis)" },
} as const;

export const GRID_PROPS = {
  stroke: "var(--color-grid)",
  strokeDasharray: "2 4",
  vertical: false,
} as const;
