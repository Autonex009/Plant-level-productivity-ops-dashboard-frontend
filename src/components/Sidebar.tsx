import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

import { useRange } from "@/lib/useRange";

/**
 * The persistent module rail. Each item is a distinct question ("what's
 * happening" / "how efficient are we" / "what state is every machine in" /
 * "what needs a decision" / "what is this plant configured with"), not
 * several views of the same problem - the down-and-back rule inside a module
 * (Plant → stage → specifics) is unchanged, this just adds the layer above it.
 */
const NAV_ITEMS: { to: string; label: string; icon: (props: { className?: string }) => ReactNode }[] = [
  { to: "/", label: "Overview", icon: OverviewIcon },
  { to: "/production-efficiency", label: "Production Efficiency", icon: EfficiencyIcon },
  { to: "/machine-monitoring", label: "Machine Monitoring", icon: MonitoringIcon },
  { to: "/review", label: "Review", icon: ReviewIcon },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  const location = useLocation();
  const { withRange } = useRange();

  return (
    <nav
      aria-label="Modules"
      className="hidden w-56 shrink-0 flex-col border-r border-[var(--color-hairline)] bg-[var(--color-surface-1)] px-3 py-4 lg:flex"
    >
      <div className="mb-4 px-2">
        <span className="font-title block text-[15px] font-semibold text-[var(--color-ink)]">
          Plant Ops
        </span>
        <span className="block text-[11px] text-[var(--color-ink-muted)]">Corrugation dashboard</span>
      </div>

      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={withRange(item.to)}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex items-center gap-2.5 rounded-xl border px-3 py-2 text-[13px] transition",
                  active
                    ? "border-[var(--color-series-1)]/50 bg-[var(--color-series-1)]/10 font-medium text-[var(--color-ink)]"
                    : "border-transparent text-[var(--color-ink-2)] hover:border-[var(--color-hairline)] hover:bg-[var(--color-surface-2)]",
                ].join(" ")}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** The same three modules as a horizontal strip, for narrow screens where a
 *  persistent rail would cost more width than it is worth. */
export function MobileModuleTabs() {
  const location = useLocation();
  const { withRange } = useRange();

  return (
    <div
      role="tablist"
      aria-label="Modules"
      className="flex items-center gap-1 overflow-x-auto rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface-1)] p-1 lg:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const active = location.pathname === item.to;
        return (
          <Link
            key={item.to}
            to={withRange(item.to)}
            role="tab"
            aria-selected={active}
            className={[
              "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] transition",
              active
                ? "bg-[var(--color-surface-3)] font-medium text-[var(--color-ink)]"
                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink-2)]",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function OverviewIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M3 8.5 10 3l7 5.5V16a1 1 0 0 1-1 1h-3.5v-5h-5v5H4a1 1 0 0 1-1-1V8.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EfficiencyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M3 16.5V13m4.5 3.5V8m4.5 8.5V5m4.5 11.5V10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M3 8.5 7 5l4 2.5 6-4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MonitoringIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M2.5 10.5h3l1.8-4.5 3 8 1.7-3.5h5.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReviewIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <rect x="4" y="3" width="12" height="14" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M6.8 9.6 8.6 11.4 13.2 6.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7 13.6h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M10 3v1.8M10 15.2V17M17 10h-1.8M4.8 10H3M14.9 5.1l-1.27 1.27M6.37 13.63 5.1 14.9M14.9 14.9l-1.27-1.27M6.37 6.37 5.1 5.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
