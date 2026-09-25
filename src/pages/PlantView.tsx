import { useNavigate } from "react-router-dom";

import { usePlantOverview, useStageSpecifics, useTrends } from "@/api/queries";
import type { RollupCard, WaterfallStep } from "@/api/types";
import { AlertPanel } from "@/components/AlertPanel";
import { InstrumentCluster } from "@/components/InstrumentCluster";
import { FactorStrip, KpiCard } from "@/components/KpiCard";
import { MiniArc, PlanBar, TripleRing } from "@/components/MiniViz";
import { ProcessFlow } from "@/components/ProcessFlow";
import { ErrorPanel, LoadingPanel, Shell } from "@/components/Shell";
import { OwnerMobileView } from "@/pages/OwnerMobileView";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { FlightPath } from "@/components/charts/FlightPath";
import { LossWaterfall } from "@/components/charts/LossWaterfall";
import {
  EnergyMixBar,
  MaterialFlowBar,
  TimeSplitBar,
} from "@/components/charts/PlantComposition";
import { StagesClock } from "@/components/charts/StagesClock";
import { TrendLine } from "@/components/charts/TrendLine";
import { formatInr, formatMetric } from "@/lib/format";
import { useIsMobile } from "@/lib/useIsMobile";
import { useRange } from "@/lib/useRange";
import { kpiArcRange, RAG_META } from "@/lib/viz";

/**
 * Level 1 - the plant view. "What is happening with the plant right now?"
 *
 * The restraint is the feature: four rollup cards, no machine names, no
 * operating parameters, no tables, no Paretos. All of that exists one level
 * down, and putting any of it here would cost the five-second read this screen
 * exists to provide.
 *
 * Below the two signature charts sits a composition row - material, minutes and
 * power - which stays within that restraint because every bar in it is read off
 * the same totals block the cards above are computed from. It adds no new
 * request, no machine names and nothing to click through; it only opens up
 * numbers the screen already states.
 */
export function PlantView() {
  const { range, withRange } = useRange();
  const navigate = useNavigate();
  const overview = usePlantOverview(range);
  const trends = useTrends(30);
  // All-stages-on-one-clock reads the same hour rows the stage detail pages
  // do; it just wasn't fetched on this page until this panel needed it.
  const boardingSpecifics = useStageSpecifics("board_manufacturing", range);
  const printingSpecifics = useStageSpecifics("printing", range);
  const bundlingSpecifics = useStageSpecifics("bundling", range);
  // The owner's phone gets a re-ordered screen, not a narrower one.
  const isMobile = useIsMobile();

  const crumbs = [{ label: "Plant" }];

  if (overview.isPending) {
    return (
      <Shell crumbs={crumbs}>
        <LoadingPanel label="Reading the plant" />
      </Shell>
    );
  }
  if (overview.isError) {
    return (
      <Shell crumbs={crumbs}>
        <ErrorPanel
          error={overview.error}
          hint="Check that the API is running and that VITE_API_PROXY points at it."
        />
      </Shell>
    );
  }

  const data = overview.data;

  // A loss in the waterfall drills into the stage that owns it. Not-running and
  // ran-slow are the corrugator's; rejects are judged there too, since plant
  // productivity is computed on the pacemaker.
  const openLoss = (step: WaterfallStep) => {
    navigate(withRange("/stage/board_manufacturing/specifics", { panel: "causes" }));
    void step;
  };

  if (isMobile) {
    return (
      <Shell crumbs={crumbs} range={data.range} generatedAt={data.generated_at}>
        <OwnerMobileView data={data} trends={trends.data} />
      </Shell>
    );
  }

  return (
    <Shell crumbs={crumbs} range={data.range} generatedAt={data.generated_at}>
      <div className="flex flex-col gap-4">
        <ProcessFlow stages={data.status_line} generatedAt={data.generated_at} />
        <InstrumentCluster statusLine={data.status_line} totals={data.totals} />

        {/* Four rollups, never five. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.rollups.map((card) => (
            <RollupTile
              key={card.key}
              card={card}
              onOpen={() =>
                navigate(
                  withRange(
                    card.key === "power_per_tonne_kwh"
                      ? "/stage/board_manufacturing"
                      : "/stage/board_manufacturing/specifics",
                    { panel: card.key === "cost_of_waste_inr" ? "causes" : "hours" },
                  ),
                )
              }
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
          <FlightPath data={data.flight_path} />
          <LossWaterfall steps={data.waterfall} onSelectLoss={openLoss} />
        </div>

        {/* The composition underneath the headline numbers - material, minutes
            and power. All three read the same totals the rollup cards are
            computed from, so they cannot disagree with the cards above. */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <MaterialFlowBar totals={data.totals} />
          <StagesClock
            rows={{
              board_manufacturing: boardingSpecifics.data?.hour_rows ?? [],
              printing: printingSpecifics.data?.hour_rows ?? [],
              bundling: bundlingSpecifics.data?.hour_rows ?? [],
            }}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TimeSplitBar totals={data.totals} />
          <EnergyMixBar totals={data.totals} />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.05fr]">
          <AlertPanel
            alerts={data.alerts}
            recurring={data.recurring_issues}
            mode={data.alerts_panel_mode}
            cap={data.alerts_panel_mode === "live" ? 5 : 6}
          />

          <ChartFrame
            title="30-day trends"
            question="Which direction are we moving?"
            height={trends.data ? "auto" : 120}
            note="A shaded span marks monsoon days, so a seasonal dip in yield reads as expected rather than as a failure."
          >
            {trends.isPending ? (
              <div className="flex h-full items-center justify-center text-[12px] text-[var(--color-ink-muted)]">
                Loading trends…
              </div>
            ) : trends.isError ? (
              <div className="flex h-full items-center justify-center text-[12px] text-[var(--color-ink-muted)]">
                Trends unavailable.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
                {(
                  [
                    ["overall_yield_pct", "Overall yield", "%"],
                    ["plant_productivity_pct", "Plant productivity", "%"],
                    ["cost_of_waste_inr", "Cost of waste", "INR"],
                    ["power_per_tonne_kwh", "Power per tonne", "kWh/t"],
                  ] as const
                ).map(([key, label, unit]) => {
                  const band = trends.data.bands[key];
                  return (
                    <div key={key} className="min-w-0">
                      <span className="block text-[11px] text-[var(--color-ink-2)]">
                        {label}
                      </span>
                      <TrendLine
                        label={label}
                        unit={unit}
                        target={band?.target ?? null}
                        redLine={band?.red_line ?? null}
                        height={110}
                        data={trends.data.points.map((point) => ({
                          date: point.date,
                          value: point[key],
                          isMonsoon: point.is_monsoon,
                        }))}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </ChartFrame>
        </div>
      </div>
    </Shell>
  );
}

function RollupTile({ card, onOpen }: { card: RollupCard; onOpen: () => void }) {
  // The composite carries its three factors small beneath it, so the weak lever
  // is visible before anyone drills.
  const isProductivity = card.key === "plant_productivity_pct";
  const isWaste = card.key === "cost_of_waste_inr";
  const excess = card.sub_values.find((value) => value.label === "Excess");
  const ragColor = RAG_META[card.rag].color;

  // The same icon-per-card idea as the reference dashboard: a half-donut
  // against its band for a single figure, concentric rings for the U x R x Q
  // composite. The waste card's bar is real actual-vs-plan spend, not the
  // reference's invented splice/trim/warp split - a picture is only worth
  // adding here if it isn't inventing a number the rest of the app wouldn't
  // stand behind.
  // The axis comes from the same rule every KPI card in the app uses, rather
  // than a bound hand-picked per card: a percentage reads against 0-100, so a
  // real 82% fills 82% of the arc instead of contradicting the figure beside
  // it, and anything else reads against its own target.
  const arc = kpiArcRange({ ...card, lowerIsBetter: card.lower_is_better });

  let viz: React.ReactNode = null;
  let vizBelow: React.ReactNode = null;
  if ((card.key === "overall_yield_pct" || card.key === "power_per_tonne_kwh") && arc) {
    viz = (
      <MiniArc value={card.value} min={arc.min} max={arc.max} target={card.target} color={ragColor} />
    );
  } else if (isProductivity) {
    const find = (label: string) => card.sub_values.find((v) => v.label === label)?.value ?? null;
    viz = (
      <TripleRing
        items={[
          { value: find("U"), color: "var(--color-series-1)" },
          { value: find("R"), color: "var(--color-warning)" },
          { value: find("Q"), color: "var(--color-good)" },
        ]}
      />
    );
  } else if (isWaste && excess?.value != null && card.value != null) {
    vizBelow = <PlanBar actual={card.value} planned={card.value - excess.value} />;
  }

  return (
    <KpiCard
      label={card.label}
      value={card.value}
      unit={card.unit}
      target={card.target}
      rag={card.rag}
      provisional={card.provisional}
      lowerIsBetter={card.lower_is_better}
      delta={card.delta}
      deltaDirection={card.delta_direction}
      onClick={onOpen}
      viz={viz}
      vizBelow={vizBelow}
      sub={
        isProductivity ? (
          <FactorStrip items={card.sub_values} />
        ) : isWaste && excess ? (
          // The alert is on the excess, not the total: some waste is planned.
          <span>
            <span className="text-[var(--color-ink-muted)]">excess over plan </span>
            <span className="tnum font-medium text-[var(--color-ink)]">
              {formatInr(excess.value)}
            </span>
          </span>
        ) : (
          <span className="text-[var(--color-ink-muted)]">
            {card.sub_values
              .map((value) => `${value.label} ${formatMetric(value.value, value.unit)}`)
              .join(" · ")}
          </span>
        )
      }
    />
  );
}
