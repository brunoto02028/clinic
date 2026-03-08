"use client";

import { useState } from "react";

// ─── Types ───────────────────────────────────────────────
interface MotorPoint {
  id: string;
  name: string;
  bodyRegion: string;
  x: number;
  y: number;
  status: "normal" | "hypertonic" | "hypotonic" | "trigger_point";
  severity: number;
  notes?: string;
}

interface Mannequin3DProps {
  motorPoints?: MotorPoint[];
  onPointClick?: (point: MotorPoint) => void;
  interactive?: boolean;
  width?: number;
  height?: number;
  gender?: "male" | "female";
}

const STATUS_COLORS: Record<string, string> = {
  normal: "#22C55E",
  hypertonic: "#EF4444",
  hypotonic: "#3B82F6",
  trigger_point: "#F59E0B",
};

// ─── Anatomical Body Paths ──────────────────────────────
// Realistic frontal human body outline
const BODY_PATHS_FRONT = {
  // Head — realistic oval with jaw
  head: "M50,2 C44,2 39,5 37,10 C35,15 35,20 37,24 C39,28 42,31 46,33 L46,37 C46,38 48,39 50,39 C52,39 54,38 54,37 L54,33 C58,31 61,28 63,24 C65,20 65,15 63,10 C61,5 56,2 50,2 Z",
  // Left shoulder + deltoid + upper arm
  leftShoulder: "M46,39 C43,39.5 39,40 35,41.5 C30,43.5 26,46 23,49 C20,52 19,55 20,57.5 C21,59.5 23,60.5 26,60 L30,59 C33,58 36,56 38,54 L41,51 L44,47 L46,43 Z",
  // Right shoulder + deltoid + upper arm
  rightShoulder: "M54,39 C57,39.5 61,40 65,41.5 C70,43.5 74,46 77,49 C80,52 81,55 80,57.5 C79,59.5 77,60.5 74,60 L70,59 C67,58 64,56 62,54 L59,51 L56,47 L54,43 Z",
  // Torso — chest, ribcage, waist
  torso: "M44,47 C42,50 40,54 39,58 C38,62 38,66 39,70 L40,73.5 L43,76 L47,78 L50,78.5 L53,78 L57,76 L60,73.5 L61,70 C62,66 62,62 61,58 C60,54 58,50 56,47 L54,43 L50,42 L46,43 Z",
  // Pelvis / hips — wider, anatomical
  pelvis: "M43,76 L40,78 C38,80.5 36,83 35,86 C34,89 34.5,91 36,92.5 L39,94 L43,95 L47,95 L50,94.5 L53,95 L57,95 L61,94 L64,92.5 C65.5,91 66,89 65,86 C64,83 62,80.5 60,78 L57,76 L53,78 L50,78.5 L47,78 Z",
  // Left thigh + knee
  leftLeg: "M39,94 L37,97 C35.5,100 34.5,103 34,107 C33.5,111 34,114 35,117 L36.5,119.5 L38.5,121 L40.5,121 L42.5,119.5 L44,117 C45,114 45.5,111 45.5,107 C45.5,103 45,100 43.5,97 L43,95 Z",
  // Right thigh + knee
  rightLeg: "M61,94 L63,97 C64.5,100 65.5,103 66,107 C66.5,111 66,114 65,117 L63.5,119.5 L61.5,121 L59.5,121 L57.5,119.5 L56,117 C55,114 54.5,111 54.5,107 C54.5,103 55,100 56.5,97 L57,95 Z",
  // Left shin + calf + ankle + foot
  leftFoot: "M36.5,119.5 L35.5,123 C34.5,127 34,131 34,134.5 C34,137.5 34.5,140 35.5,142 L36.5,143.5 C37.5,144.5 39,145 41,145 L43.5,144.5 L45,143 C45.5,141.5 45,139.5 44,137.5 L43.5,135 C43.5,131 43,127 42,123 L42.5,119.5 Z",
  // Right shin + calf + ankle + foot
  rightFoot: "M63.5,119.5 L64.5,123 C65.5,127 66,131 66,134.5 C66,137.5 65.5,140 64.5,142 L63.5,143.5 C62.5,144.5 61,145 59,145 L56.5,144.5 L55,143 C54.5,141.5 55,139.5 56,137.5 L56.5,135 C56.5,131 57,127 58,123 L57.5,119.5 Z",
  // Left forearm + hand
  leftArm: "M20,57.5 L18,61 C16,65 14.5,69 14,73 C13.5,76 14,79 15,81 L16.5,82.5 C17.5,83.5 19,84 20.5,83.5 L22,82 C22.5,80 22,77 21.5,74 L22,70 C23,66 24,62 25.5,59 L26,60 Z",
  // Right forearm + hand
  rightArm: "M80,57.5 L82,61 C84,65 85.5,69 86,73 C86.5,76 86,79 85,81 L83.5,82.5 C82.5,83.5 81,84 79.5,83.5 L78,82 C77.5,80 78,77 78.5,74 L78,70 C77,66 76,62 74.5,59 L74,60 Z",
};

// Posterior view body paths
const BODY_PATHS_BACK = {
  head: "M50,2 C44,2 39,5 37,10 C35,15 35,20 37,24 C39,28 42,31 46,33 L46,37 C46,38 48,39 50,39 C52,39 54,38 54,37 L54,33 C58,31 61,28 63,24 C65,20 65,15 63,10 C61,5 56,2 50,2 Z",
  leftShoulder: BODY_PATHS_FRONT.leftShoulder,
  rightShoulder: BODY_PATHS_FRONT.rightShoulder,
  // Back — spine visible, scapulae
  torso: "M44,47 C42,50 40,54 39,58 C38,62 38,66 39,70 L40,73.5 L43,76 L47,78 L50,78.5 L53,78 L57,76 L60,73.5 L61,70 C62,66 62,62 61,58 C60,54 58,50 56,47 L54,43 L50,42 L46,43 Z",
  pelvis: BODY_PATHS_FRONT.pelvis,
  leftLeg: BODY_PATHS_FRONT.leftLeg,
  rightLeg: BODY_PATHS_FRONT.rightLeg,
  leftFoot: BODY_PATHS_FRONT.leftFoot,
  rightFoot: BODY_PATHS_FRONT.rightFoot,
  leftArm: BODY_PATHS_FRONT.leftArm,
  rightArm: BODY_PATHS_FRONT.rightArm,
};

// ─── Muscle detail lines for realism ────────────────────
const MUSCLE_DETAILS_FRONT = [
  // Clavicles
  "M38,42 Q44,40 50,42 Q56,40 62,42",
  // Pec lines
  "M44,48 Q47,52 50,50 Q53,52 56,48",
  // Abs midline
  "M50,52 L50,76",
  // Abs horizontal
  "M45,56 L55,56", "M44.5,61 L55.5,61", "M45,66 L55,66", "M46,71 L54,71",
  // Hip crease
  "M43,82 Q47,86 50,85 Q53,86 57,82",
  // Knee caps
  "M36,114 Q40,117 42,114", "M58,114 Q60,117 64,114",
];

const MUSCLE_DETAILS_BACK = [
  // Scapulae
  "M40,48 L44,54 L42,58", "M60,48 L56,54 L58,58",
  // Spine
  "M50,39 L50,76",
  // Spine bumps
  "M49,44 L51,44", "M49,48 L51,48", "M49,52 L51,52", "M49,56 L51,56",
  "M49,60 L51,60", "M49,64 L51,64", "M49,68 L51,68", "M49,72 L51,72",
  // Sacrum
  "M48,78 L50,82 L52,78",
  // Gluteal fold
  "M39,92 Q44,95 50,94 Q56,95 61,92",
  // Knee backs
  "M37,119 Q40,122 43,119", "M57,119 Q60,122 63,119",
];

// ─── Main Export ─────────────────────────────────────────
export default function Mannequin3D({
  motorPoints = [],
  onPointClick,
  interactive = true,
  width = 400,
  height = 550,
  gender = "male",
}: Mannequin3DProps) {
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);
  const [view] = useState<"front" | "back">("front");
  const paths = view === "back" ? BODY_PATHS_BACK : BODY_PATHS_FRONT;
  const details = view === "back" ? MUSCLE_DETAILS_BACK : MUSCLE_DETAILS_FRONT;

  // Skin gradient based on gender
  const skinBase = gender === "female" ? "#E8C4A8" : "#D4AA78";
  const skinLight = gender === "female" ? "#F0D4BC" : "#E0BE90";
  const skinDark = gender === "female" ? "#C8A080" : "#B8905C";

  return (
    <div
      style={{ width, height }}
      className="relative rounded-xl overflow-hidden"
    >
      <svg
        viewBox="0 0 100 148"
        className="w-full h-full"
        style={{ maxWidth: width, maxHeight: height }}
      >
        <defs>
          {/* Skin gradient */}
          <linearGradient id="skin-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={skinLight} stopOpacity={0.9} />
            <stop offset="50%" stopColor={skinBase} stopOpacity={0.85} />
            <stop offset="100%" stopColor={skinDark} stopOpacity={0.8} />
          </linearGradient>
          {/* Body shadow */}
          <filter id="body-shadow" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
            <feOffset dx="0" dy="1" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.15" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Glow for motor points */}
          <filter id="point-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background subtle gradient */}
        <rect width="100" height="148" fill="transparent" />

        {/* Body parts */}
        <g filter="url(#body-shadow)">
          {Object.entries(paths).map(([key, d]) => (
            <path
              key={key}
              d={d}
              fill="url(#skin-grad)"
              stroke={skinDark}
              strokeWidth={0.6}
              strokeOpacity={0.5}
              strokeLinejoin="round"
            />
          ))}
        </g>

        {/* Muscle/anatomical detail lines */}
        <g>
          {details.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={skinDark}
              strokeWidth={0.35}
              strokeOpacity={0.25}
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* Center midline (faint) */}
        <line x1="50" y1="39" x2="50" y2="78" stroke={skinDark} strokeWidth={0.2} strokeOpacity={0.1} strokeDasharray="1,2" />

        {/* Motor points */}
        {motorPoints.map((point) => {
          const cx = point.x * 100;
          const cy = point.y * 148;
          const color = STATUS_COLORS[point.status] || "#94A3B8";
          const isHovered = hoveredPoint === point.id;
          const r = isHovered ? 3.5 : 2.5;

          return (
            <g
              key={point.id}
              className="cursor-pointer"
              onClick={() => interactive && onPointClick?.(point)}
              onMouseEnter={() => setHoveredPoint(point.id)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {/* Glow ring for high severity */}
              {point.severity >= 5 && (
                <circle cx={cx} cy={cy} r={r * 2.5} fill={color} fillOpacity={0.12} filter="url(#point-glow)" />
              )}
              {/* Outer ring */}
              <circle cx={cx} cy={cy} r={r + 1} fill="none" stroke="white" strokeWidth={0.6} strokeOpacity={isHovered ? 0.8 : 0.4} />
              {/* Main dot */}
              <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={0.9} stroke={color} strokeWidth={0.5} />
              {/* Tooltip on hover */}
              {isHovered && (
                <g>
                  <rect
                    x={cx + 5}
                    y={cy - 12}
                    width={Math.max(point.name.length * 3.5, 30)}
                    height={10}
                    rx={2}
                    fill="black"
                    fillOpacity={0.8}
                  />
                  <text x={cx + 7} y={cy - 4.5} fontSize="5" fill="white" fontWeight="500">
                    {point.name}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
