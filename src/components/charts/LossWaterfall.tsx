import type { WaterfallStep } from "@/api/types";
import { formatNumber } from "@/lib/format";

import { ChartFrame, EmptyPlot } from "./ChartFrame";

/**
 * Where did the potential go?
 *
 * A funnel of shrinking bars: Potential (100%) narrows through each named
 * loss down to Delivered. Matches the reference exactly - a stack of
 * horizontal rows whose width is the running total after that loss, not a
 * floating waterfall chart, because the running total *is* the story: read
 * the shrink, not a bar's offset from zero.
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
  const rows = steps.map((step) => {
    running = step.kind === "total" ? step.value : running + step.value;
    return { step, remaining: running };
  });
  const potential = rows[0]?.remaining || 100;

  return (
    <ChartFrame
      title="Loss waterfall"
      question="Where did the potential go?"
      note="Each loss is named and sized so it has an owner. Click a loss to open its causes."
    >
      <div className="flex flex-col gap-2.5">
        {rows.map(({ step, remaining }, index) => {
          const isFirst = index === 0;
          const isLast = index === rows.length - 1;
          const color = isFirst
            ? "var(--color-surface-3)"
            : isLast
              ? "var(--color-good)"
              : step.key === "not_running"
                ? "var(--color-critical-soft)"
                : "var(--color-warning-soft)";
          const widthPct = potential ? Math.max((remaining / potential) * 100, 2) : 2;
          const clickable = !isFirst && !isLast && Boolean(onSelectLoss);

          return (
            <button
              key={step.key}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onSelectLoss?.(step)}
              title={step.owner ? `${step.label} — owned by ${step.owner}` : step.label}
              className={[
                "flex items-center gap-2.5 text-left text-[12px]",
                isLast ? "font-semibold text-[var(--color-ink)]" : "text-[var(--color-ink-2)]",
                clickable ? "cursor-pointer" : "cursor-default",
              ].join(" ")}
            >
              <span className="w-24 shrink-0 truncate sm:w-28">{step.label}</span>
              <span className="h-3 max-w-[60%] flex-1">
                <span
                  className="block h-full rounded transition-all"
                  style={{ width: `${widthPct}%`, backgroundColor: color }}
                />
              </span>
              <span className="tnum w-16 shrink-0 text-right">
                {step.value > 0 && !isFirst && !isLast ? "+" : ""}
                {formatNumber(step.value, 1)}%
              </span>
              {step.owner && (
                <span className="hidden shrink-0 truncate text-[11px] text-[var(--color-ink-muted)] sm:block">
                  {step.owner}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </ChartFrame>
  );
}
