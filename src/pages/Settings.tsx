import type { ReactNode } from "react";

import {
  useDowntimeReasonCodeRecords,
  useMachineRecords,
  useMetricDefinitionRecords,
  usePlantMetricTargetRecords,
  usePlantRecord,
  useShiftReconciliation,
} from "@/api/settings";
import { ErrorPanel, LoadingPanel, Shell } from "@/components/Shell";
import { formatMetric, formatNumber } from "@/lib/format";
import { STAGE_LABEL } from "@/lib/viz";

/**
 * Settings and Review - targets, reason codes, and the shift reconciliation
 * that keeps every number honest. Matched panel-for-panel to the reference:
 * targets/RAG bands, reconciliation, downtime reason codes, and the refresh
 * cadence. Editable by the plant head role; read-only here.
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
  // The reference's targets table covers KPIs, not raw operating parameters -
  // those get their own band strips in Machine Monitoring.
  const kpiTargets = (targets.data ?? []).filter(
    (target) => metricById.get(target.metric_definition_id)?.category !== "parameters",
  );

  return (
    <Shell crumbs={crumbs}>
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-[var(--color-ink-2)]">
          Targets, reason codes, and the shift reconciliation that keeps every number honest.
          Read-only for now — changing a target, a band, or a reason code means editing it through
          the API directly.
        </p>

        <Section title="Plant">
          {plant.data && (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-3">
              <Field label="Name" value={plant.data.name} />
              <Field label="Location" value={plant.data.location ?? "--"} />
              <Field
                label="Line type"
                value={plant.data.line_type === "automatic" ? "Automatic" : "Semi-automatic"}
              />
            </dl>
          )}
        </Section>

        <Section title="Machines">
          {machines.isError ? (
            <ErrorPanel error={machines.error} />
          ) : (
            <Table
              columns={["Code", "Name", "Stage", "Rated speed", "Status"]}
              rows={(machines.data ?? []).map((machine) => [
                machine.machine_code,
                machine.name,
                STAGE_LABEL[machine.stage],
                machine.rated_speed != null
                  ? `${formatNumber(machine.rated_speed, 0)} ${machine.rated_speed_unit ?? ""}`
                  : "--",
                machine.is_active ? "Active" : "Inactive",
              ])}
            />
          )}
        </Section>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Section
            title="Targets and RAG bands"
            hint="Green at or better than target; red beyond the red line; amber between. Set from the plant baseline at onboarding, reviewed quarterly."
          >
            {targets.isError ? (
              <ErrorPanel error={targets.error} />
            ) : (
              <Table
                columns={["KPI", "Target", "Red line", "Seasonal band"]}
                rows={kpiTargets.map((target) => {
                  const metric = metricById.get(target.metric_definition_id);
                  const isMoney = (metric?.unit ?? "").toUpperCase() === "INR";
                  const withUnit = (value: number) =>
                    isMoney ? formatMetric(value, "INR") : `${formatNumber(value, 1)} ${metric?.unit ?? ""}`;
                  const name = metric?.stage
                    ? `${metric.name}, ${STAGE_LABEL[metric.stage].toLowerCase()}`
                    : (metric?.name ?? `#${target.metric_definition_id}`);
                  const seasonal =
                    target.monsoon_band_low != null && target.monsoon_band_high != null
                      ? `${formatNumber(target.monsoon_band_low, 1)}-${formatNumber(target.monsoon_band_high, 1)} Jun-Sep`
                      : "-";
                  return [
                    name,
                    withUnit(target.target_value),
                    target.red_line_value != null ? withUnit(target.red_line_value) : "-",
                    seasonal,
                  ];
                })}
              />
            )}
          </Section>

          <Section
            title="Shift reconciliation review"
            hint="Paper in = board out + weighed waste, within moisture allowance. Figures turn solid only after this closes; the gap itself is a data-quality metric."
          >
            {recon.isPending ? (
              <p className="text-[12px] text-[var(--color-ink-muted)]">Reading recent shifts…</p>
            ) : recon.isError ? (
              <ErrorPanel error={recon.error} />
            ) : (
              <Table
                columns={["Shift", "Paper in", "Board out", "Waste", "Gap", "Status"]}
                rows={(recon.data ?? []).map((row) => [
                  row.label,
                  row.paperInKg ? `${formatNumber(row.paperInKg / 1000, 1)} t` : "-",
                  row.boardOutKg ? `${formatNumber(row.boardOutKg / 1000, 1)} t` : "-",
                  row.paperInKg ? `${formatNumber(row.wasteKg / 1000, 2)} t` : "-",
                  row.gapPct != null ? `${formatNumber(row.gapPct, 1)}%` : "-",
                  row.status === "reconciled" ? "reconciled" : "provisional ~",
                ])}
              />
            )}
          </Section>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Section
            title="Downtime reason codes"
            hint="One owner per code, planned never mixed with unplanned. If Unclassified passes 5% of minutes in a week, this table gets reviewed."
          >
            {downtimeCodes.isError ? (
              <ErrorPanel error={downtimeCodes.error} />
            ) : (
              <Table
                columns={["Code", "Description", "Category"]}
                rows={(downtimeCodes.data ?? []).map((code) => [
                  code.code,
                  code.description,
                  code.category,
                ])}
              />
            )}
          </Section>

          <Section title="Data and refresh">
            <Table
              columns={["", ""]}
              rows={[
                ["Status and machine tiles", "every 2-3 min"],
                ["Cards, charts, alerts", "every 10-15 min"],
                ["Reconciliation", "at shift close"],
                ["Drift escalation to Overview", "after 60 min unacknowledged"],
                ["Monsoon bands active", "Jun-Sep"],
              ]}
              hideHead
            />
          </Section>
        </div>
      </div>
    </Shell>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="panel flex flex-col overflow-hidden">
      <div className="border-b border-[var(--color-hairline)] px-[15px] py-[13px]">
        <h2 className="text-[15px] font-bold text-[var(--color-ink)]">{title}</h2>
        {hint && <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-muted)]">{hint}</p>}
      </div>
      <div className="p-[15px]">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-[var(--color-ink-muted)]">{label}</dt>
      <dd className="truncate text-[var(--color-ink)]">{value}</dd>
    </div>
  );
}

function Table({
  columns,
  rows,
  hideHead = false,
}: {
  columns: string[];
  rows: string[][];
  hideHead?: boolean;
}) {
  if (!rows.length) {
    return <p className="text-[12px] text-[var(--color-ink-muted)]">Nothing configured yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        {!hideHead && (
          <thead>
            <tr className="text-left text-[var(--color-ink-2)]">
              {columns.map((column, i) => (
                <th key={i} className="border-b border-[var(--color-hairline)] py-[5px] pr-4 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-[var(--color-hairline)] last:border-0">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={[
                    "py-[6px] pr-4 align-top",
                    cellIndex === 0 ? "font-semibold text-[var(--color-ink)]" : "text-[var(--color-ink-2)]",
                  ].join(" ")}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
