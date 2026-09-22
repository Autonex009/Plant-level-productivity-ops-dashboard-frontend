import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { StarvationBucket } from "@/api/types";
import { formatMinutes } from "@/lib/format";
import { AXIS_PROPS, GRID_PROPS } from "@/lib/viz";

import { ChartFrame, EmptyPlot, TooltipShell } from "./ChartFrame";

/**
 * Cause and effect, aligned on one time axis.
 *
 * Bundling's starvation is drawn directly above printing's lost minutes, on the
 * same hours, because starvation is recorded at bundling but owned upstream.
 * Two stacked mini-plots rather than two series in one frame: they measure
 * different things at different stages, and overlaying them would invite the
 * reader to compare heights that are not comparable.
 */
export function StarvationTimeline({ buckets }: { buckets: StarvationBucket[] }) {
  if (!buckets.length) {
    return (
      <ChartFrame title="Starvation vs upstream stops" question="Who caused the waiting?">
        <EmptyPlot>Bundling did not wait on printing in this period.</EmptyPlot>
      </ChartFrame>
    );
  }

  return (
    <ChartFrame
      title="Starvation vs upstream stops"
      question="Who caused the waiting?"
      height={228}
      legend={[
        { label: "Bundling waiting", color: "var(--color-state-waiting)" },
        { label: "Printing stopped", color: "var(--color-state-breakdown)" },
      ]}
      note="Recorded at bundling, owned by printing: the two rows share one time axis so the cause sits directly under its effect."
    >
      <div className="flex h-full flex-col">
        <MiniBars
          buckets={buckets}
          dataKey="starvation_minutes"
          color="var(--color-state-waiting)"
          label="Bundling waiting"
          showAxis={false}
        />
        <MiniBars
          buckets={buckets}
          dataKey="upstream_lost_minutes"
          color="var(--color-state-breakdown)"
          label="Printing stopped"
          showAxis
        />
      </div>
    </ChartFrame>
  );
}

function MiniBars({
  buckets,
  dataKey,
  color,
  label,
  showAxis,
}: {
  buckets: StarvationBucket[];
  dataKey: "starvation_minutes" | "upstream_lost_minutes";
  color: string;
  label: string;
  showAxis: boolean;
}) {
  return (
    <div className="min-h-0 flex-1">
      <span className="block text-[10px] uppercase tracking-wide text-[var(--color-ink-muted)]">
        {label}
      </span>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={buckets} margin={{ top: 2, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis
            dataKey="bucket"
            {...AXIS_PROPS}
            hide={!showAxis}
            tick={{ fill: "var(--color-ink-muted)", fontSize: 10 }}
            minTickGap={12}
          />
          <YAxis
            {...AXIS_PROPS}
            width={44}
            tick={{ fill: "var(--color-ink-muted)", fontSize: 10 }}
            tickFormatter={(value: number) => `${value}m`}
          />
          <Tooltip
            cursor={{ fill: "var(--color-surface-2)" }}
            content={({ active, payload, label: axisLabel }) => {
              if (!active || !payload?.length) return null;
              const bucket = payload[0].payload as StarvationBucket;
              return (
                <TooltipShell
                  title={String(axisLabel)}
                  rows={[
                    {
                      label: "Bundling waiting",
                      value: formatMinutes(bucket.starvation_minutes),
                      color: "var(--color-state-waiting)",
                    },
                    {
                      label: "Printing stopped",
                      value: formatMinutes(bucket.upstream_lost_minutes),
                      color: "var(--color-state-breakdown)",
                    },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
