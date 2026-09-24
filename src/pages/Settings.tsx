import type { ReactNode } from "react";

import {
  useDowntimeReasonCodeRecords,
  useMachineRecords,
  useMetricDefinitionRecords,
  usePlantMetricTargetRecords,
  usePlantRecord,
  useShiftReconciliation,
  type DowntimeReasonCodeRecord,
  type MachineRecord,
} from "@/api/settings";
import { ErrorPanel, LoadingPanel, Shell } from "@/components/Shell";
import {
  Bundler,
  Corrugator,
  FlexoPrinter,
  STATION_W,
} from "@/components/machines/MachineArt";
import { MassBalanceBar } from "@/components/settings/MassBalanceBar";
import { BandLegend, TargetBandTrack } from "@/components/settings/TargetBandTrack";
import { formatMetric, formatNumber } from "@/lib/format";
import { STAGE_LABEL, STAGES, TIME_CATEGORY_META } from "@/lib/viz";
import type { Stage } from "@/api/types";

/**
 * Settings and Review - the configuration every number on the other screens is
 * judged against, plus the reconciliation that keeps those numbers honest.
 *
 * Everything here used to be a table, which is the wrong form for most of it.
 * A target is a band, so it is drawn as one; a mass balance is an equation, so
 * it is drawn as a bar that splits; a machine list is a line of machines, so it
 * uses the same schematic art as the live process flow. Only the flat reference
 * data - reason codes, cadences - stays as text, because that is genuinely what
 * it is.
 */
export function Settings() {
  const plant = usePlantRecord();
  const machines = useMachineRecords();
  const metricDefinitions = useMetricDefinitionRecords();
  const targets = usePlantMetricTargetRecords();
  const downtimeCodes = useDowntimeReasonCodeRecords();
  const recon = useShiftReconciliation(5);

  const crumbs = [{ label: "Settings and Review" }];
  const anyPending =
    plant.isPending || machines.isPending || metricDefinitions.isPending || targets.isPending;

  if (anyPending) {
    return (
      <Shell crumbs={crumbs}>
        <LoadingPanel label="Reading plant configuration" />
      </Shell>
    );
  }
  if (plant.isError) {
    return (
      <Shell crumbs={crumbs}>
        <ErrorPanel error={plant.error} />
      </Shell>
    );
  }

  const metricById = new Map((metricDefinitions.data ?? []).map((metric) => [metric.id, metric]));

  // Split on what the row actually configures, not on the catalog category.
  // A two-sided low/high band is a control band; a target with a red line is a
  // KPI. Splitting on category instead put power per tonne - a headline card on
  // the Overview screen - into the parameters list, where it showed a dash.
  const hasControlBand = (target: { band_low: number | null; band_high: number | null }) =>
    target.band_low != null && target.band_high != null;
  const kpiTargets = (targets.data ?? []).filter((target) => !hasControlBand(target));
  const parameterTargets = (targets.data ?? []).filter(hasControlBand);

  const machineList = machines.data ?? [];
  const reconRows = recon.data ?? [];
  const maxPaperIn = Math.max(0, ...reconRows.map((row) => row.paperInKg));

  return (
    <Shell crumbs={crumbs}>
      <div className="flex flex-col gap-3">
        {plant.data && <PlantHeader plant={plant.data} machines={machineList} />}

        <Section
          title="The line"
          hint="Every machine configured for this plant, in process order. Rated speed is the machine's own capability; the job standard each run is judged against lives on the order."
        >
          {machines.isError ? (
            <ErrorPanel error={machines.error} />
          ) : (
            <div className="flex flex-col gap-4">
              {STAGES.map((stage) => {
                const stageMachines = machineList.filter((machine) => machine.stage === stage);
                if (!stageMachines.length) return null;
                return (
                  <div key={stage} className="flex flex-col gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-ink-muted)]">
                      {STAGE_LABEL[stage]}
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {stageMachines.map((machine) => (
                        <MachineCard key={machine.id} machine={machine} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section
          title="Targets and RAG bands"
          hint="Set from the plant's own baseline at onboarding, reviewed quarterly - never imported industry figures. Moisture, warp and yield carry a wider band through the monsoon months."
          aside={<BandLegend />}
        >
          {targets.isError ? (
            <ErrorPanel error={targets.error} />
          ) : (
            <div className="grid grid-cols-1 gap-x-8 gap-y-1 xl:grid-cols-2">
              {kpiTargets.map((target) => {
                const metric = metricById.get(target.metric_definition_id);
                if (!metric) return null;
                const isMoney = (metric.unit ?? "").toUpperCase() === "INR";
                const formatBare = (value: number) =>
                  isMoney ? formatMetric(value, "INR") : formatNumber(value, 1);
                const format = (value: number) =>
                  isMoney ? formatMetric(value, "INR") : `${formatNumber(value, 1)} ${metric.unit}`;
                return (
                  <div
                    key={target.id}
                    className="flex items-center justify-between gap-5 border-b border-[var(--color-hairline)] py-2 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold text-[var(--color-ink)]">
                        {metric.name}
                      </span>
                      {metric.stage && (
                        <span className="text-[10.5px] text-[var(--color-ink-muted)]">
                          {STAGE_LABEL[metric.stage]}
                        </span>
                      )}
                    </div>
                    <TargetBandTrack
                      target={target.target_value}
                      redLine={target.red_line_value}
                      lowerIsBetter={metric.lower_is_better}
                      format={format}
                      formatBare={formatBare}
                      monsoon={
                        target.monsoon_band_low != null && target.monsoon_band_high != null
                          ? { low: target.monsoon_band_low, high: target.monsoon_band_high }
                          : null
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Section
            title="Shift reconciliation review"
            hint="Paper in = board out + weighed waste, within the moisture allowance. Figures turn solid only once this closes; the gap itself is the data-quality metric."
          >
            {recon.isPending ? (
              <p className="text-[12px] text-[var(--color-ink-muted)]">Reading recent shifts…</p>
            ) : recon.isError ? (
              <ErrorPanel error={recon.error} />
            ) : reconRows.length === 0 ? (
              <p className="text-[12px] text-[var(--color-ink-muted)]">No shifts recorded yet.</p>
            ) : (
              <div className="divide-y divide-[var(--color-hairline)]">
                {reconRows.map((row) => (
                  <MassBalanceBar key={row.shiftId} row={row} maxPaperInKg={maxPaperIn} />
                ))}
              </div>
            )}
          </Section>

          <div className="flex flex-col gap-3">
            <Section
              title="Operating parameter bands"
              hint="Two-sided control bands, not targets: these predict the next period's quality rather than measuring this one."
            >
              {parameterTargets.length === 0 ? (
                <p className="text-[12px] text-[var(--color-ink-muted)]">
                  No parameter bands configured.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {parameterTargets.map((target) => {
                    const metric = metricById.get(target.metric_definition_id);
                    if (!metric) return null;
                    const monsoon =
                      target.monsoon_band_low != null && target.monsoon_band_high != null;
                    return (
                      <li
                        key={target.id}
                        className="flex items-baseline justify-between gap-3 text-[12px]"
                      >
                        <span className="min-w-0 truncate font-semibold text-[var(--color-ink)]">
                          {metric.name}
                        </span>
                        <span className="tnum shrink-0 text-[var(--color-ink-2)]">
                          {formatNumber(target.band_low!, 1)}–
                          {formatNumber(target.band_high!, 1)} {metric.unit}
                          {monsoon && (
                            <span
                              className="ml-2 rounded px-1.5 py-[1px] text-[10px]"
                              style={{
                                backgroundColor: "var(--color-kraft-soft)",
                                color: "var(--color-kraft)",
                              }}
                            >
                              monsoon {formatNumber(target.monsoon_band_low!, 1)}–
                              {formatNumber(target.monsoon_band_high!, 1)}
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            <Section
              title="Data and refresh"
              hint="Deliberately unhurried. Numbers that flicker erode trust without adding information."
            >
              <CadenceList />
            </Section>
          </div>
        </div>

        <Section
          title="Downtime reason codes"
          hint="One owner per code, planned never mixed with unplanned. If Unclassified passes 5% of a week's minutes, this taxonomy gets reviewed."
        >
          {downtimeCodes.isError ? (
            <ErrorPanel error={downtimeCodes.error} />
          ) : (
            <ReasonCodeGroups codes={downtimeCodes.data ?? []} />
          )}
        </Section>
      </div>
    </Shell>
  );
}

/** The plant, its line type, and what that line is made of - the one place
 *  the whole configuration is summarised before the detail starts. */
function PlantHeader({
  plant,
  machines,
}: {
  plant: { name: string; location: string | null; line_type: string };
  machines: MachineRecord[];
}) {
  const active = machines.filter((machine) => machine.is_active).length;
  const perStage = STAGES.map((stage) => ({
    stage,
    count: machines.filter((machine) => machine.stage === stage).length,
  }));

  return (
    <section className="panel flex flex-wrap items-center justify-between gap-5 p-[15px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[17px] font-bold text-[var(--color-ink)]">{plant.name}</h2>
          <span
            className="rounded-full px-2 py-[2px] text-[10.5px] font-semibold"
            style={{
              backgroundColor: "var(--color-series-1-soft)",
              color: "var(--color-series-1)",
            }}
          >
            {plant.line_type === "automatic" ? "Automatic line" : "Semi-automatic line"}
          </span>
        </div>
        <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-2)]">
          {plant.location ?? "Location not set"} · {active} of {machines.length} machines active
        </p>
      </div>

      <div className="flex items-center gap-5">
        {perStage.map(({ stage, count }) => (
          <div key={stage} className="flex flex-col items-center gap-1">
            <svg viewBox={`0 0 ${STATION_W} 104`} width="54" height="34" aria-hidden>
              <StageArt stage={stage} />
            </svg>
            <span className="tnum text-[11px] font-semibold text-[var(--color-ink)]">
              {count} {count === 1 ? "machine" : "machines"}
            </span>
            <span className="text-[10px] text-[var(--color-ink-muted)]">{STAGE_LABEL[stage]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function StageArt({ stage }: { stage: Stage }) {
  const props = { running: false, accent: "var(--color-ink-muted)" };
  if (stage === "board_manufacturing") return <Corrugator {...props} />;
  if (stage === "printing") return <FlexoPrinter {...props} />;
  return <Bundler {...props} />;
}

/** A machine, shown as the machine it is rather than as a table row. */
function MachineCard({ machine }: { machine: MachineRecord }) {
  return (
    <div
      className="flex min-w-[218px] flex-1 items-center gap-3 rounded-[10px] border p-2.5"
      style={{
        borderColor: "var(--color-hairline)",
        backgroundColor: "var(--color-surface-2)",
        opacity: machine.is_active ? 1 : 0.55,
      }}
    >
      <svg
        viewBox={`0 0 ${STATION_W} 104`}
        width="66"
        height="41"
        aria-hidden
        className="shrink-0"
      >
        <StageArt stage={machine.stage} />
      </svg>
      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[12.5px] font-bold text-[var(--color-ink)]">
            {machine.machine_code}
          </span>
          {!machine.is_active && (
            <span className="rounded bg-[var(--color-surface-3)] px-1.5 text-[9.5px] text-[var(--color-ink-muted)]">
              inactive
            </span>
          )}
        </div>
        <span className="truncate text-[11px] text-[var(--color-ink-2)]">{machine.name}</span>
        <span className="tnum text-[11px] text-[var(--color-ink-muted)]">
          {machine.rated_speed != null
            ? `rated ${formatNumber(machine.rated_speed, 0)} ${machine.rated_speed_unit ?? ""}`
            : "no rated speed"}
        </span>
      </div>
    </div>
  );
}

/**
 * Reason codes grouped by the time category they classify, planned kept
 * visually apart from unplanned - the same separation the picker enforces when
 * an operator classifies a stop, so the catalog reads the way it is used.
 */
function ReasonCodeGroups({ codes }: { codes: DowntimeReasonCodeRecord[] }) {
  if (!codes.length) {
    return <p className="text-[12px] text-[var(--color-ink-muted)]">Nothing configured yet.</p>;
  }

  const order = ["setup", "breakdown", "waiting", "idle"];
  const grouped = order
    .map((category) => ({
      category,
      meta: TIME_CATEGORY_META[category as keyof typeof TIME_CATEGORY_META],
      codes: codes.filter((code) => code.category === category),
    }))
    .filter((group) => group.codes.length);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {grouped.map((group) => (
        <div key={group.category} className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: group.meta.color }}
            />
            <span className="text-[12px] font-bold text-[var(--color-ink)]">
              {group.meta.label}
            </span>
            {group.meta.planned && (
              <span className="rounded bg-[var(--color-surface-3)] px-1.5 text-[9.5px] font-semibold text-[var(--color-ink-muted)]">
                planned
              </span>
            )}
          </div>
          <ul className="flex flex-col gap-1.5">
            {group.codes.map((code) => (
              <li
                key={code.id}
                className="rounded-[8px] border-l-[3px] bg-[var(--color-surface-3)] px-2.5 py-1.5"
                style={{ borderLeftColor: group.meta.color }}
              >
                <span className="block text-[11.5px] font-semibold text-[var(--color-ink)]">
                  {code.description}
                </span>
                <span className="block text-[10px] text-[var(--color-ink-muted)]">{code.code}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Refresh cadences as a relative scale, so "every 2-3 minutes" and "at shift
 *  close" sit on one axis instead of reading as two unrelated facts. */
function CadenceList() {
  const rows: { label: string; detail: string; weight: number; tone: string }[] = [
    {
      label: "Status and machine tiles",
      detail: "every 2–3 min",
      weight: 14,
      tone: "var(--color-good)",
    },
    {
      label: "Cards, charts, alerts",
      detail: "every 10–15 min",
      weight: 42,
      tone: "var(--color-series-1)",
    },
    {
      label: "Drift escalates to Overview",
      detail: "after 60 min unacknowledged",
      weight: 72,
      tone: "var(--color-warning)",
    },
    {
      label: "Reconciliation",
      detail: "at shift close",
      weight: 100,
      tone: "var(--color-ink-muted)",
    },
  ];

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li key={row.label} className="flex items-center gap-3">
          <span className="w-[150px] shrink-0 text-[11.5px] text-[var(--color-ink-2)]">
            {row.label}
          </span>
          <span className="h-[6px] flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
            <span
              className="block h-full rounded-full"
              style={{ width: `${row.weight}%`, backgroundColor: row.tone, opacity: 0.55 }}
            />
          </span>
          <span className="tnum w-[128px] shrink-0 text-right text-[11px] font-semibold text-[var(--color-ink)]">
            {row.detail}
          </span>
        </li>
      ))}
      <li className="mt-0.5 text-[10.5px] text-[var(--color-ink-muted)]">
        Monsoon bands active Jun–Sep.
      </li>
    </ul>
  );
}

function Section({
  title,
  hint,
  aside,
  children,
}: {
  title: string;
  hint?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-hairline)] px-[15px] py-[13px]">
        <div className="min-w-0 max-w-[62ch]">
          <h2 className="text-[15px] font-bold text-[var(--color-ink)]">{title}</h2>
          {hint && <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-muted)]">{hint}</p>}
        </div>
        {aside}
      </div>
      <div className="p-[15px]">{children}</div>
    </section>
  );
}
