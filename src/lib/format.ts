/** Formatting helpers. Waste is expressed in rupees, so the money formatter is
 *  the one that gets the most care: an owner reads lakhs and crores, not
 *  thousands-separated millions. */

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return "--";
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Indian numbering, abbreviated at the thresholds people actually speak in. */
export function formatInr(value: number | null | undefined, { compact = true } = {}): string {
  if (value == null || Number.isNaN(value)) return "--";
  const magnitude = Math.abs(value);
  if (!compact) return `₹${inr.format(Math.round(value))}`;
  if (magnitude >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
  if (magnitude >= 1_00_000) return `₹${(value / 1_00_000).toFixed(2)} L`;
  if (magnitude >= 1_000) return `₹${(value / 1_000).toFixed(1)}k`;
  return `₹${inr.format(Math.round(value))}`;
}

export function formatMetric(value: number | null | undefined, unit: string): string {
  if (value == null) return "--";
  if (unit === "INR") return formatInr(value);
  if (unit === "%") return `${formatNumber(value, 1)}`;
  if (unit === "count") return formatNumber(value, 0);
  if (unit === "t") return formatNumber(value, 1);
  if (unit === "min") return formatNumber(value, 0);
  return formatNumber(value, value >= 1000 ? 0 : 1);
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return "--";
  const total = Math.round(minutes);
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${hours}h ${String(rest).padStart(2, "0")}m` : `${hours}h`;
}

export function formatClock(iso: string | null | undefined): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function formatRelative(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "--";
  const minutes = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Axis ticks for a bucket key, which is either an ISO date or an "HH:00". */
export function formatBucket(bucket: string): string {
  if (/^\d{2}:\d{2}$/.test(bucket)) return bucket;
  if (/^\d{4}-\d{2}-\d{2}$/.test(bucket)) return formatDay(bucket);
  return bucket;
}

/**
 * Ticks for a value axis.
 *
 * Money is the awkward case: compacting every tick makes neighbouring ticks
 * collapse onto the same label ("3.00 L" twice on one axis), so a rupee axis
 * keeps one more significant figure than a card would.
 */
export function formatAxisTick(value: number, unit: string): string {
  if (unit !== "INR") return formatMetric(value, unit);
  const magnitude = Math.abs(value);
  if (magnitude >= 1_00_00_000) return `${(value / 1_00_00_000).toFixed(1)}Cr`;
  if (magnitude >= 1_00_000) return `${(value / 1_00_000).toFixed(1)}L`;
  if (magnitude >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}
