import type { ParetoBar } from "@/api/types";
import { formatMinutes, formatNumber } from "@/lib/format";
import { paretoColor } from "@/lib/viz";

import { ChartFrame, EmptyPlot } from "./ChartFrame";

/**
 * What do I fix first?
 *
 * A horizontal Pareto, planned time in grey. Two decisions worth naming:
 *
 *  - Planned time (order changes, planned maintenance) is never red. Painting a
 *    changeover the same colour as a breakdown is how a dashboard loses the
 *    shop floor.
 *  - The cumulative percentage rides as a label on each bar rather than as a
 *    second line on a second axis. A dual-axis chart is the most common way to
 *    make a Pareto unreadable, and the running total is a number people read,
 *    not a shape they compare.
 */
export function Pareto({
  bars,
  title = "Downtime causes",
  question = "What do I fix first?",
  unit = "minutes",
  onSelect,
  selectedCode,
  height,
}: {
  bars: ParetoBar[];
  title?: string;
  question?: string;
  unit?: "minutes" | "quantity";
  onSelect?: (bar: ParetoBar) => void;
  selectedCode?: string | null;
  height?: number | "auto";
}) {
  if (!bars.length) {
    return (
      <ChartFrame title={title} question={question}>
        <EmptyPlot>Nothing recorded against a reason code in this period.</EmptyPlot>
      </ChartFrame>
    );
  }

  const value = (bar: ParetoBar) => (unit === "minutes" ? (bar.minutes ?? 0) : (bar.quantity ?? 0));
  const max = Math.max(...bars.map(value)) || 1;
  const hasPlanned = bars.some((bar) => bar.planned);

  return (
    <ChartFrame
      title={title}
      question={question}
      // Rows vary in height (some carry an event count, some do not), so the
      // list sizes itself rather than being squeezed into an estimate - which
      // was overlapping the share labels of the last bar.
      height={height ?? "auto"}
      legend={
        hasPlanned
          ? [
              { label: "Unplanned loss", color: paretoColor(false) },
              { label: "Planned time", color: paretoColor(true), planned: true },
            ]
          : undefined
      }
    >
      <ul className="flex flex-col justify-start gap-2">
        {bars.map((bar) => {
          const width = (value(bar) / max) * 100;
          const selected = selectedCode === bar.code;
          const Row = onSelect ? "button" : "div";
          return (
            <li key={bar.code}>
              <Row
                {...(onSelect ? { type: "button" as const, onClick: () => onSelect(bar) } : {})}
                aria-pressed={onSelect ? selected : undefined}
                className={[
                  "group block w-full rounded-md px-1.5 py-1 text-left transition",
                  onSelect ? "cursor-pointer hover:bg-[var(--color-surface-2)]" : "",
                  selected ? "bg-[var(--color-surface-2)]" : "",
                ].join(" ")}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[12px] text-[var(--color-ink-2)]">
                    {bar.label}
                    {bar.planned && (
                      <span className="ml-1.5 text-[10px] text-[var(--color-ink-muted)]">
                        planned
                      </span>
                    )}
                  </span>
                  <span className="tnum shrink-0 text-[12px] font-medium text-[var(--color-ink)]">
                    {unit === "minutes"
                      ? formatMinutes(bar.minutes)
                      : formatNumber(bar.quantity, 0)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-[3px] bg-[var(--color-surface-3)]">
                    <div
                      className="h-full rounded-[3px]"
                      style={{ width: `${width}%`, backgroundColor: paretoColor(bar.planned) }}
                    />
                  </div>
                  {/* The running total as a label, not a second y-axis. */}
                  <span className="tnum w-[62px] shrink-0 text-right text-[10px] text-[var(--color-ink-muted)]">
                    {bar.share_pct}% · Σ{bar.cumulative_pct}%
                  </span>
                </div>
                {bar.events != null && (
                  <span className="tnum mt-0.5 block text-[10px] text-[var(--color-ink-muted)]">
                    {bar.events} {bar.events === 1 ? "event" : "events"}
                    {onSelect ? " · click for the event log" : ""}
                  </span>
                )}
              </Row>
            </li>
          );
        })}
      </ul>
    </ChartFrame>
  );
}
