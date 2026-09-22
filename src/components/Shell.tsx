import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import type { RangeInfo, RangeMode } from "@/api/types";
import { formatRelative } from "@/lib/format";
import { RANGE_MODES, useRange } from "@/lib/useRange";

/**
 * The frame: breadcrumb on the left, time selector on the right, on every
 * screen at every level.
 *
 * Navigation is strictly down-and-back. There are no sideways tabs at the top
 * level - tabs hide problems, whereas a single landing screen makes every
 * problem visible on page load.
 */
export function Shell({
  crumbs,
  range,
  generatedAt,
  children,
}: {
  crumbs: { label: string; to?: string }[];
  range?: RangeInfo;
  generatedAt?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-[var(--color-hairline)] bg-[var(--color-plane)]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
          <Breadcrumb crumbs={crumbs} />
          <div className="ml-auto flex items-center gap-3">
            {range && <Freshness range={range} generatedAt={generatedAt} />}
            <TimeSelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 pb-10 pt-4 sm:px-6">{children}</main>
    </div>
  );
}

function Breadcrumb({ crumbs }: { crumbs: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={crumb.label} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && (
                <span aria-hidden className="text-[var(--color-ink-muted)]">
                  ›
                </span>
              )}
              {crumb.to && !last ? (
                <Link
                  to={crumb.to}
                  className="truncate text-[13px] text-[var(--color-ink-2)] transition hover:text-[var(--color-ink)]"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className="truncate text-[13px] font-semibold text-[var(--color-ink)]"
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * One selector switches the time base of the whole screen and inherits
 * downward. Two things never change with it: the layout skeleton, and the live
 * status line.
 */
function TimeSelector() {
  const { mode, from, to, setRange } = useRange();
  const [customOpen, setCustomOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <div
        role="tablist"
        aria-label="Time range"
        className="flex items-center rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-1)] p-0.5"
      >
        {RANGE_MODES.map((option) => {
          const selected = option.mode === mode;
          return (
            <button
              key={option.mode}
              role="tab"
              aria-selected={selected}
              title={`${option.label} — ${option.hint}`}
              onClick={() => {
                if (option.mode === "custom") {
                  setCustomOpen((open) => !open);
                  if (mode !== "custom") setRange("custom", { from, to });
                } else {
                  setCustomOpen(false);
                  setRange(option.mode as RangeMode);
                }
              }}
              className={[
                "rounded-full px-3 py-1 text-[12px] transition",
                selected
                  ? "bg-[var(--color-surface-3)] font-medium text-[var(--color-ink)]"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-2)]",
              ].join(" ")}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {(customOpen || (mode === "custom" && (!from || !to))) && (
        <div className="flex items-center gap-1.5 rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-1)] px-2 py-1">
          <input
            type="date"
            value={from ?? ""}
            onChange={(event) => setRange("custom", { from: event.target.value, to })}
            className="bg-transparent text-[12px] text-[var(--color-ink-2)] outline-none"
            aria-label="From date"
          />
          <span className="text-[var(--color-ink-muted)]">–</span>
          <input
            type="date"
            value={to ?? ""}
            onChange={(event) => setRange("custom", { from, to: event.target.value })}
            className="bg-transparent text-[12px] text-[var(--color-ink-2)] outline-none"
            aria-label="To date"
          />
        </div>
      )}
    </div>
  );
}

/**
 * Every zone carries an "updated X ago" stamp, and a range that includes today
 * says so. The dashboard never silently revises a number; it declares which
 * numbers are still settling.
 */
function Freshness({ range, generatedAt }: { range: RangeInfo; generatedAt?: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden text-right sm:block">
      <span className="block text-[12px] text-[var(--color-ink-2)]">{range.label}</span>
      <span className="block text-[10px] text-[var(--color-ink-muted)]">
        {range.provisional ? "~ provisional · " : "reconciled · "}
        updated {formatRelative(generatedAt)}
      </span>
    </div>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">(
    () => (document.documentElement.dataset.theme as "dark" | "light") ?? "dark",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-1)] px-2.5 py-1.5 text-[12px] text-[var(--color-ink-muted)] transition hover:text-[var(--color-ink-2)]"
    >
      {theme === "dark" ? "☾" : "☀"}
    </button>
  );
}

export function LoadingPanel({ label = "Loading" }: { label?: string }) {
  return (
    <div className="panel flex h-40 items-center justify-center text-[12px] text-[var(--color-ink-muted)]">
      {label}…
    </div>
  );
}

export function ErrorPanel({ error, hint }: { error: unknown; hint?: string }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="panel border-[var(--color-critical)]/40 p-5">
      <h2 className="text-[13px] font-semibold text-[var(--color-critical)]">
        Could not load this view
      </h2>
      <p className="mt-1.5 text-[12px] text-[var(--color-ink-2)]">
        {hint ?? "The dashboard API did not respond."}
      </p>
      <pre className="mt-2 overflow-x-auto rounded bg-[var(--color-surface-2)] p-2 text-[11px] text-[var(--color-ink-muted)]">
        {message}
      </pre>
    </div>
  );
}
