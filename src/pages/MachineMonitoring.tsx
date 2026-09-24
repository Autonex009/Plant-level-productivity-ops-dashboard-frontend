import { Link } from "react-router-dom";

import { REFRESH, useStageSpecifics, useStageView } from "@/api/queries";
import type { Stage } from "@/api/types";
import { ErrorPanel, LoadingPanel, Shell } from "@/components/Shell";
import { BandStrip } from "@/components/charts/BandStrip";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { MachineTileCard } from "@/components/MachineTileCard";
import { ProcessDiagram } from "@/components/ProcessDiagram";
import { ProcessFlow } from "@/components/ProcessFlow";
import { useRange } from "@/lib/useRange";
import { STAGE_LABEL, STAGES } from "@/lib/viz";

/**
 * Machine Monitoring - "what state is every machine in, right now?"
 *
 * Pools the machine scoreboard and the parameter early-warning strips from all
 * three stages into one live control-room screen, instead of checking three
 * separate stage views one at a time. A tile or a strip still opens into that
 * machine's stage for the full down-and-back investigation.
 */
export function MachineMonitoring() {
  const { range, withRange } = useRange();

  // This page's whole job is "what is happening right now" - the live
  // process diagram lives here, so it polls faster than the 2-3 minute spec
  // cadence used everywhere else useStageView is called.
  const liveOptions = { refetchInterval: REFRESH.demo };
  const boarding = useStageView("board_manufacturing", range, liveOptions);
  const printing = useStageView("printing", range, liveOptions);
  const bundling = useStageView("bundling", range, liveOptions);

  const boardingSpecifics = useStageSpecifics("board_manufacturing", range);
  const printingSpecifics = useStageSpecifics("printing", range);
  const bundlingSpecifics = useStageSpecifics("bundling", range);

  const stageQueries: Record<Stage, ReturnType<typeof useStageView>> = {
    board_manufacturing: boarding,
    printing,
    bundling,
  };
  const specificsQueries: Record<Stage, ReturnType<typeof useStageSpecifics>> = {
    board_manufacturing: boardingSpecifics,
    printing: printingSpecifics,
    bundling: bundlingSpecifics,
  };

  const crumbs = [{ label: "Machine Monitoring" }];
  const anyPending =
    boarding.isPending ||
    printing.isPending ||
    bundling.isPending ||
    boardingSpecifics.isPending ||
    printingSpecifics.isPending ||
    bundlingSpecifics.isPending;

  const statusLine =
    boarding.data?.status_line ?? printing.data?.status_line ?? bundling.data?.status_line;
  const rangeInfo = boarding.data?.range ?? printing.data?.range ?? bundling.data?.range;

  if (anyPending) {
    return (
      <Shell crumbs={crumbs}>
        <LoadingPanel label="Reading every machine" />
      </Shell>
    );
  }

  const parameterStrips = STAGES.flatMap((stage) => {
    const specifics = specificsQueries[stage];
    return specifics.data ? specifics.data.parameters.map((strip) => ({ stage, strip })) : [];
  });

  return (
    <Shell crumbs={crumbs} range={rangeInfo}>
      <div className="flex flex-col gap-4">
        {statusLine && <ProcessFlow stages={statusLine} />}

        <ChartFrame
          title="Live process flow"
          question="Where is material moving right now, and where is it being lost?"
          height="auto"
        >
          <ProcessDiagram
            machinesByStage={{
              board_manufacturing: boarding.data?.context_row.machines ?? [],
              printing: printing.data?.context_row.machines ?? [],
              bundling: bundling.data?.context_row.machines ?? [],
            }}
            parameters={parameterStrips.map(({ strip }) => strip)}
            stageHref={(stage) => withRange(`/stage/${stage}`)}
          />
        </ChartFrame>

        <section className="flex flex-col gap-3">
          {STAGES.map((stage) => {
            const query = stageQueries[stage];
            if (query.isError) {
              return (
                <ErrorPanel
                  key={stage}
                  error={query.error}
                  hint={`Could not load ${STAGE_LABEL[stage]}.`}
                />
              );
            }
            const machines = query.data?.context_row.machines ?? [];
            if (!machines.length) return null;

            return (
              <div key={stage} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between px-1">
                  <span className="text-[12px] font-medium text-[var(--color-ink-2)]">
                    {STAGE_LABEL[stage]}
                  </span>
                  <Link
                    to={withRange(`/stage/${stage}`)}
                    className="text-[11px] text-[var(--color-series-1)] transition hover:underline"
                  >
                    Open stage →
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {machines.map((machine) => (
                    <MachineTileCard
                      key={machine.machine_id}
                      machine={machine}
                      to={withRange(`/stage/${stage}`)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        <ChartFrame
          title="Operating parameters"
          question="Which readings are drifting before they cost quality or waste?"
          height="auto"
        >
          {parameterStrips.length === 0 ? (
            <p className="p-1 text-[12px] text-[var(--color-ink-muted)]">
              No parameter readings in the last few hours.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {parameterStrips.map(({ stage, strip }) => (
                <Link
                  key={`${stage}-${strip.machine_id}-${strip.metric_code}`}
                  to={withRange(`/stage/${stage}/specifics`, {
                    panel: "parameters",
                    machine: String(strip.machine_id),
                  })}
                  className="block no-underline"
                >
                  <BandStrip strip={strip} />
                </Link>
              ))}
            </div>
          )}
        </ChartFrame>
      </div>
    </Shell>
  );
}
