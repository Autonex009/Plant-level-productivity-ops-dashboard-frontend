import { useState } from "react";
import { Link } from "react-router-dom";

import type { PlantOverview, RollupCard, Trends } from "@/api/types";
import { AlertPanel } from "@/components/AlertPanel";
import { RagPill } from "@/components/KpiCard";
import { TrendLine } from "@/components/charts/TrendLine";
import { formatInr, formatMetric } from "@/lib/format";
import { useRange } from "@/lib/useRange";
import { deltaTone, STATE_META } from "@/lib/viz";

/**
 * Level 1 on the owner's phone.
 *
 * A vertical stack with re-ordered priorities, not a shrunk desktop: money
 * first, then the rest of the rollups as a grid, then the stage status strip,
 * then alerts, with trends collapsed behind a tap on any card.
 *
 * All four rollups are on screen, with cost of waste promoted to the hero
 * rather than printed twice.
 *
 * The reorder is the whole point. An owner opening this in a car park wants one
 * number - what is today costing me - and everything else is the follow-up.
 */
export function OwnerMobileView({
  data,
  trends,
}: {
  data: PlantOverview;
  trends?: Trends;
}) {
  const [openTrend, setOpenTrend] = useState<string | null>(null);
  const { withRange } = useRange();

  const waste = data.rollups.find((card) => card.key === "cost_of_waste_inr");
  const others = data.rollups.filter((card) => card.key !== "cost_of_waste_inr");

  const trendFor = (key: string) =>
    trends?.points.map((point) => ({
      date: point.date,
      value: point[key as keyof typeof point] as number | null,
      isMonsoon: point.is_monsoon,
    })) ?? [];

  return (
    <div className="flex flex-col gap-3">
      {/* Money first. */}
      {waste && (
        <button
          type="button"
          onClick={() => setOpenTrend(openTrend === waste.key ? null : waste.key)}
          className="panel w-full p-4 text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
              {waste.label} · {data.range.label}
            </span>
            <RagPill rag={waste.rag} />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[38px] font-semibold leading-none tracking-tight">
              {formatInr(waste.value)}
            </span>
            {waste.provisional && (
              <span className="text-[16px] text-[var(--color-ink-muted)]">~</span>
            )}
          </div>
          <p className="mt-1.5 text-[12px] text-[var(--color-ink-2)]">
            <span className="text-[var(--color-ink-muted)]">excess over planned waste </span>
            {formatInr(waste.sub_values.find((v) => v.label === "Excess")?.value ?? null)}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--color-ink-muted)]">
            {waste.sub_values.find((v) => v.label === "Waste")?.value?.toLocaleString("en-IN")} kg
            of paper did not leave as saleable board · tap for the trend
          </p>
          {openTrend === waste.key && trends && (
            <div className="mt-3">
              <TrendLine
                label={waste.label}
                unit="INR"
                height={130}
                target={trends.bands[waste.key]?.target ?? null}
                redLine={trends.bands[waste.key]?.red_line ?? null}
                data={trendFor("cost_of_waste_inr")}
              />
            </div>
          )}
        </button>
      )}

      {/* Then the remaining rollups as a grid. Cost of waste is not repeated
          here: it is the hero above, and printing the same figure twice in the
          first screenful spends the most valuable space on nothing. */}
      <div className="grid grid-cols-2 gap-3">
        {others.map((card) => (
          <MiniCard
            key={card.key}
            card={card}
            open={openTrend === card.key}
            onToggle={() => setOpenTrend(openTrend === card.key ? null : card.key)}
            trend={trends ? trendFor(card.key) : []}
            bands={trends?.bands[card.key]}
          />
        ))}
      </div>

      {/* Then the stage status strip. */}
      <section className="panel p-3" aria-label="Live plant status">
        <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
          Plant now
        </span>
        <ul className="flex flex-col gap-1.5">
          {data.status_line.map((dot) => {
            const meta = STATE_META[dot.status];
            return (
              <li key={dot.stage}>
                <Link
                  to={withRange(`/stage/${dot.stage}`)}
                  className="flex items-center gap-2.5 rounded-lg px-1 py-1.5"
                >
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                  <span className="text-[13px] font-medium">{dot.label}</span>
                  <span className="text-[11px]" style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                  <span className="tnum ml-auto text-[13px]">
                    {dot.live_value != null ? (
                      <>
                        {dot.live_value.toLocaleString("en-IN")}
                        <span className="ml-1 text-[10px] text-[var(--color-ink-muted)]">
                          {dot.live_unit}
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] text-[var(--color-ink-muted)]">
                        {dot.status === "no_data" ? "no feed" : "not running"}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Then alerts. */}
      <AlertPanel
        alerts={data.alerts}
        recurring={data.recurring_issues}
        mode={data.alerts_panel_mode}
        cap={5}
      />
    </div>
  );
}

function MiniCard({
  card,
  open,
  onToggle,
  trend,
  bands,
}: {
  card: RollupCard;
  open: boolean;
  onToggle: () => void;
  trend: { date: string; value: number | null; isMonsoon?: boolean }[];
  bands?: { target: number | null; red_line: number | null };
}) {
  const tone = deltaTone(card.delta_direction);
  return (
    <button
      type="button"
      onClick={onToggle}
      className={["panel p-3 text-left", open ? "col-span-2" : ""].join(" ")}
    >
      <div className="flex items-start justify-between gap-1.5">
        <span className="min-w-0 text-[10px] font-medium uppercase leading-tight tracking-[0.06em] text-[var(--color-ink-muted)]">
          {card.label}
        </span>
        <RagPill rag={card.rag} compact />
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-[22px] font-semibold leading-none">
          {formatMetric(card.value, card.unit)}
        </span>
        {card.unit !== "INR" && (
          <span className="text-[11px] text-[var(--color-ink-2)]">{card.unit}</span>
        )}
        {card.provisional && <span className="text-[12px] text-[var(--color-ink-muted)]">~</span>}
      </div>
      {card.delta != null && (
        <span className="tnum mt-1 block text-[10px]" style={{ color: tone.color }}>
          {tone.glyph} {formatMetric(Math.abs(card.delta), card.unit)} vs prior
        </span>
      )}
      {open && trend.length > 0 && (
        <div className="mt-2">
          <TrendLine
            label={card.label}
            unit={card.unit}
            height={120}
            target={bands?.target ?? null}
            redLine={bands?.red_line ?? null}
            data={trend}
          />
        </div>
      )}
    </button>
  );
}
