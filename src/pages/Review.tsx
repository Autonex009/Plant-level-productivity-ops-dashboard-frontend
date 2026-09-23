import { usePlantOverview, useStageSpecifics } from "@/api/queries";
import type { DowntimeEvent, Stage } from "@/api/types";
import { AlertPanel } from "@/components/AlertPanel";
import { EventList } from "@/components/EventList";
import { ErrorPanel, LoadingPanel, Shell } from "@/components/Shell";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { useRange } from "@/lib/useRange";
import { STAGE_LABEL, STAGES } from "@/lib/viz";

/**
 * Review - "what needs a human decision right now?"
 *
 * Every unacknowledged alert (already sorted by rupee impact) and every
 * unclassified stop across all three stages, pooled into one worklist. This
 * is the inbox alerts and events land in; acknowledging or classifying here
 * is the same write action as everywhere else, just reached from one place
 * instead of three.
 */
export function Review() {
  const { range } = useRange();
  const overview = usePlantOverview(range);
  const boarding = useStageSpecifics("board_manufacturing", range);
  const printing = useStageSpecifics("printing", range);
  const bundling = useStageSpecifics("bundling", range);

  const specificsByStage: Record<Stage, ReturnType<typeof useStageSpecifics>> = {
    board_manufacturing: boarding,
    printing,
    bundling,
  };

  const crumbs = [{ label: "Review" }];
  const anyPending =
    overview.isPending || boarding.isPending || printing.isPending || bundling.isPending;

  if (anyPending) {
    return (
      <Shell crumbs={crumbs}>
        <LoadingPanel label="Reading the plant's open items" />
      </Shell>
    );
  }
  if (overview.isError) {
    return (
      <Shell crumbs={crumbs}>
        <ErrorPanel error={overview.error} />
      </Shell>
    );
  }

  const unclassified: { stage: Stage; event: DowntimeEvent }[] = STAGES.flatMap((stage) => {
    const specifics = specificsByStage[stage];
    if (!specifics.data) return [];
    return specifics.data.causes.events
      .filter((event) => event.needs_classification)
      .map((event) => ({ stage, event }));
  });

  return (
    <Shell crumbs={crumbs} range={overview.data.range} generatedAt={overview.data.generated_at}>
      <div className="flex flex-col gap-4">
        <AlertPanel
          alerts={overview.data.alerts}
          recurring={overview.data.recurring_issues}
          mode={overview.data.alerts_panel_mode}
        />

        <ChartFrame
          title="Unclassified stops"
          question="Which downtime still needs a reason?"
          height="auto"
          note="Machines measure the time; humans explain it. Nothing here means every stop in the selected period is already classified."
        >
          {STAGES.map((stage) => {
            const specifics = specificsByStage[stage];
            if (specifics.isError) {
              return (
                <ErrorPanel
                  key={stage}
                  error={specifics.error}
                  hint={`Could not load ${STAGE_LABEL[stage]}.`}
                />
              );
            }
            const events = unclassified.filter((row) => row.stage === stage).map((row) => row.event);
            if (!events.length) return null;
            return (
              <div key={stage} className="mb-3 last:mb-0">
                <span className="mb-1 block text-[11px] font-medium text-[var(--color-ink-2)]">
                  {STAGE_LABEL[stage]}
                </span>
                <EventList events={events} />
              </div>
            );
          })}
          {unclassified.length === 0 && (
            <p className="py-6 text-center text-[12px] text-[var(--color-ink-muted)]">
              Every stop in this period is classified.
            </p>
          )}
        </ChartFrame>
      </div>
    </Shell>
  );
}
