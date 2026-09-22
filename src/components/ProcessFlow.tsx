import { Link } from "react-router-dom";

import type { Stage, StatusDot } from "@/api/types";
import { formatMinutes, formatNumber } from "@/lib/format";
import { useRange } from "@/lib/useRange";
import { STAGE_BLURB, STATE_META } from "@/lib/viz";

/**
 * The status line: the dashboard shaped like the plant.
 *
 * Boarding → Printing → Bundling across the top of every screen, so a plant
 * person recognises it without training. One dot per stage showing the worst
 * machine state in that stage, and one live figure beside it.
 *
 * This strip never changes with the time selector. Whatever period the rest of
 * the screen is showing, this shows the plant right now.
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
      className="panel relative overflow-hidden px-4 py-3 sm:px-5"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
          Plant now
        </h2>
        {generatedAt ? (
          <span className="text-[11px] text-[var(--color-ink-muted)]">
            live · not affected by the time selector
          </span>
        ) : null}
      </div>

      <ol className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-0">
        {stages.map((dot, index) => {
          const meta = STATE_META[dot.status];
          const isActive = activeStage === dot.stage;
          return (
            <li key={dot.stage} className="flex flex-1 items-center gap-0">
              <Link
                to={withRange(`/stage/${dot.stage}`)}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "group flex flex-1 items-center gap-3 rounded-xl border px-3 py-2.5 transition",
                  "hover:border-[var(--color-hairline-strong)] hover:bg-[var(--color-surface-2)]",
                  isActive
                    ? "border-[var(--color-hairline-strong)] bg-[var(--color-surface-2)]"
                    : "border-[var(--color-hairline)] bg-[var(--color-surface-2)]/40",
                ].join(" ")}
              >
                <span className="relative flex h-3 w-3 shrink-0 items-center justify-center">
                  <span
                    className={`absolute inset-0 rounded-full ${
                      dot.status === "running" ? "pulse" : ""
                    }`}
                    style={{ color: meta.color }}
                  />
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[15px] font-semibold text-[var(--color-ink)]">
                      {dot.label}
                    </span>
                    {/* State travels as a word as well as a colour. */}
                    <span className="text-[12px]" style={{ color: meta.color }}>
                      {meta.glyph} {meta.label}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-[var(--color-ink-muted)]">
                    {STAGE_BLURB[dot.stage]}
                    {dot.worst_machine ? ` · ${dot.worst_machine}` : ""}
                    {dot.status !== "running" && dot.minutes_in_state != null
                      ? ` · ${formatMinutes(dot.minutes_in_state)}`
                      : ""}
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  {/* No current speed is shown unless something is actually
                      producing: a number beside a red dot invites the reader to
                      believe the machine is fine. */}
                  {dot.live_value != null ? (
                    <>
                      <span className="tnum block text-[17px] font-semibold leading-none text-[var(--color-ink)]">
                        {formatNumber(dot.live_value, dot.live_value >= 1000 ? 0 : 1)}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-[var(--color-ink-muted)]">
                        {dot.live_unit}
                      </span>
                    </>
                  ) : (
                    <span className="text-[12px] text-[var(--color-ink-muted)]">
                      {dot.status === "no_data" ? "no feed" : "not running"}
                    </span>
                  )}
                </span>
              </Link>

              {index < stages.length - 1 ? (
                <span
                  aria-hidden
                  className="hidden shrink-0 px-1 text-[var(--color-hairline-strong)] lg:block"
                >
                  <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
                    <path
                      d="M0 5h16m0 0-4-4m4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
