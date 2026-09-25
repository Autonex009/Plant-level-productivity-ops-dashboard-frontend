import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import { useStageSpecifics } from "@/api/queries";
import type { HourRow, Stage, StageSpecifics as Specifics } from "@/api/types";
import { ErrorPanel, LoadingPanel, Shell } from "@/components/Shell";
import { BandStrip } from "@/components/charts/BandStrip";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { Pareto } from "@/components/charts/Pareto";
import { EventList } from "@/components/EventList";
import { formatClock, formatMinutes, formatNumber } from "@/lib/format";
import { useRange } from "@/lib/useRange";
import { STAGE_LABEL, STAGES, TIME_CATEGORIES, TIME_CATEGORY_META } from "@/lib/viz";

type Panel = "hours" | "causes" | "parameters";

/**
 * Level 3 - stage specifics. Levels 1 and 2 judge performance; this level
 * investigates it.
 *
 * Three panels sharing one time axis, plus the system's only write action.
 * There is no alert list here: this is where alerts land, and the surrounding
 * event log is the alert's context.
 */
export function StageSpecifics() {
  const { stage } = useParams<{ stage: Stage }>();
  const [searchParams] = useSearchParams();
  const { range, withRange } = useRange();

  const requestedPanel = (searchParams.get("panel") as Panel | null) ?? "hours";
  const focusKey = searchParams.get("focus");
  const focusMachine = searchParams.get("machine");
  const [reasonCode, setReasonCode] = useState<string | null>(searchParams.get("reason"));
  const [panel, setPanel] = useState<Panel>(requestedPanel);

  useEffect(() => setPanel(requestedPanel), [requestedPanel]);
  useEffect(() => setReasonCode(searchParams.get("reason")), [searchParams]);

  const valid = stage && STAGES.includes(stage);
  const query = useStageSpecifics(
    (valid ? stage : "board_manufacturing") as Stage,
    range,
    reasonCode ?? undefined,
  );

  const crumbs = [
    { label: "Plant", to: withRange("/") },
    { label: valid ? STAGE_LABEL[stage] : "Stage", to: withRange(`/stage/${stage}`) },
    { label: "Specifics" },
  ];

  if (!valid) {
    return (
      <Shell crumbs={crumbs}>
        <ErrorPanel error={new Error(`No such stage: ${stage}`)} />
      </Shell>
    );
  }
  if (query.isPending) {
    return (
      <Shell crumbs={crumbs}>
        <LoadingPanel label="Opening the evidence" />
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

  return (
    <Shell crumbs={crumbs} range={data.range}>
      <div className="flex flex-col gap-4">
        {focusKey && (
          <div className="rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-surface-1)] px-4 py-2.5 text-[12px] text-[var(--color-ink-2)]">
            <span className="font-medium text-[var(--color-ink)]">Opened from an alert.</span>{" "}
            The window below is pre-selected and the related events are highlighted.
          </div>
        )}

        <PanelTabs panel={panel} onChange={setPanel} stage={stage} />

        {panel === "hours" && <HourPanel rows={data.hour_rows} />}
        {panel === "causes" && (
          <CausesPanel
            data={data}
            reasonCode={reasonCode}
            onSelectReason={setReasonCode}
            highlightFrom={searchParams.get("at")}
          />
        )}
        {panel === "parameters" && (
          <ParametersPanel data={data} stage={stage} focusMachine={focusMachine} />
        )}

        <ExtrasPanel data={data} stage={stage} />
      </div>
    </Shell>
  );
}

function PanelTabs({
  panel,
  onChange,
  stage,
}: {
  panel: Panel;
  onChange: (panel: Panel) => void;
  stage: Stage;
}) {
  const tabs: { key: Panel; label: string; hint: string }[] = [
    { key: "hours", label: "Hour by hour", hint: "where the time went" },
    { key: "causes", label: "Causes", hint: "what to fix first" },
    {
      key: "parameters",
      label: stage === "bundling" ? "Workers & audits" : "Parameters",
      hint: stage === "bundling" ? "labour and count accuracy" : "early warning",
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="Investigation panels"
      className="flex flex-wrap items-center gap-1 rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-1)] p-1"
    >
      {tabs.map((tab) => {
        const selected = tab.key === panel;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.key)}
            className={[
              "rounded-full px-3.5 py-1.5 text-[12px] transition",
              selected
                ? "bg-[var(--color-surface-3)] font-medium text-[var(--color-ink)]"
                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-2)]",
            ].join(" ")}
          >
            {tab.label}
            <span className="ml-1.5 text-[10px] text-[var(--color-ink-muted)]">{tab.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The hour-by-hour panel: every hour of the shift as a row, with output, a
 * state timeline, and the events that occurred. The factual record of where the
 * time went. In Week/Month/Custom the rows become days.
 */
function HourPanel({ rows }: { rows: HourRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!rows.length) {
    return (
      <div className="panel p-6 text-[12px] text-[var(--color-ink-muted)]">
        No time logged for this stage in the selected period.
      </div>
    );
  }

  const maxOutput = Math.max(...rows.map((row) => row.output)) || 1;

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 border-b border-[var(--color-hairline)] px-4 py-3">
        <h2 className="text-[13px] font-semibold text-[var(--color-ink)]">
          Hour by hour
          <span className="ml-2 text-[11px] font-normal text-[var(--color-ink-muted)]">
            every minute classified
          </span>
        </h2>
        <ul className="flex flex-wrap gap-x-3">
          {TIME_CATEGORIES.map((category) => (
            <li
              key={category}
              className="flex items-center gap-1 text-[10px] text-[var(--color-ink-muted)]"
            >
              <span
                aria-hidden
                className="h-2 w-2 rounded-[2px]"
                style={{ backgroundColor: TIME_CATEGORY_META[category].color }}
              />
              {TIME_CATEGORY_META[category].label}
            </li>
          ))}
        </ul>
      </div>

      <ul className="divide-y divide-[var(--color-hairline)]">
        {rows.map((row) => {
          const open = expanded === row.bucket;
          return (
            <li key={`${row.date}-${row.bucket}`}>
              <button
                type="button"
                onClick={() => setExpanded(open ? null : row.bucket)}
                className="flex w-full items-center gap-4 px-4 py-2.5 text-left transition hover:bg-[var(--color-surface-2)]"
              >
                <span className="tnum w-14 shrink-0 text-[12px] font-medium text-[var(--color-ink)]">
                  {row.bucket}
                </span>

                <span className="tnum w-28 shrink-0 text-[12px] text-[var(--color-ink-2)]">
                  {formatNumber(row.output, 0)}{" "}
                  <span className="text-[var(--color-ink-muted)]">{row.output_unit}</span>
                </span>

                {/* A bar for magnitude, then the state timeline for the same hour. */}
                <span className="hidden h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-[var(--color-surface-3)] sm:block">
                  <span
                    className="block h-full rounded-full bg-[var(--color-series-1)]"
                    style={{ width: `${(row.output / maxOutput) * 100}%` }}
                  />
                </span>

                <span className="flex h-4 min-w-0 flex-1 gap-[2px] overflow-hidden rounded-[3px]">
                  {row.segments.map((segment) => (
                    <span
                      key={segment.category}
                      title={`${TIME_CATEGORY_META[segment.category].label}: ${formatMinutes(segment.minutes)}`}
                      style={{
                        width: `${segment.share_pct}%`,
                        backgroundColor: TIME_CATEGORY_META[segment.category].color,
                      }}
                    />
                  ))}
                </span>

                <span className="w-28 shrink-0 text-right text-[11px] text-[var(--color-ink-muted)]">
                  {row.events.length ? (
                    <>
                      {row.events.length} event{row.events.length === 1 ? "" : "s"}
                      {open ? " ▴" : " ▾"}
                    </>
                  ) : row.hour == null ? (
                    // Day rows aggregate several shifts and carry no event list
                    // of their own, so calling them "clean" would be a claim the
                    // data does not support.
                    <span title="Open the Causes panel for this day's events">see causes</span>
                  ) : (
                    "clean"
                  )}
                </span>
              </button>

              {open && row.events.length > 0 && (
                <div className="bg-[var(--color-surface-2)] px-4 py-2">
                  <EventList events={row.events} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * The causes panel: the Pareto is the summary, the log is the evidence. Every
 * bar expands into its underlying events.
 */
function CausesPanel({
  data,
  reasonCode,
  onSelectReason,
  highlightFrom,
}: {
  data: Specifics;
  reasonCode: string | null;
  onSelectReason: (code: string | null) => void;
  highlightFrom: string | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.2fr]">
      <div className="flex flex-col gap-4">
        <Pareto
          bars={data.causes.downtime_pareto}
          selectedCode={reasonCode}
          onSelect={(bar) => onSelectReason(reasonCode === bar.code ? null : bar.code)}
        />
        <Pareto
          bars={data.causes.defect_pareto}
          title="Reject causes"
          question="What is being thrown away, and why?"
          unit="quantity"
        />
      </div>

      <section className="panel flex flex-col overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--color-hairline)] px-4 py-3">
          <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">
            Event log
            <span className="ml-2 text-[11px] font-normal text-[var(--color-ink-muted)]">
              the evidence under the bars
            </span>
          </h3>
          {reasonCode && (
            <button
              type="button"
              onClick={() => onSelectReason(null)}
              className="rounded-full border border-[var(--color-hairline-strong)] px-2.5 py-0.5 text-[11px] text-[var(--color-ink-2)] transition hover:bg-[var(--color-surface-2)]"
            >
              filtered to {reasonCode} · clear
            </button>
          )}
        </div>
        <div className="max-h-[560px] overflow-y-auto px-4 py-2">
          <EventList events={data.causes.events} highlightFrom={highlightFrom} />
        </div>
      </section>
    </div>
  );
}

/**
 * The parameters panel: the early-warning layer as value-in-band strips.
 * Bundling has no parameters, so its panel is replaced by the worker and audit
 * log.
 */
function ParametersPanel({
  data,
  stage,
  focusMachine,
}: {
  data: Specifics;
  stage: Stage;
  focusMachine: string | null;
}) {
  const inkChecks = data.extras.ink_checks;

  if (stage === "bundling") {
    return (
      <div className="panel p-6 text-[12px] text-[var(--color-ink-muted)]">
        Bundling has no operating parameters. Its labour and count-audit record is
        below.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {inkChecks && inkChecks.overdue.length > 0 && (
        <div className="rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-surface-1)] px-4 py-2.5 text-[12px]">
          <span className="font-medium text-[var(--color-warning)]">Ink checks overdue: </span>
          <span className="text-[var(--color-ink-2)]">
            {inkChecks.overdue
              .map((row) => `${row.machine_code} (${row.hours_since}h since last)`)
              .join(", ")}
          </span>
          {/* A check nobody took is itself the finding. */}
        </div>
      )}

      {data.parameters.length === 0 ? (
        <div className="panel p-6 text-[12px] text-[var(--color-ink-muted)]">
          No parameter readings in the last few hours.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.parameters.map((strip) => (
            <BandStrip
              key={`${strip.machine_id}-${strip.metric_code}`}
              strip={strip}
              highlighted={
                focusMachine != null && String(strip.machine_id) === focusMachine
              }
            />
          ))}
        </div>
      )}

      {inkChecks && inkChecks.checks.length > 0 && <InkCheckLog checks={inkChecks.checks} />}
    </div>
  );
}

/** The raw readings the ink-check band strips above are summarising - Ford
 *  cup viscosity and pH, logged by hand every couple of hours. The strip
 *  says "in band, steady"; this is the log that backs that claim up. */
function InkCheckLog({
  checks,
}: {
  checks: NonNullable<Specifics["extras"]["ink_checks"]>["checks"];
}) {
  const rows = [...checks].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime(),
  );
  return (
    <ChartFrame
      title="Ink check log"
      question="What did the last few checks actually read?"
      height="auto"
    >
      <div className="max-h-[280px] overflow-auto">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 bg-[var(--color-surface-1)]">
            <tr className="text-left text-[var(--color-ink-muted)]">
              <th className="py-1 pr-3 font-normal">Time</th>
              <th className="py-1 pr-3 font-normal">Machine</th>
              <th className="py-1 pr-3 font-normal">Reading</th>
              <th className="py-1 pr-3 font-normal">Value</th>
              <th className="py-1 pr-3 font-normal">Source</th>
            </tr>
          </thead>
          <tbody className="tnum">
            {rows.map((check, i) => (
              <tr
                key={`${check.machine_code}-${check.metric_code}-${check.recorded_at}-${i}`}
                className="border-t border-[var(--color-hairline)] text-[var(--color-ink-2)]"
              >
                <td className="py-1.5 pr-3">{formatClock(check.recorded_at)}</td>
                <td className="py-1.5 pr-3 text-[var(--color-ink)]">{check.machine_code}</td>
                <td className="py-1.5 pr-3">{check.label}</td>
                <td className="py-1.5 pr-3 font-medium text-[var(--color-ink)]">
                  {formatNumber(check.value, 2)} {check.unit}
                </td>
                <td className="py-1.5 pr-3 text-[var(--color-ink-muted)]">{check.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartFrame>
  );
}

/** A run's rate against the standard set for that job, as a figure and a bar -
 *  the bar makes a column of rates scannable without reading every number. */
function RateVsStandard({ pct }: { pct: number }) {
  const color =
    pct >= 90
      ? "var(--color-good)"
      : pct >= 75
        ? "var(--color-warning)"
        : "var(--color-critical)";
  return (
    <span className="inline-flex items-center gap-1.5" title={`${pct}% of the standard for this job`}>
      <span style={{ color }}>{pct}%</span>
      <span className="relative inline-block h-1.5 w-[52px] shrink-0 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${Math.min(100, Math.max(pct, 0))}%`, background: color }}
        />
      </span>
    </span>
  );
}

/** Per-stage detail that belongs nowhere else: run logs, setup logs, staged
 *  orders, and the starvation events linked to their upstream cause. */
function ExtrasPanel({ data, stage }: { data: Specifics; stage: Stage }) {
  const runLog = data.extras.run_log ?? [];
  const setupLog = data.extras.setup_log ?? [];
  const staged = data.extras.staged_orders ?? [];
  const workers = data.extras.worker_log ?? [];
  const starvation = data.extras.starvation_events ?? [];

  const columns = useMemo(() => {
    if (stage === "bundling") return null;
    return stage === "board_manufacturing"
      ? ["Order", "Running", "Metres", "Speed vs budget", "Waste"]
      : ["Order", "Running", "Sheets", "Rate vs standard", "Rejects"];
  }, [stage]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {columns && (
        <ChartFrame
          title="Per-order run log"
          question="What did each job actually do?"
          height={Math.min(runLog.length * 34 + 40, 320)}
        >
          {runLog.length === 0 ? (
            <p className="text-[12px] text-[var(--color-ink-muted)]">No runs in this period.</p>
          ) : (
            <div className="h-full overflow-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-[var(--color-surface-1)]">
                  <tr className="text-left text-[var(--color-ink-muted)]">
                    {columns.map((column) => (
                      <th key={column} className="py-1 pr-3 font-normal">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="tnum">
                  {runLog.map((run) => (
                    <tr
                      key={run.machine_run_id}
                      className="border-t border-[var(--color-hairline)] text-[var(--color-ink-2)]"
                    >
                      <td className="py-1.5 pr-3 text-[var(--color-ink)]">
                        {run.order_number ?? "--"}
                        <span className="ml-1 text-[var(--color-ink-muted)]">
                          {run.machine_code}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3">{formatMinutes(run.running_minutes)}</td>
                      <td className="py-1.5 pr-3">
                        {stage === "board_manufacturing"
                          ? formatNumber(run.lineal_metres, 0)
                          : formatNumber((run.good_qty ?? 0) + (run.reject_qty ?? 0), 0)}
                      </td>
                      <td className="py-1.5 pr-3">
                        {run.rate_vs_standard_pct != null ? (
                          <RateVsStandard pct={run.rate_vs_standard_pct} />
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="py-1.5 pr-3">
                        {stage === "board_manufacturing"
                          ? run.waste_kg != null
                            ? `${formatNumber(run.waste_kg, 0)} kg`
                            : "--"
                          : formatNumber(run.reject_qty, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartFrame>
      )}

      {stage === "printing" && (
        <ChartFrame
          title="Setup log"
          question="Where did the changeover time go?"
          height={Math.min(setupLog.length * 30 + 40, 320)}
        >
          {setupLog.length === 0 ? (
            <p className="text-[12px] text-[var(--color-ink-muted)]">
              No changeovers in this period.
            </p>
          ) : (
            <ul className="h-full space-y-1.5 overflow-auto">
              {setupLog.map((entry) => (
                <li
                  key={entry.time_log_id}
                  className="flex items-baseline gap-2 text-[11px] text-[var(--color-ink-2)]"
                >
                  <span className="tnum text-[var(--color-ink-muted)]">
                    {formatClock(entry.start_time)}
                  </span>
                  <span className="text-[var(--color-ink-muted)]">{entry.machine_code}</span>
                  <span>
                    {entry.job_from ?? "—"} → {entry.job_to ?? "—"}
                  </span>
                  <span className="tnum ml-auto font-medium text-[var(--color-ink)]">
                    {formatMinutes(entry.duration_minutes)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ChartFrame>
      )}

      {stage === "bundling" && (
        <>
          <ChartFrame
            title="Orders staged"
            question="Did we meet the commitment?"
            height={Math.min(staged.length * 30 + 40, 320)}
          >
            {staged.length === 0 ? (
              <p className="text-[12px] text-[var(--color-ink-muted)]">
                No orders staged in this period.
              </p>
            ) : (
              <ul className="h-full space-y-1.5 overflow-auto">
                {staged.map((order) => (
                  <li
                    key={order.order_id}
                    className="flex items-baseline gap-2 text-[11px] text-[var(--color-ink-2)]"
                  >
                    <span className="font-medium text-[var(--color-ink)]">
                      {order.order_number}
                    </span>
                    <span className="truncate text-[var(--color-ink-muted)]">
                      {order.customer_name}
                    </span>
                    <span className="tnum ml-auto">{formatClock(order.staged_at)}</span>
                    <span
                      style={{
                        color: order.on_time ? "var(--color-good)" : "var(--color-critical)",
                      }}
                    >
                      {order.on_time == null ? "—" : order.on_time ? "✓ on time" : "▲ late"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ChartFrame>

          <ChartFrame
            title="Starvation, and who caused it"
            question="Why was bundling waiting?"
            height={Math.min(Math.max(starvation.length, workers.length) * 34 + 40, 320)}
          >
            {starvation.length === 0 ? (
              <div className="h-full overflow-auto">
                <p className="mb-2 text-[12px] text-[var(--color-ink-muted)]">
                  No starvation in this period. Labour record:
                </p>
                <ul className="space-y-1 text-[11px] text-[var(--color-ink-2)]">
                  {workers.map((row) => (
                    <li key={row.machine_run_id} className="tnum flex gap-2">
                      <span className="text-[var(--color-ink-muted)]">
                        {row.shift_date} S{row.shift_number}
                      </span>
                      <span>{row.worker_count} workers</span>
                      <span>{formatNumber(row.bundles_count, 0)} bundles</span>
                      <span className="ml-auto">
                        {row.output_per_worker != null
                          ? `${formatNumber(row.output_per_worker, 0)} kg/worker`
                          : "--"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <ul className="h-full space-y-2 overflow-auto">
                {starvation.map((event) => (
                  <li key={event.time_log_id} className="text-[11px]">
                    <div className="flex items-baseline gap-2">
                      <span className="tnum text-[var(--color-ink-muted)]">
                        {formatClock(event.start_time)}
                      </span>
                      <span className="text-[var(--color-ink-2)]">
                        waited {formatMinutes(event.duration_minutes)}
                      </span>
                    </div>
                    {event.caused_by && (
                      <div className="ml-4 border-l border-[var(--color-hairline)] pl-2 text-[var(--color-ink-muted)]">
                        ↳ {event.caused_by.machine_code}{" "}
                        {event.caused_by.reason ?? event.caused_by.category} for{" "}
                        {formatMinutes(event.caused_by.duration_minutes)}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </ChartFrame>
        </>
      )}
    </div>
  );
}
