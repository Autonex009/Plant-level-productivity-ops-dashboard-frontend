import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { FlightPath as FlightPathData } from "@/api/types";
import { formatBucket, formatNumber } from "@/lib/format";
import { AXIS_PROPS, GRID_PROPS, SERIES } from "@/lib/viz";

import { ChartFrame, EmptyPlot, TooltipShell } from "./ChartFrame";

/**
 * Will we make the period?
 *
 * Cumulative actual against the plan line, with the gap annotated in days -
 * which is what turns a quantity into a decision. "Three days behind plan" is
 * something an owner can act on; "1,180 tonnes against 1,400" is arithmetic
 * they have to do themselves.
 *
 * Hourly bars deliberately do not appear here; they belong one level down.
 */
export function FlightPath({ data }: { data: FlightPathData }) {
  if (!data.points.length) {
    return (
      <ChartFrame title="Production flight path" question="Will we make the period?">
        <EmptyPlot>No production recorded in this period yet.</EmptyPlot>
      </ChartFrame>
    );
  }

  const ahead = data.gap_tonnes >= 0;
  const gapDays = data.gap_days;

  return (
    <ChartFrame
      title="Production flight path"
      question="Will we make the period?"
      legend={[
        { label: "Actual", color: SERIES.actual },
        { label: "Plan", color: SERIES.plan, dashed: true },
      ]}
      action={
        data.plan_available && gapDays != null ? (
          <span
            className="tnum shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{
              color: ahead ? "var(--color-good)" : "var(--color-critical)",
              backgroundColor: ahead ? "rgb(12 163 12 / 0.12)" : "rgb(208 59 59 / 0.14)",
            }}
          >
            {ahead ? "▲" : "▼"} {Math.abs(gapDays)} {Math.abs(gapDays) === 1 ? "day" : "days"}{" "}
            {ahead ? "ahead of" : "behind"} plan
          </span>
        ) : null
      }
      note={
        data.plan_available ? (
          <>
            {formatNumber(data.actual_total, 1)} {data.unit} delivered against{" "}
            {formatNumber(data.plan_total, 1)} {data.unit} planned for the elapsed period.
          </>
        ) : (
          <>No production standard is configured, so only the actual line is drawn.</>
        )
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.points} margin={{ top: 6, right: 10, bottom: 0, left: -12 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="bucket" tickFormatter={formatBucket} {...AXIS_PROPS} minTickGap={24} />
          <YAxis
            {...AXIS_PROPS}
            width={52}
            tickFormatter={(value: number) => formatNumber(value, 0)}
            label={{
              value: data.unit,
              position: "insideTopLeft",
              offset: 8,
              fill: "var(--color-ink-muted)",
              fontSize: 10,
            }}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-hairline-strong)", strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as FlightPathData["points"][number];
              const behind = point.actual_cumulative - point.plan_cumulative;
              return (
                <TooltipShell
                  title={formatBucket(String(label))}
                  rows={[
                    {
                      label: "Actual",
                      value: `${formatNumber(point.actual_cumulative, 1)} ${data.unit}`,
                      color: SERIES.actual,
                    },
                    {
                      label: "Plan",
                      value: `${formatNumber(point.plan_cumulative, 1)} ${data.unit}`,
                      color: SERIES.plan,
                    },
                  ]}
                  footer={`${behind >= 0 ? "Ahead" : "Behind"} by ${formatNumber(
                    Math.abs(behind),
                    1,
                  )} ${data.unit}`}
                />
              );
            }}
          />
          {/* Plan is the reference, so it recedes: a thin dashed neutral line
              that the actual is read against. */}
          <Line
            type="monotone"
            dataKey="plan_cumulative"
            stroke={SERIES.plan}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="actual_cumulative"
            stroke={SERIES.actual}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-surface-1)" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
