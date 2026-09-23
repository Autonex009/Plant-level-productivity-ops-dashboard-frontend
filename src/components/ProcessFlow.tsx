import { Link } from "react-router-dom";

import type { Stage, StatusDot } from "@/api/types";
import { formatRelative } from "@/lib/format";
import { useRange } from "@/lib/useRange";
import { STATE_META } from "@/lib/viz";

/**
 * The status line: the dashboard shaped like the plant.
 *
 * A single compact row - Boarding, Printing, Bundling - each a dot, a name,
 * and its live figure, matched exactly to the reference's statusline: no
 * boxed tiles, no connecting arrows, just the fastest possible read of "is
 * anything down right now."
 *
 * This strip never changes with the time selector. Whatever period the rest
 * of the screen is showing, this shows the plant right now.
 */
export function ProcessFlow({
  stages,
  activeStage,
  generatedAt,
}: {
  stages: StatusDot[];
  activeStage?: Stage;
  generatedAt?: string;
}) {
  const { withRange } = useRange();

  return (
    <section
      aria-label="Live plant status"
      className="panel flex flex-wrap items-center gap-2.5 px-[14px] py-[9px]"
    >
      {stages.map((dot) => {
        const meta = STATE_META[dot.status];
        const isActive = activeStage === dot.stage;
        return (
          <Link
            key={dot.stage}
            to={withRange(`/stage/${dot.stage}`)}
            aria-current={isActive ? "page" : undefined}
            className={[
              "flex items-center gap-[7px] rounded-[8px] px-[6px] py-1 text-[13.5px] font-semibold text-[var(--color-ink)] transition",
              isActive ? "bg-[var(--color-surface-3)]" : "hover:bg-[var(--color-surface-3)]",
            ].join(" ")}
          >
            <span
              aria-hidden
              className="relative h-[9px] w-[9px] shrink-0 rounded-full"
              style={{
                backgroundColor: meta.color,
                boxShadow: dot.status === "no_data" ? "none" : `0 0 0 3px color-mix(in srgb, ${meta.color} 20%, transparent)`,
              }}
            />
            {dot.label}
            <span className="font-medium text-[var(--color-ink-2)]">
              {dot.live_value != null
                ? `${dot.live_value} ${dot.live_unit}`
                : dot.status === "no_data"
                  ? "no feed"
                  : "not running"}
            </span>
          </Link>
        );
      })}
      <span className="ml-auto text-[12px] text-[var(--color-ink-muted)]">
        live status, always current
        {generatedAt ? ` · updated ${formatRelative(generatedAt)}` : ""}
      </span>
    </section>
  );
}
