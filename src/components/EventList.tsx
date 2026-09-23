import { useEffect, useRef, useState } from "react";

import type { DowntimeEvent } from "@/api/types";
import { ReasonPickerDialog } from "@/components/ReasonPicker";
import { formatClock, formatMinutes } from "@/lib/format";
import { TIME_CATEGORY_META } from "@/lib/viz";

/** The event log: every non-running interval, with the classify action for
 *  anything still unexplained. Shared by stage specifics (Level 3) and the
 *  cross-stage Review inbox, so "classify a stop" behaves identically
 *  wherever it's reached from. */
export function EventList({
  events,
  highlightFrom,
}: {
  events: DowntimeEvent[];
  highlightFrom?: string | null;
}) {
  const [classifying, setClassifying] = useState<DowntimeEvent | null>(null);
  const highlightRef = useRef<HTMLLIElement | null>(null);

  const highlightAt = highlightFrom ? new Date(highlightFrom).getTime() : null;

  // Scroll the alert's own moment into view: the deep link should land on the
  // evidence, not merely on the right page.
  useEffect(() => {
    highlightRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlightFrom]);

  if (!events.length) {
    return (
      <p className="py-6 text-center text-[12px] text-[var(--color-ink-muted)]">
        No non-running events in this window.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y divide-[var(--color-hairline)]">
        {events.map((event) => {
          const meta = TIME_CATEGORY_META[event.category];
          const isHighlight =
            highlightAt != null &&
            Math.abs(new Date(event.start_time).getTime() - highlightAt) < 90 * 60_000;

          return (
            <li
              key={event.time_log_id}
              ref={isHighlight ? highlightRef : undefined}
              className={[
                "flex items-start gap-3 px-1 py-2",
                isHighlight ? "-mx-1 rounded-lg bg-[var(--color-warning)]/10 px-2" : "",
              ].join(" ")}
            >
              <span
                aria-hidden
                className="mt-1.5 h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: meta.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="tnum text-[12px] font-medium text-[var(--color-ink)]">
                    {formatClock(event.start_time)}
                  </span>
                  <span className="tnum text-[12px] text-[var(--color-ink-2)]">
                    {formatMinutes(event.duration_minutes)}
                  </span>
                  <span className="text-[11px] text-[var(--color-ink-muted)]">
                    {event.machine_code}
                  </span>
                  <span className="text-[12px] text-[var(--color-ink-2)]">
                    {event.reason ?? "unclassified"}
                  </span>
                  {meta.planned && (
                    <span className="rounded bg-[var(--color-surface-3)] px-1.5 py-0.5 text-[10px] text-[var(--color-ink-muted)]">
                      planned
                    </span>
                  )}
                </div>
                {event.order_number && (
                  <span className="text-[11px] text-[var(--color-ink-muted)]">
                    while running {event.order_number}
                  </span>
                )}
              </div>

              {/* The write action. Machines measure time; humans explain it. */}
              {event.needs_classification && (
                <button
                  type="button"
                  onClick={() => setClassifying(event)}
                  className="shrink-0 rounded-full border border-[var(--color-warning)]/50 px-2.5 py-0.5 text-[11px] text-[var(--color-warning)] transition hover:bg-[var(--color-warning)]/10"
                >
                  Classify
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {classifying && (
        <ReasonPickerDialog event={classifying} onClose={() => setClassifying(null)} />
      )}
    </>
  );
}
