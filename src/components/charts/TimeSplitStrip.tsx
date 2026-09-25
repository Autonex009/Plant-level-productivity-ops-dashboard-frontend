import type { TimeCategory, TimeSplitRow } from "@/api/types";
import { formatMinutes } from "@/lib/format";
import { TIME_CATEGORIES, TIME_CATEGORY_META } from "@/lib/viz";

import { ChartFrame, EmptyPlot } from "./ChartFrame";
import { Donut } from "./Donut";

/**
 * Where did the minutes go?
 *
 * A 100% stacked horizontal strip, one row per machine, segments always in the
 * same order so the eye compares rows without re-reading the legend.
 *
 * Two of the five colours are greys with no chroma - setup because planned time
 * must never be painted as a breakdown, idle because it is the most recessive
 * state on the screen. Colour alone therefore cannot carry the reading, so
 * every segment wide enough to hold one is directly labelled, every segment has
 * a title, and the legend is always present.
 */
export function TimeSplitStrip({
  rows,
  title = "Where the minutes went",
}: {
  rows: TimeSplitRow[];
  title?: string;
}) {
  if (!rows.length) {
    return (
      <ChartFrame title={title} question="Where did the minutes go?">
        <EmptyPlot>No time logged for these machines in this period.</EmptyPlot>
      </ChartFrame>
    );
  }

  return (
    <ChartFrame
      title={title}
      question="Where did the minutes go?"
      height={Math.max(rows.length * 84 + 12, 160)}
      legend={TIME_CATEGORIES.map((category) => ({
        label: TIME_CATEGORY_META[category].label,
        color: TIME_CATEGORY_META[category].color,
        planned: TIME_CATEGORY_META[category].planned,
      }))}
    >
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.machine_id} className="flex items-center gap-3">
            {/* The glance: how much of this machine's logged time was
                actually running. The strip beside it carries the breakdown. */}
            <Donut
              parts={TIME_CATEGORIES.filter((category) => (row.minutes[category] ?? 0) > 0).map(
                (category) => ({
                  label: TIME_CATEGORY_META[category].label,
                  value: row.minutes[category] ?? 0,
                  color: TIME_CATEGORY_META[category].color,
                }),
              )}
              center={`${row.shares.running ?? 0}%`}
              inner="running"
            />
            <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-[12px] font-medium text-[var(--color-ink)]">
                {row.machine_code}
                <span className="ml-1.5 font-normal text-[var(--color-ink-muted)]">
                  {row.name}
                </span>
              </span>
              <span className="tnum shrink-0 text-[11px] text-[var(--color-ink-muted)]">
                {formatMinutes(row.total)} logged
              </span>
            </div>

            <div className="flex h-7 w-full gap-[2px] overflow-hidden rounded-[5px]">
              {TIME_CATEGORIES.map((category) => {
                const share = row.shares[category] ?? 0;
                if (share <= 0) return null;
                const meta = TIME_CATEGORY_META[category];
                const minutes = row.minutes[category] ?? 0;
                return (
                  <div
                    key={category}
                    title={`${meta.label}: ${formatMinutes(minutes)} (${share}%)`}
                    className="flex min-w-0 items-center justify-center first:rounded-l-[5px] last:rounded-r-[5px]"
                    style={{ width: `${share}%`, backgroundColor: meta.color }}
                  >
                    {/* Direct label wherever the segment can hold one - the
                        required relief for the grey segments. */}
                    {share >= 9 && (
                      <span className="tnum truncate px-1 text-[10px] font-medium text-white mix-blend-luminosity">
                        {share}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* The same figures as a readable row, so nothing depends on being
                able to compare two greys. */}
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              {TIME_CATEGORIES.filter((category) => (row.minutes[category] ?? 0) > 0).map(
                (category) => (
                  <span
                    key={category}
                    className="tnum text-[10px] text-[var(--color-ink-muted)]"
                  >
                    <span
                      aria-hidden
                      className="mr-1 inline-block h-1.5 w-1.5 rounded-[2px] align-middle"
                      style={{ backgroundColor: TIME_CATEGORY_META[category].color }}
                    />
                    {TIME_CATEGORY_META[category].label}{" "}
                    {formatMinutes(row.minutes[category as TimeCategory])}
                  </span>
                ),
              )}
            </div>
            </div>
          </li>
        ))}
      </ul>
    </ChartFrame>
  );
}
