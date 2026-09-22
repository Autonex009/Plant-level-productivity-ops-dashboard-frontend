import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { HourlyBucket } from "@/api/types";
import { formatBucket, formatMinutes, formatNumber } from "@/lib/format";
import { AXIS_PROPS, GRID_PROPS, SERIES, TIME_CATEGORY_META } from "@/lib/viz";

import { ChartFrame, EmptyPlot, TooltipShell } from "./ChartFrame";

/**
 * How did the hours go?
 *
 * Vertical bars against a takt line, cause-annotated. The annotation is the
 * point: an amber hour labelled "splice failures 17:00-18:00" explains itself,
 * so the reader does not have to open a second screen to find out why a bar is
 * short.
 *
 * In Week/Month/Custom the bars become days; the form does not change.
 */
export function HourlyBars({
  buckets,
  unit,
  title = "Output by hour",
  onSelect,
}: {
  buckets: HourlyBucket[];
  unit: string;
  title?: string;
  onSelect?: (bucket: HourlyBucket) => void;
}) {
  if (!buckets.length) {
    return (
      <ChartFrame title={title} question="How did the hours go?">
        <EmptyPlot>No production logged in this period yet.</EmptyPlot>
      </ChartFrame>
    );
  }

  // The takt line is the mean of the hours that actually ran, so a half-hour at
  // the start of a shift does not drag the reference down.
  const producing = buckets.filter((bucket) => bucket.output > 0);
  const takt = producing.length
    ? producing.reduce((sum, bucket) => sum + bucket.output, 0) / producing.length
    : 0;

  const annotated = buckets.filter((bucket) => bucket.annotation);

  return (
    <ChartFrame
      title={title}
      question="How did the hours go?"
      legend={[
        { label: `Output (${unit})`, color: SERIES.actual },
        { label: "Period average", color: SERIES.plan, dashed: true },
      ]}
      note={
        annotated.length ? (
          <>
            <span className="text-[var(--color-ink-2)]">Why the short bars: </span>
            {annotated
              .slice(0, 3)
              .map((bucket) => `${bucket.bucket} ${bucket.annotation}`)
              .join(" · ")}
          </>
        ) : null
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ top: 6, right: 8, bottom: 0, left: -14 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="bucket" tickFormatter={formatBucket} {...AXIS_PROPS} minTickGap={12} />
          <YAxis
            {...AXIS_PROPS}
            width={52}
            tickFormatter={(value: number) => formatNumber(value, 0)}
          />
          <Tooltip
            cursor={{ fill: "var(--color-surface-2)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const bucket = payload[0].payload as HourlyBucket;
              const rows = Object.entries(bucket.minutes_by_category).map(
                ([category, minutes]) => ({
                  label: TIME_CATEGORY_META[category as keyof typeof TIME_CATEGORY_META].label,
                  value: formatMinutes(minutes as number),
                  color: TIME_CATEGORY_META[category as keyof typeof TIME_CATEGORY_META].color,
                }),
              );
              return (
                <TooltipShell
                  title={formatBucket(String(label))}
                  rows={[
                    {
                      label: "Output",
                      value: `${formatNumber(bucket.output, 0)} ${unit}`,
                      color: SERIES.actual,
                    },
                    ...rows,
                  ]}
                  footer={bucket.annotation ?? undefined}
                />
              );
            }}
          />
          {takt > 0 && (
            <ReferenceLine
              y={takt}
              stroke={SERIES.plan}
              strokeDasharray="5 4"
              strokeWidth={2}
            />
          )}
          <Bar
            dataKey="output"
            radius={[4, 4, 0, 0]}
            // Without a cap, a shift with one logged hour renders a single bar
            // the full width of the plot, which reads as a filled area rather
            // than as one hour's output.
            maxBarSize={44}
            isAnimationActive={false}
            onClick={(_, index) => onSelect?.(buckets[index])}
            cursor={onSelect ? "pointer" : undefined}
          >
            {buckets.map((bucket) => (
              <Cell
                key={bucket.bucket}
                fill={SERIES.actual}
                // An hour that lost time to a named cause is dimmed, so the
                // annotation below has something to point at.
                fillOpacity={bucket.annotation ? 0.55 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
