/**
 * The plant, drawn as machines rather than as boxes with a glyph in them.
 *
 * Every drawing here shares one coordinate space - 168 wide, floor at y=100 -
 * so stations line up on a common floor line and can be swapped or repeated
 * without re-doing the layout. Each takes `running`, and nothing moves unless
 * that is true: a spinning roll, a travelling sheet and a flowing belt all
 * mean the same single thing on this screen, which is "material is moving
 * here right now".
 *
 * Steel is drawn in its own neutral tokens, never in the status palette. A
 * machine's *state* rides on one accent bar and one indicator lamp, so green
 * and rose keep the meaning they have on every other screen instead of being
 * spent on shading.
 *
 * These are schematics, not portraits. Each machine is reduced to the parts a
 * plant person identifies it by - a corrugator by its fluted rolls and steam,
 * a flexo by its stacked cylinders and ink duct, a bundler by its strapping
 * arch - because a recognisable silhouette at a glance is worth more here
 * than accurate mechanical detail nobody can read at this size.
 */

export const STATION_W = 168;
export const FLOOR_Y = 100;

const BODY = "var(--color-machine-body)";
const EDGE = "var(--color-machine-edge)";
const DEEP = "var(--color-machine-deep)";
const BOARD = "var(--color-board)";
const BOARD_EDGE = "var(--color-board-edge)";

interface ArtProps {
  running: boolean;
  /** The machine's state colour, used only for the accent bar and the lamp. */
  accent: string;
}

/** A roll of kraft paper seen end-on, with the wound layers showing. */
function PaperRoll({
  cx,
  cy,
  r,
  running,
  speed = "slow",
}: {
  cx: number;
  cy: number;
  r: number;
  running: boolean;
  speed?: "slow" | "fast";
}) {
  return (
    <g className={running ? (speed === "fast" ? "machine-spin-fast" : "machine-spin") : undefined}>
      <circle cx={cx} cy={cy} r={r} fill={BOARD} stroke={BOARD_EDGE} strokeWidth="1.2" />
      <circle cx={cx} cy={cy} r={r * 0.66} fill="none" stroke={BOARD_EDGE} strokeWidth="0.9" opacity="0.7" />
      <circle cx={cx} cy={cy} r={r * 0.34} fill={DEEP} stroke={EDGE} strokeWidth="1" />
      {/* One spoke, so rotation is visible on an otherwise radially symmetric shape. */}
      <line
        x1={cx}
        y1={cy - r * 0.34}
        x2={cx}
        y2={cy - r}
        stroke={BOARD_EDGE}
        strokeWidth="1.1"
      />
    </g>
  );
}

/** A driven roller: the repeated unit every one of these machines is built from. */
function Roller({
  cx,
  cy,
  r,
  running,
  fill = DEEP,
}: {
  cx: number;
  cy: number;
  r: number;
  running: boolean;
  fill?: string;
}) {
  return (
    <g className={running ? "machine-spin-fast" : undefined}>
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke={EDGE} strokeWidth="1.1" />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy - r * 0.35} stroke={EDGE} strokeWidth="1.1" />
    </g>
  );
}

/** Machine feet, so every station reads as standing on the same floor. */
function Feet({ x, w }: { x: number; w: number }) {
  return (
    <g fill={EDGE}>
      <rect x={x + 6} y={FLOOR_Y - 6} width="9" height="6" rx="1" />
      <rect x={x + w - 15} y={FLOOR_Y - 6} width="9" height="6" rx="1" />
    </g>
  );
}

/** The state lamp: one dot per machine, in the status palette. */
function Lamp({ x, y, accent, running }: { x: number; y: number; accent: string; running: boolean }) {
  return (
    <g>
      {running && (
        <circle cx={x} cy={y} r="5.5" fill={accent} opacity="0.22">
          <animate attributeName="r" values="4;8;4" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.28;0;0.28" dur="2.4s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx={x} cy={y} r="3.2" fill={accent} stroke="var(--color-surface-1)" strokeWidth="1" />
    </g>
  );
}

/** The coloured strip along a machine's base that carries its state. */
function AccentBar({ x, w, accent }: { x: number; w: number; accent: string }) {
  return <rect x={x} y={FLOOR_Y - 9} width={w} height="3.5" rx="1.75" fill={accent} />;
}

/**
 * Reel stand: where kraft enters the plant. Two reels on an A-frame with the
 * web lifting away to the corrugator, plus the splice point that is the single
 * most common stop on this part of the line.
 */
export function ReelStand({ running, accent }: ArtProps) {
  return (
    <g>
      {/* A-frame */}
      <path
        d="M22 100 L44 52 M66 100 L44 52 M74 100 L96 52 M118 100 L96 52"
        stroke={EDGE}
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="18" y="96" width="106" height="4" rx="2" fill={EDGE} />

      <PaperRoll cx={44} cy={58} r={21} running={running} />
      <PaperRoll cx={96} cy={58} r={16} running={running} speed="fast" />

      {/* Web lifting off the large reel towards the corrugator. */}
      <path
        d="M63 50 C86 40 112 36 150 34"
        stroke={BOARD_EDGE}
        strokeWidth="2.6"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={running ? "9 6" : undefined}
        className={running ? "flow-line" : undefined}
      />
      {/* Splice point. */}
      <circle cx={78} cy={44} r="3" fill="var(--color-surface-1)" stroke={EDGE} strokeWidth="1.2" />

      <AccentBar x={18} w={106} accent={accent} />
      <Lamp x={130} y={44} accent={accent} running={running} />
    </g>
  );
}

/**
 * Corrugator: fluted rolls making the flute, a glue unit laying starch on the
 * tips, steam driving the whole thing, and board leaving at the dry end. The
 * flute profile between the rolls is the detail that makes this machine
 * unmistakable.
 */
export function Corrugator({ running, accent }: ArtProps) {
  return (
    <g>
      {/* Main frame */}
      <rect x="10" y="34" width="148" height="62" rx="6" fill={BODY} stroke={EDGE} strokeWidth="1.4" />
      <Feet x={10} w={148} />

      {/* Steam header and puffs - a corrugator is a steam machine. */}
      <rect x="30" y="26" width="52" height="8" rx="4" fill={DEEP} stroke={EDGE} strokeWidth="1" />
      {running && (
        <g fill={EDGE} opacity="0.5">
          <circle cx="42" cy="20" r="3.4">
            <animate attributeName="cy" values="22;8" dur="2.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0" dur="2.6s" repeatCount="indefinite" />
            <animate attributeName="r" values="2.6;6" dur="2.6s" repeatCount="indefinite" />
          </circle>
          <circle cx="62" cy="20" r="3">
            <animate attributeName="cy" values="22;8" dur="2.6s" begin="0.9s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.45;0" dur="2.6s" begin="0.9s" repeatCount="indefinite" />
            <animate attributeName="r" values="2.4;5.5" dur="2.6s" begin="0.9s" repeatCount="indefinite" />
          </circle>
        </g>
      )}

      {/* The fluting rolls. */}
      <Roller cx={40} cy={58} r={15} running={running} />
      <Roller cx={40} cy={84} r={11} running={running} />

      {/* Flute profile leaving the rolls - the machine's signature. */}
      <path
        d="M56 70 q5 -9 10 0 t10 0 t10 0 t10 0 t10 0 t10 0"
        stroke={BOARD_EDGE}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      {/* The two liners the flute is glued between. */}
      <line x1="56" y1="62" x2="126" y2="62" stroke={BOARD} strokeWidth="3" strokeLinecap="round" />
      <line x1="56" y1="78" x2="126" y2="78" stroke={BOARD} strokeWidth="3" strokeLinecap="round" />

      {/* Glue unit: pan with starch, applicator roll above it. */}
      <path d="M92 40 h26 l-4 12 h-18 Z" fill={DEEP} stroke={EDGE} strokeWidth="1.1" />
      <rect x="96" y="46" width="18" height="5" rx="2" fill={BOARD_EDGE} opacity="0.85" />
      <Roller cx={105} cy={54} r={6} running={running} fill={BODY} />

      {/* Dry end: heated plates. */}
      <rect x="126" y="56" width="26" height="26" rx="2" fill={DEEP} stroke={EDGE} strokeWidth="1.1" />
      <path
        d="M131 62 v14 M137 62 v14 M143 62 v14 M149 62 v14"
        stroke={accent}
        strokeWidth="1.3"
        opacity={running ? 0.75 : 0.3}
        strokeLinecap="round"
      />

      <AccentBar x={10} w={148} accent={accent} />
      <Lamp x={150} y={42} accent={accent} running={running} />
    </g>
  );
}

/**
 * Flexo printer: the stacked cylinder column (impression over plate over
 * anilox), an ink duct feeding it, a feed table of board in and a delivery
 * stack of printed sheets out.
 */
export function FlexoPrinter({ running, accent }: ArtProps) {
  return (
    <g>
      {/* Feed table with board waiting to go in. */}
      <rect x="8" y="76" width="30" height="20" rx="2" fill={DEEP} stroke={EDGE} strokeWidth="1.1" />
      <rect x="12" y="72" width="22" height="4" rx="1" fill={BOARD} stroke={BOARD_EDGE} strokeWidth="0.8" />
      <rect x="12" y="67" width="22" height="4" rx="1" fill={BOARD} stroke={BOARD_EDGE} strokeWidth="0.8" />

      {/* Print unit frame */}
      <rect x="40" y="26" width="76" height="70" rx="6" fill={BODY} stroke={EDGE} strokeWidth="1.4" />
      <Feet x={40} w={76} />

      {/* The cylinder column. */}
      <Roller cx={78} cy={44} r={13} running={running} />
      <Roller cx={78} cy={68} r={13} running={running} />
      <Roller cx={78} cy={87} r={7} running={running} fill={BODY} />

      {/* Ink duct and doctor blade feeding the anilox. */}
      <path d="M44 38 h20 l-3 11 h-14 Z" fill={DEEP} stroke={EDGE} strokeWidth="1.1" />
      <rect x="47" y="42" width="13" height="5" rx="2" fill={accent} opacity="0.55" />

      {/* Board passing between the cylinders. */}
      <line
        x1="38"
        y1="56"
        x2="126"
        y2="56"
        stroke={BOARD}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray={running ? "11 7" : undefined}
        className={running ? "flow-line" : undefined}
      />

      {/* Delivery stack of printed sheets. */}
      <rect x="120" y="74" width="34" height="22" rx="2" fill={DEEP} stroke={EDGE} strokeWidth="1.1" />
      <rect x="124" y="64" width="26" height="4" rx="1" fill={BOARD} stroke={BOARD_EDGE} strokeWidth="0.8" />
      <rect x="124" y="59" width="26" height="4" rx="1" fill={BOARD} stroke={BOARD_EDGE} strokeWidth="0.8" />
      {/* Ink marks, so the stack reads as printed rather than plain. */}
      <rect x="128" y="60.5" width="8" height="1.5" rx="0.75" fill={accent} opacity="0.7" />
      <rect x="128" y="65.5" width="8" height="1.5" rx="0.75" fill={accent} opacity="0.7" />

      <AccentBar x={40} w={76} accent={accent} />
      <Lamp x={110} y={34} accent={accent} running={running} />
    </g>
  );
}

/**
 * Bundling line: counted stacks travelling under a strapping arch, with the
 * strap band drawn across the finished bundle and completed bundles staged
 * beyond it.
 */
export function Bundler({ running, accent }: ArtProps) {
  return (
    <g>
      {/* Conveyor bed through the machine. */}
      <rect x="8" y="76" width="152" height="7" rx="3.5" fill={DEEP} stroke={EDGE} strokeWidth="1.1" />
      {[20, 42, 64, 86, 108, 130, 150].map((cx) => (
        <Roller key={cx} cx={cx} cy={79.5} r={4.4} running={running} fill={BODY} />
      ))}
      <Feet x={8} w={152} />

      {/* Strapping arch. */}
      <path
        d="M56 76 V38 a8 8 0 0 1 8 -8 h30 a8 8 0 0 1 8 8 V76"
        fill="none"
        stroke={EDGE}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <rect x="62" y="26" width="34" height="9" rx="3" fill={BODY} stroke={EDGE} strokeWidth="1.1" />

      {/* Bundle under the arch, with its strap. */}
      <rect x="64" y="56" width="30" height="20" rx="1.5" fill={BOARD} stroke={BOARD_EDGE} strokeWidth="1.1" />
      <line x1="72" y1="56" x2="72" y2="76" stroke={accent} strokeWidth="2" opacity="0.9" />
      <line x1="86" y1="56" x2="86" y2="76" stroke={accent} strokeWidth="2" opacity="0.9" />

      {/* Staged bundles downstream. */}
      <rect x="112" y="60" width="26" height="16" rx="1.5" fill={BOARD} stroke={BOARD_EDGE} strokeWidth="1" />
      <rect x="112" y="46" width="26" height="13" rx="1.5" fill={BOARD} stroke={BOARD_EDGE} strokeWidth="1" opacity="0.9" />
      <line x1="120" y1="60" x2="120" y2="76" stroke={accent} strokeWidth="1.6" opacity="0.65" />

      {/* Incoming sheets travelling in. */}
      {running && (
        <rect width="16" height="7" rx="1" fill={BOARD} stroke={BOARD_EDGE} strokeWidth="0.8">
          <animateMotion dur="2.2s" repeatCount="indefinite" path="M10,66 L48,66" />
        </rect>
      )}

      <AccentBar x={8} w={152} accent={accent} />
      <Lamp x={150} y={40} accent={accent} running={running} />
    </g>
  );
}

/**
 * Dispatch bay: palletised bundles and the truck they leave on. Not a machine,
 * so it is drawn as the boundary it is - a loading dock, in outline.
 */
export function DispatchBay({ running, accent }: { running: boolean; accent: string }) {
  return (
    <g>
      {/* Dock floor */}
      <rect x="6" y="96" width="156" height="4" rx="2" fill={EDGE} />

      {/* Truck */}
      <rect x="54" y="40" width="62" height="40" rx="3" fill={BODY} stroke={EDGE} strokeWidth="1.4" />
      <path d="M116 54 h20 l14 14 v12 h-34 Z" fill={DEEP} stroke={EDGE} strokeWidth="1.4" />
      <rect x="120" y="58" width="14" height="10" rx="1.5" fill={BODY} stroke={EDGE} strokeWidth="1" />
      <g className={running ? "machine-spin" : undefined}>
        <circle cx="72" cy="88" r="8" fill={DEEP} stroke={EDGE} strokeWidth="1.6" />
        <line x1="72" y1="80" x2="72" y2="85" stroke={EDGE} strokeWidth="1.4" />
      </g>
      <g className={running ? "machine-spin" : undefined}>
        <circle cx="130" cy="88" r="8" fill={DEEP} stroke={EDGE} strokeWidth="1.6" />
        <line x1="130" y1="80" x2="130" y2="85" stroke={EDGE} strokeWidth="1.4" />
      </g>

      {/* Palletised bundles waiting to load. */}
      <rect x="10" y="66" width="34" height="14" rx="1.5" fill={BOARD} stroke={BOARD_EDGE} strokeWidth="1" />
      <rect x="10" y="52" width="34" height="13" rx="1.5" fill={BOARD} stroke={BOARD_EDGE} strokeWidth="1" />
      <rect x="8" y="80" width="38" height="5" rx="1" fill={EDGE} />
      <line x1="20" y1="52" x2="20" y2="80" stroke={accent} strokeWidth="1.6" opacity="0.6" />
      <line x1="34" y1="52" x2="34" y2="80" stroke={accent} strokeWidth="1.6" opacity="0.6" />

      <Lamp x={150} y={44} accent={accent} running={running} />
    </g>
  );
}

/**
 * Waste baler: the trim chute and the baler it falls into. Drawn in the
 * critical colour whether or not it is currently active, because a loss is
 * never good news just because it happens to be running.
 */
export function WasteBaler({ active }: { active: boolean }) {
  const tone = "var(--color-critical)";
  return (
    <g>
      {/* Baler body */}
      <rect
        x="30"
        y="40"
        width="86"
        height="52"
        rx="5"
        fill={BODY}
        stroke={tone}
        strokeWidth="1.5"
        strokeDasharray="5 3"
      />
      {/* Ram at the top. */}
      <rect x="44" y="30" width="58" height="12" rx="3" fill={DEEP} stroke={tone} strokeWidth="1.2" />
      {active && (
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 0 4; 0 0"
          dur="2.4s"
          repeatCount="indefinite"
        />
      )}
      {/* Baled trim inside. */}
      <rect x="44" y="60" width="58" height="26" rx="2" fill={BOARD} stroke={BOARD_EDGE} strokeWidth="1" opacity="0.85" />
      <path
        d="M48 66 h50 M48 73 h50 M48 80 h50"
        stroke={BOARD_EDGE}
        strokeWidth="1"
        opacity="0.8"
      />
      <line x1="60" y1="60" x2="60" y2="86" stroke={tone} strokeWidth="1.4" opacity="0.75" />
      <line x1="86" y1="60" x2="86" y2="86" stroke={tone} strokeWidth="1.4" opacity="0.75" />
      <rect x="28" y="92" width="90" height="4" rx="2" fill={EDGE} />
    </g>
  );
}

/**
 * The conveyor between two stations. Belt, rollers, and - only while the
 * upstream machine is running - board actually travelling along it.
 */
export function Conveyor({
  x,
  y,
  width,
  running,
}: {
  x: number;
  y: number;
  width: number;
  running: boolean;
}) {
  const rollerCount = Math.max(2, Math.round(width / 18));
  const step = width / rollerCount;
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* Belt frame */}
      <rect x="0" y="0" width={width} height="9" rx="4.5" fill={DEEP} stroke={EDGE} strokeWidth="1.1" />
      {Array.from({ length: rollerCount + 1 }, (_, i) => (
        <Roller key={i} cx={i * step} cy={4.5} r={3.6} running={running} fill={BODY} />
      ))}
      {/* Support legs, so the conveyor stands on the same floor as the machines. */}
      <path
        d={`M6 9 V${FLOOR_Y - y} M${width - 6} 9 V${FLOOR_Y - y}`}
        stroke={EDGE}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Board on the belt. */}
      {running && (
        <rect width="22" height="6" rx="1" y="-7" fill={BOARD} stroke={BOARD_EDGE} strokeWidth="0.8">
          <animateMotion dur="2.4s" repeatCount="indefinite" path={`M0,0 L${width - 22},0`} />
        </rect>
      )}
    </g>
  );
}

/**
 * A transfer between two stations that do not share a floor height - one
 * corrugator feeding two printers, or two printers feeding one bundler.
 *
 * Drawn as a curved transfer conveyor with guide rails rather than as a
 * floating straight belt, because a straight belt between rows at different
 * heights meets neither machine and reads as a disconnected line.
 */
export function Transfer({
  from,
  to,
  running,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  running: boolean;
}) {
  const midX = (from.x + to.x) / 2;
  const d = `M${from.x},${from.y} C${midX},${from.y} ${midX},${to.y} ${to.x},${to.y}`;
  return (
    <g>
      {/* The bed, then its guide rails either side. */}
      <path d={d} fill="none" stroke={DEEP} strokeWidth="9" strokeLinecap="round" />
      <path d={d} fill="none" stroke={EDGE} strokeWidth="1.1" opacity="0.9" />
      {running && (
        <rect width="18" height="6" rx="1" y="-3" fill={BOARD} stroke={BOARD_EDGE} strokeWidth="0.8">
          <animateMotion dur="2.4s" repeatCount="indefinite" path={d} />
        </rect>
      )}
    </g>
  );
}

/** The floor a station stands on - drawn per station, never as one rule
 *  across the whole drawing, or empty space between columns picks up a line
 *  that looks like a divider. */
export function FloorPad({ x, y, width }: { x: number; y: number; width: number }) {
  return <rect x={x} y={y} width={width} height="2.5" rx="1.25" fill={EDGE} opacity="0.55" />;
}

/** The trim chute that drops waste off a machine down to the baler. */
export function WasteChute({
  from,
  to,
  active,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  active: boolean;
}) {
  const tone = "var(--color-critical)";
  const midY = (from.y + to.y) / 2;
  const d = `M${from.x},${from.y} C${from.x},${midY} ${to.x},${midY} ${to.x},${to.y}`;
  return (
    <g>
      {/* The chute walls, drawn as a pair so it reads as a duct rather than a line. */}
      <path d={d} fill="none" stroke={tone} strokeWidth="9" opacity={active ? 0.12 : 0.07} strokeLinecap="round" />
      <path
        d={d}
        fill="none"
        stroke={tone}
        strokeWidth="1.5"
        strokeDasharray="4 4"
        opacity={active ? 0.9 : 0.4}
      />
      {/* Trim tumbling down the chute. */}
      {active && (
        <>
          <rect width="7" height="4" rx="1" fill={BOARD} stroke={tone} strokeWidth="0.7">
            <animateMotion dur="1.8s" repeatCount="indefinite" path={d} />
          </rect>
          <rect width="5" height="3.4" rx="1" fill={BOARD} stroke={tone} strokeWidth="0.7">
            <animateMotion dur="1.8s" begin="0.9s" repeatCount="indefinite" path={d} />
          </rect>
        </>
      )}
    </g>
  );
}
