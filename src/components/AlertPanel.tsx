import { useNavigate } from "react-router-dom";

import { useAcknowledgeAlert } from "@/api/queries";
import type { Alert, RecurringIssue, Stage } from "@/api/types";
import { formatInr } from "@/lib/format";
import { useRange } from "@/lib/useRange";
import { ALERT_META, STAGE_LABEL, TIME_CATEGORY_META } from "@/lib/viz";

/**
 * Alerts, and the one interaction the whole architecture is built to serve.
 *
 * Every alert reads as what + where + how long + status/first action, and
 * tapping one opens Level 3 with the time window pre-selected and the causing
 * events highlighted. Alert to root cause in one tap.
 *
 * The list is sorted by rupee impact rather than by time, because a dashboard
 * that lists alerts chronologically makes the reader do the prioritising.
 */
export function AlertPanel({
  alerts,
  recurring,
  mode,
  cap,
  stage,
}: {
  alerts: Alert[];
  recurring: RecurringIssue[];
  mode: "live" | "recurring";
  cap?: number;
  stage?: Stage;
}) {
  if (mode === "recurring") {
    return <RecurringIssues issues={recurring} cap={cap ?? 6} stage={stage} />;
  }
  return <LiveAlerts alerts={alerts} cap={cap} />;
}

function LiveAlerts({ alerts, cap }: { alerts: Alert[]; cap?: number }) {
  const visible = cap ? alerts.slice(0, cap) : alerts;

  return (
    <section className="panel flex flex-col overflow-hidden" aria-label="Alerts">
      <Header
        title="Alerts"
        note={visible.length ? `${visible.length} needing a decision` : undefined}
      />
      {visible.length === 0 ? (
        <Empty>
          Nothing above threshold. Alerts clear themselves the moment the
          condition clears.
        </Empty>
      ) : (
        <ul className="divide-y divide-[var(--color-hairline)]">
          {visible.map((alert) => (
            <AlertRow key={alert.key} alert={alert} />
          ))}
        </ul>
      )}
    </section>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  const navigate = useNavigate();
  const { withRange } = useRange();
  const acknowledge = useAcknowledgeAlert();
  const meta = ALERT_META[alert.type] ?? ALERT_META.event;

  // Deep link: open the stage's Level 3 at the moment of the alert, with the
  // panel it belongs in already focused.
  const target = alert.stage
    ? withRange(`/stage/${alert.stage}/specifics`, {
        focus: alert.key,
        panel: alert.type === "drift" ? "parameters" : "causes",
        at: alert.window_start ?? alert.at ?? undefined,
        machine: alert.machine_id != null ? String(alert.machine_id) : undefined,
      })
    : null;

  return (
    <li className="group relative">
      <div className="flex items-stretch gap-[9px] px-4 py-2">
        <span aria-hidden className="w-[3px] shrink-0 rounded-sm" style={{ backgroundColor: meta.color }} />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            disabled={!target}
            onClick={() => target && navigate(target)}
            className="block w-full text-left disabled:cursor-default"
          >
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: meta.color, backgroundColor: "var(--color-surface-3)" }}
              >
                {meta.label}
              </span>
              <span className="text-[13px] font-medium text-[var(--color-ink)]">
                {alert.what}
              </span>
              <span className="text-[12px] text-[var(--color-ink-2)]">{alert.where}</span>
              {alert.how_long && (
                <span className="tnum text-[12px] text-[var(--color-ink-muted)]">
                  {alert.how_long}
                </span>
              )}
              {alert.escalated && (
                <span className="rounded bg-[var(--color-surface-3)] px-1.5 py-0.5 text-[10px] text-[var(--color-critical)]">
                  escalated · unacknowledged 60 min
                </span>
              )}
            </span>
            {alert.action && (
              <span className="mt-0.5 block text-[12px] text-[var(--color-ink-2)]">
                {alert.action}
              </span>
            )}
          </button>

          <div className="mt-1.5 flex items-center gap-3">
            {alert.impact_inr > 0 && (
              <span className="tnum text-[11px] text-[var(--color-ink-muted)]">
                ≈ {formatInr(alert.impact_inr)}
              </span>
            )}
            {/* Acknowledged means owned, and stops escalation to Level 1. */}
            {alert.acknowledgeable &&
              (alert.acknowledged ? (
                <span className="text-[11px] text-[var(--color-good)]">✓ owned</span>
              ) : (
                <button
                  type="button"
                  onClick={() => acknowledge.mutate({ alertKey: alert.key })}
                  disabled={acknowledge.isPending}
                  className="rounded-full border border-[var(--color-hairline-strong)] px-2 py-0.5 text-[11px] text-[var(--color-ink-2)] transition hover:bg-[var(--color-surface-2)] disabled:opacity-50"
                >
                  {acknowledge.isPending ? "…" : "Acknowledge"}
                </button>
              ))}
            {target && (
              <span className="ml-auto text-[11px] text-[var(--color-ink-muted)] opacity-0 transition group-hover:opacity-100">
                open evidence →
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * In Week/Month/Custom the panel becomes the recurring-issues list: cause +
 * event count + hours + approximate rupee impact + the tell-tale detail. The
 * week's list is the Monday meeting agenda.
 */
function RecurringIssues({
  issues,
  cap,
  stage,
}: {
  issues: RecurringIssue[];
  cap: number;
  stage?: Stage;
}) {
  const visible = issues.slice(0, cap);

  return (
    <section className="panel flex flex-col overflow-hidden" aria-label="Recurring issues">
      <Header title="Recurring issues" note="sorted by ₹ impact" />
      {visible.length === 0 ? (
        <Empty>No classified stops in this period.</Empty>
      ) : (
        <ul className="divide-y divide-[var(--color-hairline)]">
          {visible.map((issue) => (
            <li key={`${issue.code}-${issue.stage}`} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 translate-y-[3px] rounded-full"
                      style={{
                        backgroundColor: TIME_CATEGORY_META[issue.category].color,
                      }}
                    />
                    <span className="text-[13px] font-medium text-[var(--color-ink)]">
                      {issue.cause}
                    </span>
                    {!stage && (
                      <span className="text-[11px] text-[var(--color-ink-muted)]">
                        {STAGE_LABEL[issue.stage]}
                      </span>
                    )}
                    {/* Planned time is never dressed as a failure. */}
                    {issue.planned && (
                      <span className="rounded bg-[var(--color-surface-3)] px-1.5 py-0.5 text-[10px] text-[var(--color-ink-muted)]">
                        planned
                      </span>
                    )}
                  </span>
                  <span className="tnum mt-0.5 block text-[11px] text-[var(--color-ink-muted)]">
                    {issue.events} events · {issue.hours}h
                    {issue.tell_tale ? ` · ${issue.tell_tale}` : ""}
                  </span>
                </div>
                <span className="tnum shrink-0 text-[13px] font-medium text-[var(--color-ink-2)]">
                  {formatInr(issue.impact_inr)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Header({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--color-hairline)] px-4 py-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
        {title}
      </h2>
      {note && <span className="text-[11px] text-[var(--color-ink-muted)]">{note}</span>}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 py-6 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
      {children}
    </p>
  );
}
