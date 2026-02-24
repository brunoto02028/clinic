"use client";

import { useRef, useState, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  Grid,
  Environment,
  ContactShadows,
  Html,
} from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Eye,
  Ruler,
  Activity,
  Layers,
} from "lucide-react";

// ─── Types ───
interface FootMeasurements {
  leftFootLength?: number | null;
  rightFootLength?: number | null;
  leftFootWidth?: number | null;
  rightFootWidth?: number | null;
  leftArchHeight?: number | null;
  rightArchHeight?: number | null;
  archType?: string | null;
  pronation?: string | null;
  navicularHeight?: number | null;
  calcanealAlignment?: number | null;
  halluxValgusAngle?: number | null;
}

interface Foot3DViewerProps {
  measurements: FootMeasurements;
  side?: "left" | "right" | "both";
  showPressureMap?: boolean;
  className?: string;
}

// ─── Pressure color gradient ───
function getPressureColor(value: number): THREE.Color {
  // 0 = blue (low), 0.5 = green (medium), 1 = red (high)
  if (value < 0.33) {
    return new THREE.Color().lerpColors(
      new THREE.Color(0x2563eb),
      new THREE.Color(0x22c55e),
      value / 0.33
    );
  } else if (value < 0.66) {
    return new THREE.Color().lerpColors(
      new THREE.Color(0x22c55e),
      new THREE.Color(0xeab308),
      (value - 0.33) / 0.33
    );
  } else {
    return new THREE.Color().lerpColors(
      new THREE.Color(0xeab308),
      new THREE.Color(0xef4444),
      (value - 0.66) / 0.34
    );
  }
}

// ─── Procedural foot shape generation (enhanced realism) ───
function generateFootGeometry(
  length: number,
  width: number,
  archHeight: number,
  side: "left" | "right",
  archType?: string | null,
  pronation?: string | null,
  halluxValgusAngle?: number | null,
  calcanealAlignment?: number | null,
): THREE.BufferGeometry {
  // Scale from mm to scene units (1 unit = 10mm)
  const l = length / 10;
  const w = width / 10;
  const ah = archHeight / 10;
  const mirror = side === "right" ? -1 : 1;

  // Condition factors
  const isFlat = archType === "Flat";
  const isHigh = archType === "High";
  const isOverpronation = pronation === "Overpronation";
  const isSupination = pronation === "Supination";
  const hvAngle = halluxValgusAngle || 0;
  const calAlign = calcanealAlignment || 0;

  // Higher resolution for smoother model
  const segX = 30;
  const segZ = 60;
  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];

  for (let iz = 0; iz <= segZ; iz++) {
    const tz = iz / segZ; // 0 = heel, 1 = toes
    for (let ix = 0; ix <= segX; ix++) {
      const tx = ix / segX; // 0 = medial edge, 1 = lateral edge

      // ── Width profile (anatomically shaped) ──
      let widthFactor: number;
      if (tz < 0.12) {
        // Heel: starts narrow, rounds out
        const t = tz / 0.12;
        widthFactor = 0.48 + t * 0.32;
      } else if (tz < 0.25) {
        // Rearfoot transition
        widthFactor = 0.80 + (tz - 0.12) * 0.77;
      } else if (tz < 0.55) {
        // Midfoot: slightly narrower on lateral side
        widthFactor = 0.90 + (tz - 0.25) * 0.33;
      } else if (tz < 0.72) {
        // Ball of foot (widest point)
        widthFactor = 1.0 + 0.02 * Math.sin((tz - 0.55) / 0.17 * Math.PI);
      } else if (tz < 0.82) {
        // Metatarsal-phalangeal transition
        widthFactor = 1.0 - (tz - 0.72) * 1.5;
      } else {
        // Toes: progressive taper with individual toe hints
        const toeTaper = (tz - 0.82) / 0.18;
        widthFactor = 0.85 - toeTaper * 0.65;
      }
      widthFactor = Math.max(0.12, widthFactor);

      // ── Medial/lateral asymmetry (foot is not symmetric left-right) ──
      let medialShift = 0;
      if (tz > 0.65 && tz < 0.95) {
        // Medial side extends further (big toe side)
        medialShift = mirror * 0.04 * w * Math.sin((tz - 0.65) / 0.3 * Math.PI);
      }

      const halfW = (w * widthFactor) / 2;
      let x = mirror * (-halfW + tx * halfW * 2) + medialShift;

      // Z position (along foot length)
      const z = -l / 2 + tz * l;

      // ── Y position (height profile) ──
      let y = 0;

      // Medial arch (higher on medial side, lower on lateral)
      const medialFactor = side === "left" ? (1.0 - tx) : tx; // 1 = medial, 0 = lateral
      const lateralFactor = 1.0 - medialFactor;
      const archCurve = Math.sin(tz * Math.PI);
      const edgeFactor = 1.0 - Math.abs(tx - 0.5) * 2;

      // Arch height varies: medial arch is ~2x lateral arch
      const medialArchMult = isFlat ? 0.3 : isHigh ? 1.4 : 1.0;
      const lateralArchMult = isFlat ? 0.15 : isHigh ? 0.6 : 0.35;
      const archMult = medialFactor * medialArchMult + lateralFactor * lateralArchMult;
      y += ah * archCurve * edgeFactor * archMult * 0.5;

      // Heel bump (calcaneus)
      if (tz < 0.15) {
        const heelRound = 1.0 - tz / 0.15;
        y += 0.4 * heelRound * heelRound * (1.0 - Math.abs(tx - 0.5) * 1.8);
      }

      // Ball of foot prominence
      if (tz > 0.58 && tz < 0.78) {
        const ballFactor = Math.sin((tz - 0.58) / 0.2 * Math.PI);
        y += 0.2 * ballFactor * (1.0 - Math.abs(tx - 0.5) * 1.2);
      }

      // Individual toe bumps (5 toes at tz > 0.85)
      if (tz > 0.85) {
        const toeProgress = (tz - 0.85) / 0.15;
        const toeBump = Math.sin(toeProgress * Math.PI) * 0.15;
        // 5 toes spread across tx: big toe at medial side
        const toePositions = [0.15, 0.3, 0.45, 0.6, 0.75];
        for (let ti = 0; ti < 5; ti++) {
          const toeCenter = side === "left" ? toePositions[ti] : 1.0 - toePositions[ti];
          const toeDist = Math.abs(tx - toeCenter);
          if (toeDist < 0.08) {
            const toeHeight = (1.0 - toeDist / 0.08) * toeBump * (1.0 - ti * 0.15);
            y += toeHeight;
          }
        }
      }

      // ── Pronation tilt (roll the foot medially/laterally) ──
      if (isOverpronation) {
        // Medial side drops, lateral rises
        const tiltAmount = 0.15 * (medialFactor - 0.5);
        y -= tiltAmount * mirror;
      } else if (isSupination) {
        // Lateral side drops, medial rises
        const tiltAmount = 0.12 * (lateralFactor - 0.5);
        y -= tiltAmount * mirror;
      }

      // ── Calcaneal alignment (heel tilt) ──
      if (calAlign !== 0 && tz < 0.2) {
        const heelTilt = (calAlign / 15) * 0.2 * (1.0 - tz / 0.2);
        y += heelTilt * (tx - 0.5) * mirror;
      }

      // ── Hallux valgus deviation ──
      if (hvAngle > 10 && tz > 0.8) {
        const hvProgress = (tz - 0.8) / 0.2;
        const hvDeviation = (hvAngle / 45) * 0.8 * hvProgress;
        // Big toe deviates laterally
        const bigToeCenter = side === "left" ? 0.15 : 0.85;
        const distFromBigToe = Math.abs(tx - bigToeCenter);
        if (distFromBigToe < 0.15) {
          const influence = 1.0 - distFromBigToe / 0.15;
          x += mirror * hvDeviation * influence;
          // Bunion bump at MTP joint
          if (tz > 0.8 && tz < 0.88 && distFromBigToe < 0.08) {
            y += 0.12 * (1.0 - distFromBigToe / 0.08) * Math.sin((tz - 0.8) / 0.08 * Math.PI);
          }
        }
      }

      // ── Pressure map coloring (condition-aware) ──
      let pressure = 0.25;
      if (tz < 0.15) {
        // Heel: high pressure, shifted medially in overpronation
        pressure = 0.75;
        if (isOverpronation) pressure += medialFactor * 0.15;
        if (isSupination) pressure += lateralFactor * 0.15;
      } else if (tz > 0.58 && tz < 0.78) {
        // Ball: high pressure
        pressure = 0.65;
        if (isOverpronation) pressure += medialFactor * 0.2; // 1st MTH overload
      } else if (tz > 0.85) {
        // Toes
        pressure = 0.45;
        if (hvAngle > 15) pressure += 0.1; // hallux pressure
      } else {
        // Midfoot: varies by arch type
        pressure = isFlat ? 0.45 : isHigh ? 0.1 : 0.2;
        pressure += archCurve * 0.1;
      }
      pressure += (1.0 - edgeFactor) * 0.08;

      const color = getPressureColor(Math.min(1, Math.max(0, pressure)));

      vertices.push(x, y, z);
      normals.push(0, 1, 0);
      uvs.push(tx, tz);
      colors.push(color.r, color.g, color.b);
    }
  }

  // Generate indices
  for (let iz = 0; iz < segZ; iz++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iz * (segX + 1) + ix;
      const b = a + 1;
      const c = a + (segX + 1);
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setIndex(indices);
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  return geo;
}

// ─── Foot Mesh Component ───
function FootMesh({
  measurements,
  side,
  showPressure,
  wireframe,
}: {
  measurements: FootMeasurements;
  side: "left" | "right";
  showPressure: boolean;
  wireframe: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const length =
    (side === "left"
      ? measurements.leftFootLength
      : measurements.rightFootLength) || 260;
  const width =
    (side === "left"
      ? measurements.leftFootWidth
      : measurements.rightFootWidth) || 100;
  const archHeight =
    (side === "left"
      ? measurements.leftArchHeight
      : measurements.rightArchHeight) || 25;

  const geometry = useMemo(
    () => generateFootGeometry(
      length, width, archHeight, side,
      measurements.archType,
      measurements.pronation,
      measurements.halluxValgusAngle,
      measurements.calcanealAlignment,
    ),
    [length, width, archHeight, side, measurements.archType, measurements.pronation, measurements.halluxValgusAngle, measurements.calcanealAlignment]
  );

  // Offset left/right feet
  const xOffset = side === "left" ? -6 : 6;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[xOffset, 0.01, 0]}
      rotation={[-Math.PI * 0.02, 0, 0]}
    >
      {showPressure ? (
        <meshStandardMaterial
          vertexColors
          roughness={0.6}
          metalness={0.1}
          wireframe={wireframe}
          side={THREE.DoubleSide}
        />
      ) : (
        <meshStandardMaterial
          color={side === "left" ? "#607d7d" : "#5dc9c0"}
          roughness={0.4}
          metalness={0.2}
          wireframe={wireframe}
          side={THREE.DoubleSide}
        />
      )}
    </mesh>
  );
}

// ─── Measurement Lines Component ───
function MeasurementLines({
  measurements,
  side,
}: {
  measurements: FootMeasurements;
  side: "left" | "right";
}) {
  const xOffset = side === "left" ? -6 : 6;
  const length =
    ((side === "left"
      ? measurements.leftFootLength
      : measurements.rightFootLength) || 260) / 10;
  const width =
    ((side === "left"
      ? measurements.leftFootWidth
      : measurements.rightFootWidth) || 100) / 10;

  return (
    <group position={[xOffset, 0.5, 0]}>
      {/* Length line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              new Float32Array([
                -width / 2 - 1.5, 0, -length / 2,
                -width / 2 - 1.5, 0, length / 2,
              ]),
              3,
            ]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#f97316" linewidth={2} />
      </line>
      <Html
        position={[-width / 2 - 2.5, 0, 0]}
        center
        style={{ pointerEvents: "none" }}
      >
        <div className="bg-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
          {(length * 10).toFixed(0)}mm
        </div>
      </Html>

      {/* Width line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              new Float32Array([
                -width / 2, 0, length / 2 + 1.5,
                width / 2, 0, length / 2 + 1.5,
              ]),
              3,
            ]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#3b82f6" linewidth={2} />
      </line>
      <Html
        position={[0, 0, length / 2 + 2.5]}
        center
        style={{ pointerEvents: "none" }}
      >
        <div className="bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
          {(width * 10).toFixed(0)}mm
        </div>
      </Html>
    </group>
  );
}

// ─── Annotation Labels ───
function FootLabels({ side }: { side: "left" | "right" }) {
  const xOffset = side === "left" ? -6 : 6;
  return (
    <Html
      position={[xOffset, 2, -10]}
      center
      style={{ pointerEvents: "none" }}
    >
      <div className="text-xs font-bold text-slate-700 bg-white/80 px-2 py-0.5 rounded shadow">
        {side === "left" ? "LEFT" : "RIGHT"}
      </div>
    </Html>
  );
}

// ─── Scene ───
function Scene({
  measurements,
  side,
  showPressure,
  showMeasurements,
  wireframe,
}: {
  measurements: FootMeasurements;
  side: "left" | "right" | "both";
  showPressure: boolean;
  showMeasurements: boolean;
  wireframe: boolean;
}) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 25, 30]} fov={40} />
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={15}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2.1}
      />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      <directionalLight position={[-10, 15, -5]} intensity={0.3} />

      {/* Grid */}
      <Grid
        args={[50, 50]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#e2e8f0"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#cbd5e1"
        fadeDistance={50}
        position={[0, -0.01, 0]}
      />

      <ContactShadows
        position={[0, -0.02, 0]}
        opacity={0.3}
        scale={40}
        blur={2}
      />

      {/* Feet */}
      {(side === "left" || side === "both") && (
        <>
          <FootMesh
            measurements={measurements}
            side="left"
            showPressure={showPressure}
            wireframe={wireframe}
          />
          {showMeasurements && (
            <MeasurementLines measurements={measurements} side="left" />
          )}
          <FootLabels side="left" />
        </>
      )}
      {(side === "right" || side === "both") && (
        <>
          <FootMesh
            measurements={measurements}
            side="right"
            showPressure={showPressure}
            wireframe={wireframe}
          />
          {showMeasurements && (
            <MeasurementLines measurements={measurements} side="right" />
          )}
          <FootLabels side="right" />
        </>
      )}
    </>
  );
}

// ─── Main Component ───
export default function Foot3DViewer({
  measurements,
  side = "both",
  className = "",
}: Foot3DViewerProps) {
  const [showPressure, setShowPressure] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [viewSide, setViewSide] = useState<"left" | "right" | "both">(side);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={showPressure ? "default" : "outline"}
          size="sm"
          onClick={() => setShowPressure(!showPressure)}
          className="gap-1 text-xs h-7"
        >
          <Activity className="h-3 w-3" /> Pressure Map
        </Button>
        <Button
          variant={showMeasurements ? "default" : "outline"}
          size="sm"
          onClick={() => setShowMeasurements(!showMeasurements)}
          className="gap-1 text-xs h-7"
        >
          <Ruler className="h-3 w-3" /> Measurements
        </Button>
        <Button
          variant={wireframe ? "default" : "outline"}
          size="sm"
          onClick={() => setWireframe(!wireframe)}
          className="gap-1 text-xs h-7"
        >
          <Layers className="h-3 w-3" /> Wireframe
        </Button>
        <div className="flex gap-1 ml-auto">
          {(["both", "left", "right"] as const).map((s) => (
            <Button
              key={s}
              variant={viewSide === s ? "default" : "outline"}
              size="sm"
              onClick={() => setViewSide(s)}
              className="text-xs h-7 px-2"
            >
              {s === "both" ? "Both" : s === "left" ? "L" : "R"}
            </Button>
          ))}
        </div>
      </div>

      {/* Info badges */}
      <div className="flex flex-wrap gap-2">
        {measurements.archType && (
          <Badge variant="outline" className="text-[10px]">
            Arch: {measurements.archType}
          </Badge>
        )}
        {measurements.pronation && (
          <Badge variant="outline" className="text-[10px]">
            Pronation: {measurements.pronation}
          </Badge>
        )}
        {measurements.calcanealAlignment != null && (
          <Badge variant="outline" className="text-[10px]">
            Calcaneal: {measurements.calcanealAlignment}°
          </Badge>
        )}
        {measurements.halluxValgusAngle != null && (
          <Badge variant="outline" className="text-[10px]">
            Hallux Valgus: {measurements.halluxValgusAngle}°
          </Badge>
        )}
      </div>

      {/* 3D Canvas */}
      <div className="w-full h-[400px] bg-gradient-to-b from-slate-100 to-slate-50 rounded-xl border overflow-hidden">
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          }
        >
          <Canvas shadows>
            <Scene
              measurements={measurements}
              side={viewSide}
              showPressure={showPressure}
              showMeasurements={showMeasurements}
              wireframe={wireframe}
            />
          </Canvas>
        </Suspense>
      </div>

      {/* Pressure legend */}
      {showPressure && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Low Pressure</span>
          <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-blue-500 via-green-500 via-yellow-500 to-red-500" />
          <span>High Pressure</span>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        Click &amp; drag to rotate. Scroll to zoom. Procedural model based on
        scan measurements.
      </p>
    </div>
  );
}
