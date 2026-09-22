import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatAxisTick, formatDay, formatMetric } from "@/lib/format";
import { AXIS_PROPS, GRID_PROPS, SERIES } from "@/lib/viz";

import { EmptyPlot, TooltipShell } from "./ChartFrame";

/**
 * Which direction are we moving?
 *
 * A line with a target band, the same form at every level. One metric per plot
 * rather than several on shared axes - two measures of different scale get two
 * charts, never two y-axes.
 *
 * Monsoon days carry a wash behind the line so a seasonal dip reads as expected
 * rather than as a failure.
 */
export interface TrendDatum {
  date: string;
  value: number | null;
  isMonsoon?: boolean;
}

export function TrendLine({
  data,
  unit,
  target,
  redLine,
  height = 96,
  label,
  provisionalLast = true,
}: {
  data: TrendDatum[];
  unit: string;
  target?: number | null;
  redLine?: number | null;
  height?: number;
  label: string;
  /** The final point is usually today, which is only part of a day. Drawn as a
   *  hollow marker so a partial day does not read as a collapse. */
  provisionalLast?: boolean;
}) {
  const lastIndex = data.length - 1;
  const points = data.filter((point) => point.value != null);
  if (points.length < 2) {
    return (
      <div style={{ height }}>
        <EmptyPlot>Not enough history yet.</EmptyPlot>
      </div>
    );
  }

  // Contiguous monsoon spans, so the wash is one band rather than one per day.
  const monsoonSpans: { from: string; to: string }[] = [];
  let open: { from: string; to: string } | null = null;
  for (const point of data) {
    if (point.isMonsoon) {
      if (open) open.to = point.date;
      else open = { from: point.date, to: point.date };
    } else if (open) {
      monsoonSpans.push(open);
      open = null;
    }
  }
  if (open) monsoonSpans.push(open);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -2 }}>
          <CartesianGrid {...GRID_PROPS} />
          {monsoonSpans.map((span) => (
            <ReferenceArea
              key={span.from}
              x1={span.from}
              x2={span.to}
              fill="var(--color-ink-muted)"
              fillOpacity={0.07}
              stroke="none"
            />
          ))}
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            {...AXIS_PROPS}
            minTickGap={40}
            tick={{ fill: "var(--color-ink-muted)", fontSize: 10 }}
          />
          <YAxis
            {...AXIS_PROPS}
            // Wide enough for the longest tick this axis can produce. At 44px a
            // three-digit percentage lost its leading character and quietly
            // reported 87.4 as 37.4.
            width={unit === "INR" ? 62 : 48}
            domain={["auto", "auto"]}
            tick={{ fill: "var(--color-ink-muted)", fontSize: 10 }}
            tickCount={4}
            // A compacted rupee axis collapses neighbouring ticks into the same
            // label ("3.00 L" twice), so money gets its own scale-aware ticks.
            tickFormatter={(value: number) => formatAxisTick(value, unit)}
          />
          {redLine != null && (
            <ReferenceLine y={redLine} stroke="var(--color-critical)" strokeDasharray="3 4" strokeOpacity={0.6} />
          )}
          {target != null && (
            <ReferenceLine y={target} stroke="var(--color-good)" strokeDasharray="5 4" strokeOpacity={0.7} />
          )}
          <Tooltip
            cursor={{ stroke: "var(--color-hairline-strong)", strokeWidth: 1 }}
            content={({ active, payload, label: axisLabel }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as TrendDatum;
              return (
                <TooltipShell
                  title={formatDay(String(axisLabel))}
                  rows={[
                    {
                      label,
                      value: `${formatMetric(point.value, unit)}${unit === "%" ? "%" : ""}`,
                      color: SERIES.actual,
                    },
                    ...(target != null
                      ? [{ label: "Target", value: formatMetric(target, unit) }]
                      : []),
                  ]}
                  footer={point.isMonsoon ? "Monsoon month — wider band applies" : undefined}
                />
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={SERIES.actual}
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, index, key } = props as {
                cx: number;
                cy: number;
                index: number;
                key?: string;
              };
              if (!provisionalLast || index !== lastIndex || cx == null || cy == null) {
                return <g key={key ?? `dot-${index}`} />;
              }
              return (
                <circle
                  key={key ?? `dot-${index}`}
                  cx={cx}
                  cy={cy}
                  r={3.5}
                  fill="var(--color-surface-1)"
                  stroke={SERIES.actual}
                  strokeWidth={2}
                />
              );
            }}
            connectNulls
            activeDot={{ r: 3.5, strokeWidth: 2, stroke: "var(--color-surface-1)" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
