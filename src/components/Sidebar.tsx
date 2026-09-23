import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

import { useRange } from "@/lib/useRange";

/**
 * The persistent module rail, matched exactly to the reference's five
 * sections and subtitles. Each is a distinct question, not several views of
 * the same problem - the down-and-back rule inside a module (Plant → stage →
 * specifics) is unchanged, this just adds the layer above it.
 */
const NAV_ITEMS: {
  to: string;
  label: string;
  sub: string;
  icon: (props: { className?: string }) => ReactNode;
}[] = [
  { to: "/", label: "Overview", sub: "plant health at a glance", icon: OverviewIcon },
  {
    to: "/production-efficiency",
    label: "Production Efficiency",
    sub: "stages, hours, causes",
    icon: EfficiencyIcon,
  },
  {
    to: "/machine-monitoring",
    label: "Machine Monitoring",
    sub: "live states and parameters",
    icon: MonitoringIcon,
  },
  {
    to: "/analytics",
    label: "Analytics and AI Suggestions",
    sub: "trends and what to fix next",
    icon: AIIcon,
  },
  {
    to: "/settings",
    label: "Settings and Review",
    sub: "targets, codes, reconciliation",
    icon: SettingsIcon,
  },
];

export function Sidebar() {
  const location = useLocation();
  const { withRange } = useRange();

  return (
    <nav
      aria-label="Sections"
      className="hidden w-52 shrink-0 flex-col gap-[3px] border-r border-[var(--color-hairline)] bg-[var(--color-surface-1)] p-2 lg:flex"
    >
      <div className="mb-3 px-2 pt-1">
        <span className="font-title block text-[17px] font-bold text-[var(--color-ink)]">
          Plant Ops
        </span>
        <span className="block text-[12px] text-[var(--color-ink-2)]">Corrugation dashboard</span>
      </div>

      {NAV_ITEMS.map((item) => {
        const active = location.pathname === item.to;
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={withRange(item.to)}
            aria-current={active ? "page" : undefined}
            className={[
              "flex items-center gap-2.5 rounded-[9px] px-[11px] py-[9px] text-[13.5px] font-semibold transition",
              active
                ? "bg-[var(--color-series-1-soft)] text-[var(--color-series-1)]"
                : "text-[var(--color-ink-2)] hover:bg-[var(--color-surface-3)]",
            ].join(" ")}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              {item.label}
              <span
                className={[
                  "block truncate text-[11px] font-medium",
                  active ? "text-[var(--color-series-1)]" : "text-[var(--color-ink-muted)]",
                ].join(" ")}
              >
                {item.sub}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/** The same sections as a horizontal strip, for narrow screens where a
 *  persistent rail would cost more width than it is worth. */
export function MobileModuleTabs() {
  const location = useLocation();
  const { withRange } = useRange();

  return (
    <div
      role="tablist"
      aria-label="Sections"
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
              "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-semibold transition",
              active
                ? "bg-[var(--color-series-1-soft)] text-[var(--color-series-1)]"
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

function AIIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden>
      <path
        d="M10 2.5 11.4 6.6 15.5 8l-4.1 1.4L10 13.5 8.6 9.4 4.5 8l4.1-1.4L10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M15.5 12v3.5M13.75 13.75h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
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
