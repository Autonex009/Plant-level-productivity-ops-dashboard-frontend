import { Link } from "react-router-dom";

import { useStageView } from "@/api/queries";
import type { Stage } from "@/api/types";
import { KpiCard } from "@/components/KpiCard";
import { MiniArc } from "@/components/MiniViz";
import { ProcessFlow } from "@/components/ProcessFlow";
import { ErrorPanel, LoadingPanel, Shell } from "@/components/Shell";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { TrendLine } from "@/components/charts/TrendLine";
import { useRange } from "@/lib/useRange";
import { kpiArcRange, RAG_META, STAGE_BLURB, STAGE_LABEL, STAGES } from "@/lib/viz";

/**
 * Production Efficiency - "how efficient is each stage, side by side?"
 *
 * Reuses the same per-stage KPIs and 7-day trend as the stage view (Level 2),
 * laid out for all three stages at once instead of one at a time, so a reader
 * compares Boarding against Printing against Bundling without tabbing between
 * three pages. Each section still opens into that stage's full down-and-back
 * view for the hour-by-hour and causes detail.
 */
export function ProductionEfficiency() {
  const { range, withRange } = useRange();
  const boarding = useStageView("board_manufacturing", range);
  const printing = useStageView("printing", range);
  const bundling = useStageView("bundling", range);

  const byStage: Record<Stage, ReturnType<typeof useStageView>> = {
    board_manufacturing: boarding,
    printing,
    bundling,
  };

  const crumbs = [{ label: "Production Efficiency" }];
  const anyPending = boarding.isPending || printing.isPending || bundling.isPending;
  const statusLine =
    boarding.data?.status_line ?? printing.data?.status_line ?? bundling.data?.status_line;
  const rangeInfo = boarding.data?.range ?? printing.data?.range ?? bundling.data?.range;

  if (anyPending) {
    return (
      <Shell crumbs={crumbs}>
        <LoadingPanel label="Reading every stage" />
      </Shell>
    );
  }

  return (
    <Shell crumbs={crumbs} range={rangeInfo}>
      <div className="flex flex-col gap-4">
        {statusLine && <ProcessFlow stages={statusLine} />}

        {STAGES.map((stage) => (
          <StageEfficiencySection
            key={stage}
            stage={stage}
            query={byStage[stage]}
            openStage={withRange(`/stage/${stage}`)}
          />
        ))}
      </div>
    </Shell>
  );
}

function StageEfficiencySection({
  stage,
  query,
  openStage,
}: {
  stage: Stage;
  query: ReturnType<typeof useStageView>;
  openStage: string;
}) {
  if (query.isError) {
    return <ErrorPanel error={query.error} hint={`Could not load ${STAGE_LABEL[stage]}.`} />;
  }

  const data = query.data;
  if (!data) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <div>
          <h2 className="text-[14px] font-semibold text-[var(--color-ink)]">{STAGE_LABEL[stage]}</h2>
          <span className="text-[11px] text-[var(--color-ink-muted)]">{STAGE_BLURB[stage]}</span>
        </div>
        <Link
          to={openStage}
          className="shrink-0 text-[12px] text-[var(--color-series-1)] transition hover:underline"
        >
          Open full view →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {data.kpis.map((kpi) => {
          const range = kpiArcRange({ ...kpi, lowerIsBetter: kpi.lower_is_better });
          return (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={kpi.value}
              unit={kpi.unit}
              target={kpi.target}
              rag={kpi.rag}
              provisional={kpi.provisional}
              lowerIsBetter={kpi.lower_is_better}
              viz={
                range ? (
                  <MiniArc
                    value={kpi.value}
                    min={range.min}
                    max={range.max}
                    target={kpi.target}
                    color={RAG_META[kpi.rag].color}
                  />
                ) : undefined
              }
            />
          );
        })}
      </div>

      <ChartFrame
        title="7-day trend"
        question={`Which direction is ${STAGE_LABEL[stage]} moving?`}
        height={170}
      >
        <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <span className="text-[11px] text-[var(--color-ink-2)]">First-pass good</span>
            <TrendLine
              label="First-pass good"
              unit="%"
              height={130}
              data={data.trend_7d.map((point) => ({
                date: point.date,
                value: point.first_pass_good_pct,
              }))}
            />
          </div>
          <div>
            <span className="text-[11px] text-[var(--color-ink-2)]">
              {stage === "bundling" ? "Uptime" : "Rate efficiency"}
            </span>
            <TrendLine
              label={stage === "bundling" ? "Uptime" : "Rate efficiency"}
              unit="%"
              height={130}
              data={data.trend_7d.map((point) => ({
                date: point.date,
                value: stage === "bundling" ? point.uptime_pct : point.rate_efficiency_pct,
              }))}
            />
          </div>
        </div>
      </ChartFrame>
    </section>
  );
}
