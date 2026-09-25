import type { WaterfallStep } from "@/api/types";
import { formatNumber } from "@/lib/format";

import { ChartFrame, EmptyPlot } from "./ChartFrame";

const LOSS_COLOR: Record<string, string> = {
  not_running: "var(--color-critical)",
  ran_slow: "var(--color-warning)",
  rejected: "var(--color-kraft)",
};

const W = 620;
const H = 190;
const TOP = 26;
const BOT = 160;
const BAR_W = 66;

/**
 * Where did the potential go, drawn as a floating waterfall - each loss a
 * column hanging between the running total before it and after it, joined by
 * a dashed step-down line, ending in one green delivered column.
 *
 * The plain shrinking-bar version this replaces was kept for a reason - "the
 * running total is the story" - and that's still true here: every bar's
 * *bottom* edge is still the running total after that loss, dashed straight
 * across to the next bar. This version just also shows the *size* of each
 * loss as its own height, which the shrinking-bar version left to the
 * value label alone.
 */
export function LossWaterfall({
  steps,
  onSelectLoss,
}: {
  steps: WaterfallStep[];
  onSelectLoss?: (step: WaterfallStep) => void;
}) {
  if (!steps.length) {
    return (
      <ChartFrame title="Loss waterfall" question="Where did the potential go?">
        <EmptyPlot>
          Utilisation, rate and quality are not all available for this period yet.
        </EmptyPlot>
      </ChartFrame>
    );
  }

  let running = 0;
  const cols = steps.map((step) => {
    const before = running;
    running = step.kind === "total" ? step.value : running + step.value;
    const after = running;
    const top = step.kind === "total" ? step.value : before;
    const bottom = step.kind === "total" ? 0 : after;
    return { step, top, bottom };
  });

  const n = cols.length;
  const colW = W / n;
  const Y = (v: number) => BOT - (Math.max(0, Math.min(100, v)) / 100) * (BOT - TOP);

  return (
    <ChartFrame
      title="Loss waterfall"
      question="Where did the potential go?"
      note="Each loss is named and sized so it has an owner. Click a loss to open its causes."
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto block w-full"
        style={{ maxWidth: 560 }}
        role="img"
        aria-label="Loss waterfall from potential to delivered"
      >
        {cols.slice(0, -1).map((col, i) => {
          const nextX = (i + 1) * colW + (colW - BAR_W) / 2;
          const x = i * colW + (colW - BAR_W) / 2;
          const y = Y(col.bottom);
          return (
            <line
              key={`link-${col.step.key}`}
              x1={x + BAR_W}
              x2={nextX}
              y1={y}
              y2={y}
              stroke="var(--color-ink-muted)"
              strokeDasharray="4 3"
              strokeWidth={1}
            />
          );
        })}

        {cols.map((col, i) => {
          const x = i * colW + (colW - BAR_W) / 2;
          const isFirst = i === 0;
          const isLast = i === n - 1;
          const color = isFirst
            ? "var(--color-surface-3)"
            : isLast
              ? "var(--color-good)"
              : (LOSS_COLOR[col.step.key] ?? "var(--color-warning)");
          const clickable = !isFirst && !isLast && Boolean(onSelectLoss);
          const yTop = Y(col.top);
          const yBot = Y(col.bottom);
          const barH = Math.max(yBot - yTop, 2);
          const labelY = Math.min(yTop, yBot) - 8;

          return (
            <g key={col.step.key}>
              <rect
                x={x}
                y={Math.min(yTop, yBot)}
                width={BAR_W}
                height={barH}
                rx={3}
                fill={color}
                className={clickable ? "cursor-pointer" : undefined}
                onClick={clickable ? () => onSelectLoss?.(col.step) : undefined}
              >
                <title>
                  {col.step.owner ? `${col.step.label} — owned by ${col.step.owner}` : col.step.label}
                </title>
              </rect>
              <text
                x={x + BAR_W / 2}
                y={labelY}
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                fill={isLast ? "var(--color-good)" : "var(--color-ink)"}
              >
                {isFirst ? "100%" : isLast ? `${formatNumber(col.step.value, 0)}%` : formatNumber(col.step.value, 0)}
              </text>
              <text
                x={x + BAR_W / 2}
                y={BOT + 20}
                textAnchor="middle"
                fontSize={11.5}
                fill="var(--color-ink-2)"
              >
                {col.step.label}
              </text>
            </g>
          );
        })}
      </svg>
    </ChartFrame>
  );
}
