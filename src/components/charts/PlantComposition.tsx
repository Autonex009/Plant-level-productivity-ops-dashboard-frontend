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

const FLOW_W = 620;
const FLOW_H = 232;
const FLOW_TOP = 32;
const NODE_W = 8;
const NODE_X = [16, 210, 410, 604];

function ribbon(x0: number, top: number, bot0: number, x1: number, bot1: number): string {
  const midX = (x0 + x1) / 2;
  return `M${x0},${top} L${x1},${top} L${x1},${bot1} C${midX},${bot1} ${midX},${bot0} ${x0},${bot0} Z`;
}

/** A thin leader line off the flow, ending near its label - the reference's
 *  own style for a loss, and a better one than a filled ribbon: the tonnage
 *  is stated in the label, so the line only needs to point, not to also
 *  try to look proportional. */
function leaderLine(x: number, yMid: number, toX: number, toY: number): string {
  const midX = x + (toX - x) * 0.6;
  return `M${x},${yMid} C${midX},${yMid} ${midX},${toY} ${toX},${toY}`;
}

/**
 * Where did the paper go, drawn as a Sankey - four real weigh-points (paper
 * in, off the corrugator, bundled, dispatched), the flow narrowing between
 * each because material is genuinely leaving it. Red peels off for good;
 * brown is still moving (through printing, or staged but not yet shipped).
 *
 * The reference this is modelled on invents a fifth checkpoint - "printed
 * tonnes" - and splits every loss into named causes (edge trim, splice,
 * warp...) with fixed weights. We don't have a printed-tonnage weigh-point
 * (printing's own output is measured in sheets, not kg) and we don't have a
 * plant-level cause split for what's lost between the corrugator and
 * bundling - that detail lives one level down, in each stage's own Pareto.
 * So this shows exactly the four numbers we can actually weigh, and calls
 * the gap between corrugator and bundling what it honestly is: printing and
 * whatever's still in process, not a fabricated breakdown.
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

  const nodes = [
    { label: "Paper in", sub: "kraft consumed", kg: paperIn },
    { label: "Corrugator", sub: "good board", kg: totals.board_output_kg },
    { label: "Bundling", sub: "bundled", kg: Math.min(totals.bundled_output_kg, totals.board_output_kg) },
    { label: "Dispatch", sub: "counted, staged", kg: Math.min(totals.dispatched_kg, totals.bundled_output_kg) },
  ];
  const maxBarH = FLOW_H - FLOW_TOP - 70;
  const scale = maxBarH / paperIn;
  const barH = nodes.map((n) => Math.max(n.kg * scale, 1));

  const gaps: { fromIdx: number; kg: number; label: string; tone: "lost" | "wip" }[] = [
    { fromIdx: 0, kg: nodes[0].kg - nodes[1].kg, label: "Corrugator loss", tone: "lost" as const },
    { fromIdx: 1, kg: nodes[1].kg - nodes[2].kg, label: "Printing & WIP", tone: "wip" as const },
    { fromIdx: 2, kg: nodes[2].kg - nodes[3].kg, label: "Staged, not shipped", tone: "wip" as const },
  ].filter((g) => g.kg > paperIn * 0.002);

  const wasteY = FLOW_TOP + maxBarH + 26;

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
      <svg
        viewBox={`0 0 ${FLOW_W} ${FLOW_H}`}
        className="mx-auto block w-full"
        style={{ maxWidth: 560 }}
        role="img"
        aria-label="Material flow, paper in to dispatch"
      >
        {/* Kraft for the raw material, indigo from the corrugator on - the
            same "this has been converted" colour change the reference marks
            with its own kraft/blue split. */}
        {nodes.slice(0, -1).map((_, i) => (
          <path
            key={`flow-${i}`}
            d={ribbon(NODE_X[i] + NODE_W, FLOW_TOP, FLOW_TOP + barH[i], NODE_X[i + 1], FLOW_TOP + barH[i + 1])}
            fill={i === 0 ? "var(--color-board)" : "var(--color-series-1)"}
            fillOpacity={i === 0 ? 0.55 : 0.22}
          />
        ))}
        {gaps.map((gap, i) => {
          const x = NODE_X[gap.fromIdx] + NODE_W;
          const yMid = FLOW_TOP + (barH[gap.fromIdx] + barH[gap.fromIdx + 1]) / 2;
          const toX = Math.min(x + 70, FLOW_W - 90);
          const toY = wasteY + i * 19;
          const color = gap.tone === "lost" ? "var(--color-critical)" : "var(--color-board-edge)";
          return (
            <g key={`loss-${i}`}>
              <path
                d={leaderLine(x, yMid, toX, toY)}
                fill="none"
                stroke={color}
                strokeWidth={1.6}
              />
              <circle cx={x} cy={yMid} r={2.5} fill={color} />
              <text x={toX + 6} y={toY + 4} fontSize={11.5} fill="var(--color-ink-2)">
                {gap.label}{" "}
                <tspan fontWeight={700} fill={color}>
                  {formatNumber(gap.kg / 1000, 1)} t
                </tspan>
              </text>
            </g>
          );
        })}
        {nodes.map((node, i) => (
          <g key={node.label}>
            <rect x={NODE_X[i]} y={FLOW_TOP} width={NODE_W} height={barH[i]} rx={2} fill="var(--color-ink)" />
            <text
              x={i === 0 ? NODE_X[i] : i === nodes.length - 1 ? NODE_X[i] + NODE_W : NODE_X[i] + NODE_W / 2}
              y={FLOW_TOP - 20}
              textAnchor={i === 0 ? "start" : i === nodes.length - 1 ? "end" : "middle"}
              fontSize={12.5}
              fontWeight={700}
              fill="var(--color-ink)"
            >
              {node.label}
            </text>
            <text
              x={i === 0 ? NODE_X[i] : i === nodes.length - 1 ? NODE_X[i] + NODE_W : NODE_X[i] + NODE_W / 2}
              y={FLOW_TOP - 7}
              textAnchor={i === 0 ? "start" : i === nodes.length - 1 ? "end" : "middle"}
              fontSize={11}
              fill="var(--color-ink-2)"
            >
              {formatNumber(node.kg / 1000, 1)} t {node.sub}
            </text>
          </g>
        ))}
      </svg>
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
