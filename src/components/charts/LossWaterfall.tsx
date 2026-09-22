import type { WaterfallStep } from "@/api/types";
import { formatNumber } from "@/lib/format";

import { ChartFrame, EmptyPlot } from "./ChartFrame";

/**
 * Where did the potential go?
 *
 * 100% → minus not-running → minus ran-slow → minus rejected → delivered. This
 * is the productivity card expanded into a picture: three named, sized, ownable
 * losses rather than one composite percentage nobody can act on.
 *
 * Drawn as plain elements rather than a charting primitive - a waterfall is a
 * sequence of positioned bars, and hand-drawing it keeps the floating segments
 * exactly on their running total.
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

  // Walk the steps to find where each floating bar starts and ends.
  let running = 0;
  const bars = steps.map((step) => {
    if (step.kind === "total") {
      const bar = { step, from: 0, to: step.value, floating: false };
      running = step.value;
      return bar;
    }
    const to = running;
    running += step.value; // losses arrive negative
    return { step, from: running, to, floating: true };
  });

  const LOSS_COLOR: Record<string, string> = {
    not_running: "var(--color-state-breakdown)",
    ran_slow: "var(--color-state-waiting)",
    rejected: "var(--color-serious)",
  };

  return (
    <ChartFrame
      title="Loss waterfall"
      question="Where did the potential go?"
      height={232}
      note="Each loss is named and sized so it has an owner. Click a loss to open its causes."
    >
      <div className="flex h-full items-stretch gap-2">
        {bars.map(({ step, from, to, floating }) => {
          const height = Math.abs(to - from);
          const color = floating
            ? (LOSS_COLOR[step.key] ?? "var(--color-state-breakdown)")
            : step.key === "delivered"
              ? "var(--color-good)"
              : "var(--color-surface-3)";
          const clickable = floating && onSelectLoss;

          return (
            <div key={step.key} className="flex min-w-0 flex-1 flex-col">
              <div className="relative flex-1">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && onSelectLoss(step)}
                  title={
                    step.owner
                      ? `${step.label} — owned by ${step.owner}`
                      : `${step.label} ${formatNumber(step.value, 1)}%`
                  }
                  className={[
                    "absolute inset-x-0 rounded-[4px] transition",
                    clickable ? "cursor-pointer hover:brightness-125" : "cursor-default",
                  ].join(" ")}
                  style={{
                    backgroundColor: color,
                    bottom: `${Math.min(from, to)}%`,
                    height: `${Math.max(height, 0.8)}%`,
                    // A 2px surface gap keeps adjacent fills from fusing.
                    outline: "2px solid var(--color-surface-1)",
                  }}
                />
                {/* Value sits above its own bar - selective direct labelling,
                    not a number on every tick. A bar that reaches the top of the
                    plot has no room above it, so its label moves inside rather
                    than escaping into the chart header. */}
                {(() => {
                  const top = Math.max(from, to);
                  const inside = top > 88;
                  return (
                    <span
                      className={[
                        "tnum pointer-events-none absolute inset-x-0 text-center text-[11px] font-medium",
                        inside ? "text-white mix-blend-luminosity" : "text-[var(--color-ink)]",
                      ].join(" ")}
                      style={
                        inside
                          ? { top: `calc(${100 - top}% + 6px)` }
                          : { bottom: `calc(${top}% + 4px)` }
                      }
                    >
                      {formatNumber(step.value, 1)}
                    </span>
                  );
                })()}
              </div>

              <div className="mt-2 min-w-0 text-center">
                <span className="block truncate text-[11px] text-[var(--color-ink-2)]">
                  {step.label}
                </span>
                {step.owner && (
                  <span className="block truncate text-[10px] text-[var(--color-ink-muted)]">
                    {step.owner}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ChartFrame>
  );
}
