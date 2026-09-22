/** Response shapes from /api/v1/dashboard. These mirror the service functions
 *  in the backend's app/services/dashboard package. */

export type Stage = "board_manufacturing" | "printing" | "bundling";
export type RangeMode = "today" | "week" | "month" | "custom";
export type Rag = "green" | "amber" | "red" | "grey";
export type MachineState = "running" | "setup" | "down" | "waiting" | "idle" | "no_data";
export type TimeCategory = "running" | "setup" | "breakdown" | "waiting" | "idle";

export interface RangeInfo {
  mode: RangeMode;
  start: string;
  end: string;
  label: string;
  granularity: "hourly" | "daily" | "weekly";
  provisional: boolean;
  comparison_start?: string | null;
  comparison_end?: string | null;
  comparison_default_visible?: boolean;
}

export interface StatusDot {
  stage: Stage;
  label: string;
  status: MachineState;
  machine_count: number;
  machines_down?: number;
  live_value: number | null;
  live_unit: string | null;
  minutes_in_state?: number | null;
  worst_machine: string | null;
}

export interface SubValue {
  label: string;
  value: number | null;
  unit: string;
}

export interface RollupCard {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  target: number | null;
  red_line: number | null;
  rag: Rag;
  lower_is_better: boolean;
  season_adjusted: boolean;
  provisional: boolean;
  previous: number | null;
  delta: number | null;
  delta_direction: "up_good" | "up_bad" | "down_good" | "down_bad" | "flat" | null;
  sub_label: string | null;
  sub_values: SubValue[];
}

export interface FlightPathPoint {
  bucket: string;
  actual_cumulative: number;
  plan_cumulative: number;
}

export interface FlightPath {
  unit: string;
  points: FlightPathPoint[];
  actual_total: number;
  plan_total: number;
  gap_tonnes: number;
  gap_days: number | null;
  plan_available: boolean;
}

export interface WaterfallStep {
  key: string;
  label: string;
  value: number;
  kind: "total" | "loss";
  owner?: string;
  detail?: Record<string, number>;
  share_of_downtime?: Record<string, number>;
}

export interface Alert {
  key: string;
  type: "event" | "breach" | "drift" | "pattern";
  stage: Stage | null;
  what: string;
  where: string;
  how_long: string | null;
  action: string | null;
  level: number;
  impact_inr: number;
  machine_id: number | null;
  machine_run_id: number | null;
  at: string | null;
  window_start: string | null;
  window_end: string | null;
  acknowledgeable: boolean;
  acknowledged: boolean;
  acknowledged_at: string | null;
  escalated: boolean;
  metric_code: string | null;
  context: Record<string, unknown>;
}

export interface RecurringIssue {
  code: string;
  cause: string;
  category: TimeCategory;
  planned: boolean;
  stage: Stage;
  events: number;
  hours: number;
  impact_inr: number;
  tell_tale: string | null;
}

export interface PlantTotals {
  running_minutes: number;
  scheduled_minutes: number;
  minutes_by_category: Partial<Record<TimeCategory, number>>;
  utilisation_pct: number | null;
  rate_efficiency_pct: number | null;
  quality_pct: number | null;
  plant_productivity_pct: number | null;
  paper_consumed_kg: number;
  board_output_kg: number;
  dispatched_kg: number;
  overall_yield_pct: number | null;
  waste_kg: number;
  planned_waste_kg: number;
  waste_cost_inr: number | null;
  excess_waste_cost_inr: number | null;
  grid_kwh: number;
  dg_kwh: number;
  total_kwh: number;
  tonnes_produced: number;
  power_per_tonne_kwh: number | null;
  dg_hours: number;
  grid_share_pct: number | null;
}

export interface PlantOverview {
  plant_id: number;
  generated_at: string;
  range: RangeInfo;
  status_line: StatusDot[];
  rollups: RollupCard[];
  flight_path: FlightPath;
  waterfall: WaterfallStep[];
  totals: PlantTotals;
  alerts: Alert[];
  recurring_issues: RecurringIssue[];
  alerts_panel_mode: "live" | "recurring";
}

export interface TrendPoint {
  date: string;
  overall_yield_pct: number | null;
  plant_productivity_pct: number | null;
  cost_of_waste_inr: number | null;
  power_per_tonne_kwh: number | null;
  is_monsoon: boolean;
}

export interface Trends {
  days: number;
  points: TrendPoint[];
  bands: Record<string, { target: number | null; red_line: number | null; lower_is_better: boolean }>;
}

export interface OrderCard {
  id: number;
  order_number: string;
  customer_name: string | null;
  ply_construction: string | null;
  flute_profile: string | null;
  paper_gsm: number | null;
  paper_bf: number | null;
  quantity_ordered: number | null;
  due_date: string | null;
  standard_speed: number | null;
  standard_speed_unit: string | null;
  stage_standard: number | null;
  stage_standard_unit: string | null;
}

export interface MachineTile {
  machine_id: number;
  machine_code: string;
  name: string;
  stage: Stage;
  state: MachineState;
  minutes_in_state: number | null;
  since: string | null;
  rate: number | null;
  rate_unit: string;
  standard_rate: number | null;
  rate_vs_standard_pct: number | null;
  rated_speed: number | null;
  current_run_id: number | null;
  current_order: OrderCard | null;
  reason_code: { id: number; code: string; description: string } | null;
}

export interface Kpi {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  target: number | null;
  red_line: number | null;
  rag: Rag;
  lower_is_better: boolean;
  season_adjusted: boolean;
  provisional: boolean;
  sub: string | null;
}

export interface HourlyBucket {
  bucket: string;
  output: number;
  running_minutes: number;
  minutes_by_category: Partial<Record<TimeCategory, number>>;
  annotation: string | null;
}

export interface ParetoBar {
  code: string;
  label: string;
  category?: TimeCategory;
  planned: boolean;
  minutes?: number;
  quantity?: number;
  events?: number;
  share_pct: number;
  cumulative_pct: number;
}

export interface TimeSplitRow {
  machine_id: number;
  machine_code: string;
  name: string;
  minutes: Partial<Record<TimeCategory, number>>;
  shares: Partial<Record<TimeCategory, number>>;
  total: number;
}

export interface StarvationBucket {
  bucket: string;
  starvation_minutes: number;
  upstream_lost_minutes: number;
}

export type ChartPayload =
  | { kind: "hourly_bars"; data: HourlyBucket[] }
  | { kind: "pareto"; data: ParetoBar[] }
  | { kind: "time_split_strip"; data: TimeSplitRow[] }
  | { kind: "starvation_timeline"; data: StarvationBucket[] };

export interface StageTrendPoint {
  date: string;
  first_pass_good_pct: number | null;
  uptime_pct: number | null;
  rate_efficiency_pct: number | null;
}

export interface StageView {
  plant_id: number;
  stage: Stage;
  stage_label: string;
  status_line: StatusDot[];
  range: RangeInfo;
  context_row: {
    machines: MachineTile[];
    current_order: OrderCard | null;
    parameters_chip: {
      applicable: boolean;
      phrase: string | null;
      in_band: number;
      drifting: number;
      no_data: number;
    };
    staged_orders_today: number | null;
  };
  kpis: Kpi[];
  charts: { primary: ChartPayload; secondary: ChartPayload };
  trend_7d: StageTrendPoint[];
  defect_pareto: ParetoBar[];
  alerts: Alert[];
  recurring_issues: RecurringIssue[];
  alerts_panel_mode: "live" | "recurring";
}

export interface DowntimeEvent {
  time_log_id: number;
  machine_run_id?: number;
  machine_code: string;
  category: TimeCategory;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  reason_code_id?: number | null;
  reason_code: string | null;
  reason: string | null;
  needs_classification: boolean;
  order_number: string | null;
}

export interface HourRow {
  bucket: string;
  hour: number | null;
  date: string;
  output: number;
  output_unit: string;
  segments: { category: TimeCategory; minutes: number; share_pct: number }[];
  events: DowntimeEvent[];
}

export interface ParameterStrip {
  machine_id: number;
  machine_code: string;
  metric_code: string;
  label: string;
  unit: string;
  source: string;
  value: number;
  band_low: number | null;
  band_high: number | null;
  target: number | null;
  position: "in_band" | "below" | "above" | "unknown";
  season_adjusted: boolean;
  drift: "rising" | "falling" | "steady";
  change: number;
  series: { at: string; value: number }[];
  last_checked_at: string;
}

export interface RunLogEntry {
  machine_run_id: number;
  machine_code: string;
  order_number: string | null;
  customer_name: string | null;
  ply_construction: string | null;
  flute_profile: string | null;
  start_time: string;
  end_time: string | null;
  running_minutes: number;
  lineal_metres: number | null;
  good_qty: number | null;
  reject_qty: number | null;
  unit: string | null;
  actual_rate: number | null;
  standard_rate: number | null;
  rate_vs_standard_pct: number | null;
  waste_kg: number | null;
}

export interface SetupLogEntry {
  time_log_id: number;
  machine_code: string;
  start_time: string;
  duration_minutes: number;
  job_to: string | null;
  job_from: string | null;
  reason: string;
}

export interface StagedOrder {
  order_id: number;
  order_number: string;
  customer_name: string | null;
  quantity_ordered: number | null;
  due_date: string | null;
  staged_at: string;
  on_time: boolean | null;
}

export interface WorkerLogEntry {
  machine_run_id: number;
  machine_code: string;
  shift_date: string;
  shift_number: number;
  worker_count: number;
  bundles_count: number;
  output_kg: number | null;
  output_per_worker: number | null;
  count_accuracy_pct: number | null;
  starvation_minutes: number;
}

export interface StarvationEvent {
  time_log_id: number;
  machine_code: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  caused_by: {
    machine_code: string;
    category: TimeCategory;
    reason: string | null;
    time_log_id: number;
    duration_minutes: number;
  } | null;
}

export interface StageSpecifics {
  plant_id: number;
  stage: Stage;
  range: RangeInfo;
  hour_rows: HourRow[];
  causes: {
    downtime_pareto: ParetoBar[];
    defect_pareto: ParetoBar[];
    events: DowntimeEvent[];
  };
  parameters: ParameterStrip[];
  extras: {
    run_log?: RunLogEntry[];
    setup_log?: SetupLogEntry[];
    ink_checks?: {
      checks: {
        machine_code: string;
        metric_code: string;
        label: string;
        value: number;
        unit: string;
        recorded_at: string;
        source: string;
      }[];
      overdue: { machine_code: string; last_checked_at: string; hours_since: number }[];
    };
    staged_orders?: StagedOrder[];
    worker_log?: WorkerLogEntry[];
    starvation_events?: StarvationEvent[];
  };
}

export interface ReasonPicker {
  groups: {
    category: TimeCategory;
    planned: boolean;
    codes: { id: number; code: string; description: string }[];
  }[];
}
