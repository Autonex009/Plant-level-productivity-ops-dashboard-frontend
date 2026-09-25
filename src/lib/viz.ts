import type { MachineState, Rag, Stage, TimeCategory } from "@/api/types";

/**
 * The visual grammar, in one place.
 *
 * One chart form per question and one colour per meaning, used identically
 * everywhere - so learning one screen means learning all three. Matched
 * exactly to the plant-operations-dashboard reference: running is green,
 * waiting is kraft brown (never confused with setup's amber), and every
 * pareto/status colour comes from the same fixed set.
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
 * Every pill carries a word as well as a hue, because two of the four status
 * colours sit below 3:1 on a light surface and because a colour-blind reader
 * should not have to guess. Grey is not a failure colour: it means the value
 * cannot be judged, which is a different statement from "bad".
 */
export const RAG_META: Record<Rag, { label: string; glyph: string; color: string; wash: string }> = {
  green: { label: "on track", glyph: "●", color: "var(--color-good)", wash: "var(--color-good-soft)" },
  amber: { label: "watch", glyph: "◐", color: "var(--color-warning)", wash: "var(--color-warning-soft)" },
  red: { label: "off target", glyph: "▲", color: "var(--color-critical)", wash: "var(--color-critical-soft)" },
  grey: { label: "no reading", glyph: "○", color: "var(--color-ink-muted)", wash: "var(--color-surface-3)" },
};

/**
 * The axis a KPI card's mini-arc should be drawn against - a presentation
 * choice (where the ring starts and ends), never an invented data point
 * (what's plotted on it is always the KPI's own real value and target).
 *
 * A "higher is better" percentage already has a natural 0-100 axis. Every
 * other metric only gets an arc if it has a target to read the value
 * against - headroom is set generically from that target rather than a
 * per-metric hand-picked bound, so this works the same for every KPI card
 * in the app instead of only the few someone thought to special-case.
 *
 * A "lower is better" percentage (conversion waste, reject rate) is the one
 * exception: most of these live in a narrow single-digit band, so a fixed
 * 0-100 axis is technically honest but reads as an empty ring. Scaling it
 * to its own target the same way a non-percentage metric already does
 * keeps the arc readable without inventing anything - zero is a genuine
 * floor for a quantity that can't go negative.
 */
export function kpiArcRange(kpi: {
  unit: string;
  value: number | null;
  target: number | null;
  lowerIsBetter?: boolean;
}): { min: number; max: number } | null {
  if (kpi.unit === "%" && !kpi.lowerIsBetter) return { min: 0, max: 100 };
  if (kpi.target == null) return kpi.unit === "%" ? { min: 0, max: 100 } : null;
  const max = Math.max(kpi.target, kpi.value ?? 0) * 1.25;
  return max > 0 ? { min: 0, max } : null;
}

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
  // Planned time is never painted the same colour as a breakdown.
  setup: { label: "Setup / changeover", color: "var(--color-state-setup)", planned: true },
  breakdown: { label: "Breakdown", color: "var(--color-state-breakdown)", planned: false },
  waiting: { label: "Waiting", color: "var(--color-state-waiting)", planned: false },
  idle: { label: "Idle", color: "var(--color-state-idle)", planned: false },
};

/** One accent colour carries every "actual" line and bar; plan/budget is
 *  always the same dashed grey. The reference does not use a categorical
 *  palette - every chart is single-series. */
export const SERIES = {
  actual: "var(--color-series-1)",
  plan: "var(--color-plan)",
} as const;

/** A pareto bar is kraft when the loss is attributed upstream (e.g. bundling
 *  starved by printing), grey when the time was planned, and red otherwise. */
export function paretoColor(planned: boolean, attributedUpstream = false): string {
  if (planned) return "var(--color-plan)";
  if (attributedUpstream) return "var(--color-kraft)";
  return "var(--color-critical)";
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

/** The reference uses two alert severities (bad/warn); "type" still carries
 *  four labels for context, but every one resolves to one of those two hues. */
export const ALERT_META: Record<
  string,
  { label: string; color: string }
> = {
  event: { label: "Event", color: "var(--color-critical)" },
  breach: { label: "Breach", color: "var(--color-critical)" },
  drift: { label: "Drift", color: "var(--color-warning)" },
  pattern: { label: "Pattern", color: "var(--color-warning)" },
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
