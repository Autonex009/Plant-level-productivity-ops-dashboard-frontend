import type { PlantTotals } from "@/api/types";
import { ChartFrame, EmptyPlot } from "@/components/charts/ChartFrame";
import { formatInr, formatMinutes, formatNumber } from "@/lib/format";
import { TIME_CATEGORIES, TIME_CATEGORY_META } from "@/lib/viz";

/**
 * How the period decomposes: the material, the minutes, and the power.
 *
 * The rollup cards say how the plant did; the flight path and the waterfall say
 * whether it will make the period and where the potential went. What none of
 * them show is the composition underneath - which is the question an owner asks
 * second, and which the payload already answers without another request.
 *
 * All three read the same `totals` block the cards above are computed from, so
 * they cannot disagree with them, and all three are one-glance bars rather than
 * charts - this is Level 1, where a reader gets five seconds.
 */

/**
 * Where did the paper go?
 *
 * Paper is 60-65% of the cost of a box, so this is the plant's economics in one
 * picture. Each bar is the same width - the paper that came in - with the part
 * that survived drawn in kraft and the part that did not in the loss colour, so
 * the shrinking kraft run is the yield falling stage by stage.
 */
export function MaterialFlowBar({ totals }: { totals: PlantTotals }) {
  const paperIn = totals.paper_consumed_kg;

  if (!paperIn) {
    return (
      <ChartFrame title="Where the paper went" question="Reels in, bundles out" height={168}>
        <EmptyPlot>No material recorded for this period yet.</EmptyPlot>
      </ChartFrame>
    );
  }

  const steps = [
    { label: "Paper in", kg: paperIn, note: "kraft consumed" },
    { label: "Board out", kg: totals.board_output_kg, note: "off the corrugator" },
    { label: "Dispatched", kg: totals.dispatched_kg, note: "counted and staged" },
  ];

  // The waste a plant budgets for, so the reader can see the excess rather than
  // the total - the same distinction the cost-of-waste card makes.
  const plannedPct = (totals.planned_waste_kg / paperIn) * 100;

  return (
    <ChartFrame
      title="Where the paper went"
      question="Reels in, bundles out"
      height="auto"
      note={
        <>
          {formatNumber(totals.waste_kg / 1000, 2)} t did not leave as saleable board.{" "}
          {totals.excess_waste_cost_inr != null && totals.excess_waste_cost_inr > 0 ? (
            <>
              <span className="text-[var(--color-critical)]">
                {formatInr(totals.excess_waste_cost_inr)}
              </span>{" "}
              of that is over the planned allowance.
            </>
          ) : (
            <>Within the planned allowance.</>
          )}
        </>
      }
    >
      <ul className="flex flex-col gap-2.5">
        {steps.map((step) => {
          const kept = Math.max(0, Math.min(100, (step.kg / paperIn) * 100));
          const lost = 100 - kept;
          return (
            <li key={step.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12px] font-semibold text-[var(--color-ink)]">
                  {step.label}
                  <span className="ml-1.5 font-normal text-[var(--color-ink-muted)]">
                    {step.note}
                  </span>
                </span>
                <span className="tnum shrink-0 text-[12px] text-[var(--color-ink-2)]">
                  {formatNumber(step.kg / 1000, 1)} t
                  <span className="ml-1.5 text-[var(--color-ink-muted)]">
                    {formatNumber(kept, 1)}%
                  </span>
                </span>
              </div>
              <div className="relative mt-1 flex h-[11px] overflow-hidden rounded-[4px] bg-[var(--color-surface-3)]">
                <span style={{ width: `${kept}%`, backgroundColor: "var(--color-board)" }} />
                {lost > 0.2 && (
                  <span
                    style={{ width: `${lost}%`, backgroundColor: "var(--color-critical)" }}
                    title={`${formatNumber((paperIn - step.kg) / 1000, 2)} t lost by this point`}
                  />
                )}
                {/* Where the plant expected to be, so an acceptable loss does
                    not read the same as an excessive one. */}
                {plannedPct > 0 && plannedPct < 100 && (
                  <span
                    aria-hidden
                    className="absolute top-0 h-full w-[2px]"
                    style={{
                      left: `${100 - plannedPct}%`,
                      backgroundColor: "var(--color-ink)",
                      opacity: 0.45,
                    }}
                    title={`Planned waste allowance ${formatNumber(plannedPct, 1)}%`}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </ChartFrame>
  );
}

/**
 * Where did the minutes go?
 *
 * The waterfall shows not-running as one block; this is that block opened up.
 * Same five categories, same colours and same order as every time strip further
 * down the dashboard, so the shape is already familiar by the time a reader
 * reaches Level 3.
 */
export function TimeSplitBar({ totals }: { totals: PlantTotals }) {
  const minutes = totals.minutes_by_category ?? {};
  const total = TIME_CATEGORIES.reduce((sum, key) => sum + (minutes[key] ?? 0), 0);

  if (!total) {
    return (
      <ChartFrame title="Where the minutes went" question="Every minute classified" height={168}>
        <EmptyPlot>No time logged for this period yet.</EmptyPlot>
      </ChartFrame>
    );
  }

  const present = TIME_CATEGORIES.filter((key) => (minutes[key] ?? 0) > 0);

  return (
    <ChartFrame
      title="Where the minutes went"
      question="Every minute classified"
      height="auto"
      note={
        <>
          {formatMinutes(totals.running_minutes)} running of{" "}
          {formatMinutes(totals.scheduled_minutes)} rostered on the corrugator, the pacemaker
          that sets the plant&rsquo;s ceiling.
        </>
      }
    >
      <div className="flex h-[26px] w-full gap-[2px] overflow-hidden rounded-[5px]">
        {present.map((key) => {
          const share = ((minutes[key] ?? 0) / total) * 100;
          const meta = TIME_CATEGORY_META[key];
          return (
            <div
              key={key}
              className="flex min-w-0 items-center justify-center first:rounded-l-[5px] last:rounded-r-[5px]"
              style={{ width: `${share}%`, backgroundColor: meta.color }}
              title={`${meta.label}: ${formatMinutes(minutes[key])} (${formatNumber(share, 1)}%)`}
            >
              {/* Two of these five colours are greys by design, so anything wide
                  enough to hold a figure carries one. */}
              {share >= 10 && (
                <span className="tnum truncate px-1 text-[10px] font-semibold text-white mix-blend-luminosity">
                  {formatNumber(share, 0)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Two columns, not three: at three the longest state name - "Setup /
          changeover" - truncates, and a legend that hides the word the colour
          depends on defeats the point of having one. */}
      <ul className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1">
        {present.map((key) => {
          const meta = TIME_CATEGORY_META[key];
          return (
            <li key={key} className="flex items-center gap-1.5 text-[11px]">
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: meta.color }}
              />
              <span className="min-w-0 truncate text-[var(--color-ink-2)]">
                {meta.label}
                {meta.planned && (
                  <span className="ml-1 text-[var(--color-ink-muted)]">planned</span>
                )}
              </span>
              <span className="tnum ml-auto shrink-0 text-[var(--color-ink)]">
                {formatMinutes(minutes[key])}
              </span>
            </li>
          );
        })}
      </ul>
    </ChartFrame>
  );
}

/**
 * Where did the power come from?
 *
 * Power is a top-three cost and genset hours are pure margin leakage, which is
 * why the DG share gets its own mark rather than being folded into one total.
 * The card upstairs carries kWh per tonne; this says what made up those kWh.
 */
export function EnergyMixBar({ totals }: { totals: PlantTotals }) {
  const total = totals.total_kwh;

  if (!total) {
    return (
      <ChartFrame title="Where the power came from" question="Grid against genset" height={168}>
        <EmptyPlot>No energy readings for this period yet.</EmptyPlot>
      </ChartFrame>
    );
  }

  const gridShare = (totals.grid_kwh / total) * 100;
  const dgShare = 100 - gridShare;
  const runningOnDg = dgShare >= 10;

  return (
    <ChartFrame
      title="Where the power came from"
      question="Grid against genset"
      height="auto"
      note={
        runningOnDg ? (
          <>
            The genset carried{" "}
            <span className="text-[var(--color-warning)]">{formatNumber(dgShare, 1)}%</span> of
            this period&rsquo;s load. Diesel hours are the most actionable energy fact of the day.
          </>
        ) : (
          <>Mostly on grid. Diesel hours are the most actionable energy fact of the day.</>
        )
      }
    >
      <div className="flex h-[26px] w-full gap-[2px] overflow-hidden rounded-[5px]">
        <div
          className="flex items-center justify-center rounded-l-[5px]"
          style={{ width: `${gridShare}%`, backgroundColor: "var(--color-series-1)" }}
          title={`Grid ${formatNumber(totals.grid_kwh, 0)} kWh`}
        >
          {gridShare >= 12 && (
            <span className="tnum text-[10px] font-semibold text-white mix-blend-luminosity">
              {formatNumber(gridShare, 0)}%
            </span>
          )}
        </div>
        {dgShare > 0.2 && (
          <div
            className="flex items-center justify-center rounded-r-[5px]"
            style={{ width: `${dgShare}%`, backgroundColor: "var(--color-warning)" }}
            title={`Diesel generator ${formatNumber(totals.dg_kwh, 0)} kWh`}
          >
            {dgShare >= 12 && (
              <span className="tnum text-[10px] font-semibold text-white mix-blend-luminosity">
                {formatNumber(dgShare, 0)}%
              </span>
            )}
          </div>
        )}
      </div>

      <dl className="mt-2.5 grid grid-cols-3 gap-x-3">
        <Figure
          label="Grid"
          value={`${formatNumber(totals.grid_kwh, 0)} kWh`}
          swatch="var(--color-series-1)"
        />
        <Figure
          label="Genset"
          value={`${formatNumber(totals.dg_kwh, 0)} kWh`}
          swatch="var(--color-warning)"
        />
        <Figure
          label="DG hours"
          value={`${formatNumber(totals.dg_hours, 1)} hrs`}
          tone={runningOnDg ? "var(--color-warning)" : undefined}
        />
      </dl>
    </ChartFrame>
  );
}

function Figure({
  label,
  value,
  swatch,
  tone,
}: {
  label: string;
  value: string;
  swatch?: string;
  tone?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[10.5px] text-[var(--color-ink-muted)]">
        {swatch && (
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: swatch }}
          />
        )}
        {label}
      </dt>
      <dd
        className="tnum truncate text-[13px] font-bold"
        style={{ color: tone ?? "var(--color-ink)" }}
      >
        {value}
      </dd>
    </div>
  );
}
