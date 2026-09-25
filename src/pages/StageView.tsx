import { useNavigate, useParams } from "react-router-dom";

import { useStageView } from "@/api/queries";
import type { ChartPayload, MachineTile, OrderCard, Stage } from "@/api/types";
import { AlertPanel } from "@/components/AlertPanel";
import { KpiCard } from "@/components/KpiCard";
import { MachineTileCard } from "@/components/MachineTileCard";
import { ProcessFlow } from "@/components/ProcessFlow";
import { ErrorPanel, LoadingPanel, Shell } from "@/components/Shell";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { HourlyBars } from "@/components/charts/HourlyBars";
import { Pareto } from "@/components/charts/Pareto";
import { StarvationTimeline } from "@/components/charts/StarvationTimeline";
import { TimeSplitStrip } from "@/components/charts/TimeSplitStrip";
import { TrendLine } from "@/components/charts/TrendLine";
import { formatNumber } from "@/lib/format";
import { useRange } from "@/lib/useRange";
import { STAGE_LABEL, STAGES } from "@/lib/viz";

/**
 * Level 2 - the stage view. "Which part of Boarding, Printing or Bundling is
 * hurting?"
 *
 * One template, three stages. The context row is its defining element, and the
 * current order card is the fairness device inside it: an actual speed is only
 * meaningful next to the budgeted speed for that job. Without it every number
 * invites an argument; with it the same number invites a question.
 */
export function StageView() {
  const { stage } = useParams<{ stage: Stage }>();
  const { range, withRange } = useRange();
  const navigate = useNavigate();
  const valid = stage && STAGES.includes(stage);
  const query = useStageView((valid ? stage : "board_manufacturing") as Stage, range);

  const crumbs = [
    { label: "Plant", to: withRange("/") },
    { label: valid ? STAGE_LABEL[stage] : "Unknown stage" },
  ];

  if (!valid) {
    return (
      <Shell crumbs={crumbs}>
        <ErrorPanel error={new Error(`No such stage: ${stage}`)} hint="Pick a stage from the status line." />
      </Shell>
    );
  }
  if (query.isPending) {
    return (
      <Shell crumbs={crumbs}>
        <LoadingPanel label={`Reading ${STAGE_LABEL[stage]}`} />
      </Shell>
    );
  }
  if (query.isError) {
    return (
      <Shell crumbs={crumbs}>
        <ErrorPanel error={query.error} />
      </Shell>
    );
  }

  const data = query.data;
  const toSpecifics = (panel: string, extra: Record<string, string | undefined> = {}) =>
    navigate(withRange(`/stage/${stage}/specifics`, { panel, ...extra }));

  return (
    <Shell crumbs={crumbs} range={data.range} generatedAt={undefined}>
      <div className="flex flex-col gap-4">
        {/* The process flow stays on every screen so the reader never loses the
            plant, with this stage marked. It shows all three stages live -
            building it from this stage's machines alone reported the other two
            as dead feeds. */}
        <ProcessFlow stages={data.status_line} activeStage={stage} />

        <ContextRow
          machines={data.context_row.machines}
          order={data.context_row.current_order}
          chip={data.context_row.parameters_chip}
          stagedToday={data.context_row.staged_orders_today}
          onOpenParameters={() => toSpecifics("parameters")}
        />

        {/* Five KPI cards maximum, judged against job-specific standards. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {data.kpis.map((kpi) => (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={kpi.value}
              unit={kpi.unit}
              target={kpi.target}
              rag={kpi.rag}
              provisional={kpi.provisional}
              lowerIsBetter={kpi.lower_is_better}
              sub={kpi.sub ? <span className="text-[var(--color-ink-muted)]">{kpi.sub}</span> : undefined}
              onClick={() => toSpecifics("hours", { metric: kpi.key })}
            />
          ))}
        </div>

        {/* The stage's two signature charts. */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <StageChart payload={data.charts.primary} stage={stage} onDrill={toSpecifics} />
          <StageChart payload={data.charts.secondary} stage={stage} onDrill={toSpecifics} />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
          <AlertPanel
            alerts={data.alerts}
            recurring={data.recurring_issues}
            mode={data.alerts_panel_mode}
            stage={stage}
          />

          <ChartFrame
            title="7-day trend"
            question="Which direction is this stage moving?"
            height={200}
            legend={[{ label: "First-pass good", color: "var(--color-series-1)" }]}
          >
            <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <span className="text-[11px] text-[var(--color-ink-2)]">First-pass good</span>
                <TrendLine
                  label="First-pass good"
                  unit="%"
                  height={150}
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
                  height={150}
                  data={data.trend_7d.map((point) => ({
                    date: point.date,
                    value:
                      stage === "bundling" ? point.uptime_pct : point.rate_efficiency_pct,
                  }))}
                />
              </div>
            </div>
          </ChartFrame>
        </div>
      </div>
    </Shell>
  );
}

/**
 * The context row: machine tiles, the current order card, and the parameters
 * chip summarising the operating-parameter layer in one phrase.
 */
function ContextRow({
  machines,
  order,
  chip,
  stagedToday,
  onOpenParameters,
}: {
  machines: MachineTile[];
  order: OrderCard | null;
  chip: { applicable: boolean; phrase: string | null; drifting: number };
  stagedToday: number | null;
  onOpenParameters: () => void;
}) {
  return (
    <section className="panel grid grid-cols-1 gap-4 p-4 lg:grid-cols-[1.4fr_1fr_auto]">
      {/* Machine scoreboard: one tile per machine. */}
      <div className="flex flex-wrap gap-2">
        {machines.map((machine) => (
          <MachineTileCard key={machine.machine_id} machine={machine} />
        ))}
      </div>

      {/* The order card - the fairness device. */}
      <div className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-3 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
          Current order
        </span>
        {order ? (
          <>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[14px] font-semibold text-[var(--color-ink)]">
                {order.order_number}
              </span>
              <span className="truncate text-[11px] text-[var(--color-ink-2)]">
                {order.customer_name}
              </span>
            </div>
            <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
              <Spec label="Construction" value={`${order.ply_construction ?? "--"} · ${order.flute_profile ?? "--"} flute`} />
              <Spec label="Paper" value={order.paper_gsm ? `${order.paper_gsm} gsm / ${order.paper_bf ?? "--"} BF` : "--"} />
              <Spec
                label="Budgeted"
                value={
                  order.stage_standard != null
                    ? `${formatNumber(order.stage_standard, 0)} ${order.stage_standard_unit ?? ""}`
                    : "no standard set"
                }
              />
              <Spec
                label="Quantity"
                value={order.quantity_ordered ? formatNumber(order.quantity_ordered, 0) : "--"}
              />
            </dl>
          </>
        ) : (
          <p className="mt-2 text-[11px] text-[var(--color-ink-muted)]">
            No order currently running on this stage.
          </p>
        )}
      </div>

      {/* Parameters in one phrase; the detail is one level down. */}
      <div className="flex flex-col justify-center gap-2">
        {chip.applicable ? (
          <button
            type="button"
            onClick={onOpenParameters}
            className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-3 py-2.5 text-left transition hover:border-[var(--color-hairline-strong)]"
          >
            <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
              Parameters
            </span>
            <span
              className="mt-1 block text-[13px] font-medium"
              style={{
                color: chip.drifting ? "var(--color-warning)" : "var(--color-good)",
              }}
            >
              {chip.drifting ? "◐" : "●"} {chip.phrase ?? "no readings"}
            </span>
            <span className="mt-0.5 block text-[10px] text-[var(--color-ink-muted)]">
              early-warning layer →
            </span>
          </button>
        ) : (
          <div className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-3 py-2.5">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
              Staged today
            </span>
            <span className="tnum mt-1 block text-[20px] font-semibold text-[var(--color-ink)]">
              {stagedToday ?? 0}
            </span>
            <span className="text-[10px] text-[var(--color-ink-muted)]">
              orders complete and staged
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[var(--color-ink-muted)]">{label}</dt>
      <dd className="truncate text-[var(--color-ink-2)]">{value}</dd>
    </div>
  );
}

function StageChart({
  payload,
  stage,
  onDrill,
}: {
  payload: ChartPayload;
  stage: Stage;
  onDrill: (panel: string, extra?: Record<string, string | undefined>) => void;
}) {
  switch (payload.kind) {
    case "hourly_bars":
      return (
        <HourlyBars
          buckets={payload.data}
          unit={stage === "board_manufacturing" ? "m" : stage === "printing" ? "sheets" : "bundles"}
          title={stage === "bundling" ? "Bundles by hour" : "Output by hour"}
          onSelect={(bucket) => onDrill("hours", { at: bucket.bucket })}
        />
      );
    case "pareto":
      return (
        <Pareto
          bars={payload.data}
          onSelect={(bar) => onDrill("causes", { reason: bar.code })}
        />
      );
    case "time_split_strip":
      return <TimeSplitStrip rows={payload.data} />;
    case "starvation_timeline":
      return <StarvationTimeline buckets={payload.data} />;
  }
}
