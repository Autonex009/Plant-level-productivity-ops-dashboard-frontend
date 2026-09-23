import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import type { MachineTile } from "@/api/types";
import { formatMinutes, formatNumber } from "@/lib/format";
import { STATE_META } from "@/lib/viz";

const TILE_CLASS =
  "min-w-[178px] flex-1 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-3 py-2.5 no-underline transition hover:border-[var(--color-hairline-strong)]";

/** One machine's live scoreboard tile: state, rate vs. its job standard, and
 *  what it's doing right now. Shared by the stage context row and the
 *  cross-stage Machine Monitoring module, so the two never drift apart.
 *  Pass `to` to make the tile a link into that machine's stage. */
export function MachineTileCard({ machine, to }: { machine: MachineTile; to?: string }) {
  const meta = STATE_META[machine.state];

  const content = (
    <>
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5 items-center justify-center">
          <span
            className={`absolute inset-0 rounded-full ${machine.state === "running" ? "pulse" : ""}`}
            style={{ color: meta.color }}
          />
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
        </span>
        <span className="truncate text-[12px] font-semibold text-[var(--color-ink)]">
          {machine.machine_code}
        </span>
        <span className="ml-auto text-[11px]" style={{ color: meta.color }}>
          {meta.label}
        </span>
      </div>

      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="tnum text-[19px] font-semibold leading-none text-[var(--color-ink)]">
          {machine.rate != null ? formatNumber(machine.rate, machine.rate >= 1000 ? 0 : 1) : "--"}
        </span>
        <span className="text-[11px] text-[var(--color-ink-muted)]">{machine.rate_unit}</span>
        {/* The actual only means something beside the budgeted rate. */}
        {machine.standard_rate != null && (
          <span className="tnum ml-auto text-[11px] text-[var(--color-ink-2)]">
            {machine.rate_vs_standard_pct != null
              ? `${machine.rate_vs_standard_pct}% of std`
              : `std ${formatNumber(machine.standard_rate, 0)}`}
          </span>
        )}
      </div>

      <div className="mt-1 truncate text-[11px] text-[var(--color-ink-muted)]">
        {machine.state !== "running" && machine.minutes_in_state != null
          ? `${formatMinutes(machine.minutes_in_state)} in state`
          : machine.name}
        {machine.reason_code ? ` · ${machine.reason_code.description}` : ""}
      </div>
    </>
  );

  return withWrapper(to, content);
}

function withWrapper(to: string | undefined, content: ReactNode) {
  if (to) {
    return (
      <Link to={to} className={TILE_CLASS}>
        {content}
      </Link>
    );
  }
  return <div className={TILE_CLASS}>{content}</div>;
}
