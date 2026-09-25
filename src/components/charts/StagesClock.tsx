import type { HourRow, Stage } from "@/api/types";
import { ChartFrame, EmptyPlot } from "@/components/charts/ChartFrame";
import { STAGE_LABEL, STAGES, TIME_CATEGORY_META } from "@/lib/viz";

/**
 * All three stages plotted against one shared clock, instead of each
 * stage's own hourly chart in isolation - a stop on the corrugator and the
 * wait it causes in bundling a few minutes later are two different charts
 * everywhere else in this app; here they're two rows on the same axis, so
 * the cause and the effect line up without a word.
 *
 * Only meaningful at hourly granularity, which only Today has - Week and
 * Month roll hours up into days, and "all stages on one clock" stops being
 * a clock at that point.
 */
export function StagesClock({ rows }: { rows: Record<Stage, HourRow[]> }) {
  const buckets = Array.from(new Set(STAGES.flatMap((s) => rows[s].map((r) => r.bucket)))).sort();
  const hourly = buckets.length > 0 && rows[STAGES[0]].some((r) => r.hour != null);

  if (!hourly) {
    return (
      <ChartFrame
        title="All stages on one clock"
        question="When did a stop upstream show up downstream?"
        height={168}
      >
        <EmptyPlot>Only available on Today - hours roll up into days at Week and Month.</EmptyPlot>
      </ChartFrame>
    );
  }

  return (
    <ChartFrame
      title="All stages on one clock"
      question="When did a stop upstream show up downstream?"
      height="auto"
      note="A stop upstream shows up as waiting downstream a few minutes later."
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-[2px] pl-[76px]">
          {buckets.map((bucket, i) => (
            <span
              key={bucket}
              className="flex-1 truncate text-center text-[9.5px] text-[var(--color-ink-muted)]"
            >
              {i % 2 === 0 ? bucket : ""}
            </span>
          ))}
        </div>
        {STAGES.map((stage) => (
          <div key={stage} className="flex items-center gap-2">
            <span className="w-[72px] shrink-0 truncate text-[11px] font-semibold text-[var(--color-ink)]">
              {STAGE_LABEL[stage]}
            </span>
            <div className="flex h-[20px] flex-1 gap-[2px]">
              {buckets.map((bucket) => {
                const row = rows[stage].find((r) => r.bucket === bucket);
                const total = row ? row.segments.reduce((sum, seg) => sum + seg.minutes, 0) : 0;
                return (
                  <div
                    key={bucket}
                    className="flex min-w-0 flex-1 overflow-hidden rounded-[3px] bg-[var(--color-surface-3)]"
                  >
                    {row && total > 0 &&
                      row.segments
                        .filter((seg) => seg.minutes > 0)
                        .map((seg, i) => {
                          const meta = TIME_CATEGORY_META[seg.category];
                          return (
                            <div
                              key={i}
                              style={{ width: `${(seg.minutes / total) * 100}%`, backgroundColor: meta.color }}
                              title={`${STAGE_LABEL[stage]}, ${bucket}: ${meta.label} ${Math.round(seg.minutes)}m`}
                            />
                          );
                        })}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 pl-[76px] text-[10px] text-[var(--color-ink-2)]">
          {(["running", "setup", "breakdown", "waiting", "idle"] as const).map((cat) => (
            <span key={cat} className="flex items-center gap-1">
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: TIME_CATEGORY_META[cat].color }}
              />
              {TIME_CATEGORY_META[cat].label}
            </span>
          ))}
        </div>
      </div>
    </ChartFrame>
  );
}
