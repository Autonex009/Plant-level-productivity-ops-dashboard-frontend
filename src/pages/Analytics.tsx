import { useState } from "react";

import { usePlantOverview, useStageSpecifics, useTrends } from "@/api/queries";
import type { ParetoBar, Stage } from "@/api/types";
import { AlertPanel } from "@/components/AlertPanel";
import { ErrorPanel, LoadingPanel, Shell } from "@/components/Shell";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { LossWaterfall } from "@/components/charts/LossWaterfall";
import { TrendLine } from "@/components/charts/TrendLine";
import { useRange } from "@/lib/useRange";
import { STAGE_LABEL, STAGES } from "@/lib/viz";

const TREND_METRICS = [
  ["overall_yield_pct", "Overall yield %, 30 days", "%"],
  ["cost_of_waste_inr", "Cost of waste, per day", "INR"],
  ["plant_productivity_pct", "Plant productivity %", "%"],
  ["power_per_tonne_kwh", "Power, kWh per tonne", "kWh/t"],
] as const;

/**
 * Analytics and AI Suggestions - direction over 30 days, where the period's
 * potential went, and what to fix next.
 *
 * "Suggestions" are computed from the same Pareto data every stage causes
 * panel already shows - the largest real downtime and defect cause per
 * stage, in this window - not generated content. A number here is only ever
 * one this app can also show you the receipt for.
 */
export function Analytics() {
  const { range } = useRange();
  // A single day's trend is not analysis; substitute the month view exactly
  // as the reference does.
  const effectiveRange = range.mode === "today" ? { mode: "month" } : range;

  const trends = useTrends(30);
  const overview = usePlantOverview(effectiveRange);
  const boarding = useStageSpecifics("board_manufacturing", effectiveRange);
  const printing = useStageSpecifics("printing", effectiveRange);
  const bundling = useStageSpecifics("bundling", effectiveRange);

  const specificsByStage: Record<Stage, ReturnType<typeof useStageSpecifics>> = {
    board_manufacturing: boarding,
    printing,
    bundling,
  };

  const crumbs = [{ label: "Analytics and AI Suggestions" }];
  const anyPending =
    trends.isPending ||
    overview.isPending ||
    boarding.isPending ||
    printing.isPending ||
    bundling.isPending;

  if (anyPending) {
    return (
      <Shell crumbs={crumbs}>
        <LoadingPanel label="Reading 30 days of history" />
      </Shell>
    );
  }
  if (trends.isError) {
    return (
      <Shell crumbs={crumbs}>
        <ErrorPanel error={trends.error} />
      </Shell>
    );
  }

  const suggestions = STAGES.flatMap((stage) => {
    const specifics = specificsByStage[stage];
    if (!specifics.data) return [];
    const top = (bars: ParetoBar[], kind: "downtime" | "defect") =>
      bars.length && !bars[0].planned
        ? { stage, kind, bar: bars[0] }
        : null;
    return [
      top(specifics.data.causes.downtime_pareto, "downtime"),
      top(specifics.data.causes.defect_pareto, "defect"),
    ].filter((x): x is { stage: Stage; kind: "downtime" | "defect"; bar: ParetoBar } => x != null);
  });

  return (
    <Shell crumbs={crumbs} range={overview.data?.range}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TREND_METRICS.map(([key, label, unit]) => {
            const band = trends.data.bands[key];
            return (
              <ChartFrame key={key} title={label} height={100}>
                <TrendLine
                  label={label}
                  unit={unit}
                  target={band?.target ?? null}
                  redLine={band?.red_line ?? null}
                  height={100}
                  data={trends.data.points.map((point) => ({
                    date: point.date,
                    value: point[key],
                    isMonsoon: point.is_monsoon,
                  }))}
                />
              </ChartFrame>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.4fr_1fr]">
          <ChartFrame
            title="Suggestions"
            question="The largest real cause in this window, per stage - verify on the floor before acting."
            height="auto"
          >
            {suggestions.length === 0 ? (
              <p className="py-4 text-[12px] text-[var(--color-ink-muted)]">
                No unplanned cause stands out in this window.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {suggestions.map((s) => (
                  <SuggestionCard key={`${s.stage}-${s.kind}-${s.bar.code}`} {...s} />
                ))}
              </div>
            )}
          </ChartFrame>

          <div className="flex flex-col gap-3">
            {overview.data && (
              <ChartFrame title="Where potential was lost, this month" height="auto">
                <LossWaterfall steps={overview.data.waterfall} />
              </ChartFrame>
            )}
            {overview.data && (
              <ChartFrame title="Recurring issues" question="The review meeting, pre-written." height="auto">
                <AlertPanel
                  alerts={overview.data.alerts}
                  recurring={overview.data.recurring_issues}
                  mode="recurring"
                  cap={6}
                />
              </ChartFrame>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function SuggestionCard({
  stage,
  kind,
  bar,
}: {
  stage: Stage;
  kind: "downtime" | "defect";
  bar: ParetoBar;
}) {
  const [ack, setAck] = useState<"useful" | "dismiss" | null>(null);
  const quantity = kind === "downtime" ? bar.minutes : bar.quantity;
  const noun = kind === "downtime" ? "min lost" : "rejected";

  return (
    <div className="rounded-r-[9px] border-l-[3px] border-[var(--color-series-1)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[13px]">
      <span className="font-semibold text-[var(--color-ink)]">
        {STAGE_LABEL[stage]}: address "{bar.label}"
      </span>
      <div className="mt-0.5 text-[12.5px] text-[var(--color-ink-2)]">
        Evidence: the largest {kind === "downtime" ? "unplanned stop" : "reject"} cause in this
        window — {quantity != null ? `${quantity} ${noun}, ` : ""}
        {bar.share_pct}% of {kind === "downtime" ? "downtime" : "rejects"} in {STAGE_LABEL[stage]}.
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <button
          type="button"
          onClick={() => setAck("useful")}
          className={[
            "rounded-[7px] border px-2.5 py-0.5 text-[11.5px] font-semibold transition",
            ack === "useful"
              ? "border-[var(--color-good-soft)] text-[var(--color-good)]"
              : "border-[var(--color-hairline)] bg-[var(--color-surface-1)] text-[var(--color-ink-2)]",
          ].join(" ")}
        >
          useful
        </button>
        <button
          type="button"
          onClick={() => setAck("dismiss")}
          className={[
            "rounded-[7px] border px-2.5 py-0.5 text-[11.5px] font-semibold transition",
            ack === "dismiss"
              ? "border-[var(--color-good-soft)] text-[var(--color-good)]"
              : "border-[var(--color-hairline)] bg-[var(--color-surface-1)] text-[var(--color-ink-2)]",
          ].join(" ")}
        >
          dismiss
        </button>
      </div>
    </div>
  );
}
