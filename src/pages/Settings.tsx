import type { ReactNode } from "react";

import {
  useDefectReasonCodeRecords,
  useDowntimeReasonCodeRecords,
  useMachineRecords,
  useMetricDefinitionRecords,
  usePlantMetricTargetRecords,
  usePlantRecord,
} from "@/api/settings";
import { ErrorPanel, LoadingPanel, Shell } from "@/components/Shell";
import { formatMetric, formatNumber } from "@/lib/format";
import { STAGE_LABEL } from "@/lib/viz";

/**
 * Settings - what this plant is configured with.
 *
 * Read-only for now: the plant, its machines, the reference performance level
 * set for each metric (target / red line / control band), and the reason-code
 * catalogs that classification and the Review inbox draw from. Editing these
 * is the natural next step; this page exists first so the numbers everywhere
 * else are traceable to a baseline someone can actually see.
 */
export function Settings() {
  const plant = usePlantRecord();
  const machines = useMachineRecords();
  const metricDefinitions = useMetricDefinitionRecords();
  const targets = usePlantMetricTargetRecords();
  const downtimeCodes = useDowntimeReasonCodeRecords();
  const defectCodes = useDefectReasonCodeRecords();

  const crumbs = [{ label: "Settings" }];
  const anyPending =
    plant.isPending ||
    machines.isPending ||
    metricDefinitions.isPending ||
    targets.isPending ||
    downtimeCodes.isPending ||
    defectCodes.isPending;

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

  return (
    <Shell crumbs={crumbs}>
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-surface-1)] px-4 py-2.5 text-[12px] text-[var(--color-ink-2)]">
          Read-only for now. Changing a target, a band, or a reason code means
          editing it through the API directly.
        </div>

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

        <Section title="Metric targets" subtitle="Reference performance level, set per plant baseline">
          {targets.isError ? (
            <ErrorPanel error={targets.error} />
          ) : (
            <Table
              columns={["Metric", "Stage", "Target", "Red line", "Control band", "Effective from"]}
              rows={(targets.data ?? []).map((target) => {
                const metric = metricById.get(target.metric_definition_id);
                const unit = metric?.unit ?? "";
                const isMoney = unit.toUpperCase() === "INR";
                const withUnit = (value: number) =>
                  isMoney ? formatMetric(value, "INR") : `${formatNumber(value, 1)} ${unit}`;
                const hasBand = target.band_low != null && target.band_high != null;
                return [
                  metric?.name ?? `#${target.metric_definition_id}`,
                  metric?.stage ? STAGE_LABEL[metric.stage] : "Plant-wide",
                  withUnit(target.target_value),
                  target.red_line_value != null ? withUnit(target.red_line_value) : "--",
                  hasBand
                    ? `${formatNumber(target.band_low, 1)} - ${formatNumber(target.band_high, 1)}`
                    : "--",
                  target.effective_from,
                ];
              })}
            />
          )}
        </Section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Section title="Downtime reason codes">
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

          <Section title="Defect reason codes">
            {defectCodes.isError ? (
              <ErrorPanel error={defectCodes.error} />
            ) : (
              <Table
                columns={["Code", "Description", "Stage"]}
                rows={(defectCodes.data ?? []).map((code) => [
                  code.code,
                  code.description,
                  STAGE_LABEL[code.stage],
                ])}
              />
            )}
          </Section>
        </div>
      </div>
    </Shell>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="panel flex flex-col overflow-hidden">
      <div className="border-b border-[var(--color-hairline)] px-4 py-3">
        <h2 className="text-[13px] font-semibold text-[var(--color-ink)]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[11px] text-[var(--color-ink-muted)]">{subtitle}</p>}
      </div>
      <div className="p-4">{children}</div>
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

function Table({ columns, rows }: { columns: string[]; rows: string[][] }) {
  if (!rows.length) {
    return <p className="text-[12px] text-[var(--color-ink-muted)]">Nothing configured yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-left text-[var(--color-ink-muted)]">
            {columns.map((column) => (
              <th key={column} className="py-1 pr-4 font-normal">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tnum">
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-[var(--color-hairline)] text-[var(--color-ink-2)]">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={cellIndex === 0 ? "py-1.5 pr-4 text-[var(--color-ink)]" : "py-1.5 pr-4"}
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
