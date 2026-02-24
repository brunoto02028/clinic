"use client";

import { useRef, useMemo, useState, Suspense, Component, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

// ─── Types ───────────────────────────────────────────────
interface MotorPoint3D {
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
  motorPoints?: MotorPoint3D[];
  onPointClick?: (point: MotorPoint3D) => void;
  interactive?: boolean;
  width?: number;
  height?: number;
}

const STATUS_COLORS: Record<string, string> = {
  normal: "#22C55E",
  hypertonic: "#EF4444",
  hypotonic: "#3B82F6",
  trigger_point: "#F59E0B",
};

// ─── Error Boundary ──────────────────────────────────────
class Canvas3DErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// ─── Skin-like material override ─────────────────────────
const SKIN_MATERIAL = new THREE.MeshStandardMaterial({
  color: new THREE.Color("#D4AA78"),
  roughness: 0.45,
  metalness: 0.0,
});

// ─── GLB Human Model ────────────────────────────────────
function HumanModel() {
  const { scene } = useGLTF("/models/human.glb");
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child: any) => {
      if (child.isMesh) {
        child.material = SKIN_MATERIAL;
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    return clone;
  }, [scene]);

  // RPM models: ~1.65 units tall, feet at y=0
  // No scaling needed — just position at origin and frame with camera
  return <primitive object={clonedScene} />;
}

// ─── Motor Point Marker ──────────────────────────────────
function MotorPointMarker({
  point,
  position3D,
  onClick,
  interactive,
}: {
  point: MotorPoint3D;
  position3D: [number, number, number];
  onClick?: (point: MotorPoint3D) => void;
  interactive?: boolean;
}) {
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const color = STATUS_COLORS[point.status] || "#94A3B8";

  useFrame((state) => {
    if (glowRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 2.5) * 0.2;
      glowRef.current.scale.setScalar(s);
    }
  });

  const size = hovered ? 0.035 : 0.025;

  return (
    <group position={position3D}>
      {point.severity >= 5 && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[size * 2.8, 12, 12]} />
          <meshBasicMaterial color={color} transparent opacity={0.12} />
        </mesh>
      )}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          if (interactive && onClick) onClick(point);
        }}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHovered(true);
          if (typeof document !== "undefined") document.body.style.cursor = "pointer";
        }}
        onPointerLeave={() => {
          setHovered(false);
          if (typeof document !== "undefined") document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.8 : 0.4}
          roughness={0.3}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[size * 1.2, size * 1.5, 24]} />
        <meshBasicMaterial color="white" transparent opacity={hovered ? 0.85 : 0.45} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ─── Map 2D motor points to 3D positions ─────────────────
function mapMotorPointTo3D(point: MotorPoint3D): [number, number, number] {
  // Map to RPM model coords: x ±0.4, y 0..1.65
  const x3d = (point.x - 0.5) * 0.8;
  const y3d = (1 - point.y) * 1.65;
  const z3d = 0.15;
  return [x3d, y3d, z3d];
}

// ─── Loading spinner inside Canvas ───────────────────────
function Loader() {
  return (
    <mesh>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshBasicMaterial color="#D4AA78" wireframe />
    </mesh>
  );
}

// ─── Scene ───────────────────────────────────────────────
function Scene({
  motorPoints = [],
  onPointClick,
  interactive = true,
}: {
  motorPoints: MotorPoint3D[];
  onPointClick?: (point: MotorPoint3D) => void;
  interactive?: boolean;
}) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 5]} intensity={0.85} />
      <directionalLight position={[-3, 4, -2]} intensity={0.3} color="#C8D8F0" />
      <pointLight position={[0, 4, 2]} intensity={0.3} color="#FFF5E8" />
      <directionalLight position={[0, 1, -5]} intensity={0.2} color="#E0D0F0" />
      <hemisphereLight args={["#FFF8F0", "#D0C0B0", 0.25]} />

      <Suspense fallback={<Loader />}>
        <group>
          <HumanModel />
          {motorPoints.map((point) => (
            <MotorPointMarker
              key={point.id}
              point={point}
              position3D={mapMotorPointTo3D(point)}
              onClick={onPointClick}
              interactive={interactive}
            />
          ))}
        </group>
      </Suspense>

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={1.5}
        maxDistance={14}
        minPolarAngle={Math.PI * 0.05}
        maxPolarAngle={Math.PI * 0.9}
        target={[0, 0.82, 0]}
      />
    </>
  );
}

// ─── Fallback UI ─────────────────────────────────────────
function FallbackUI({ width, height }: { width: number; height: number }) {
  return (
    <div
      style={{ width, height }}
      className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400 mb-2">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
        <circle cx="12" cy="8" r="2" />
        <path d="M8 22 C8 18 16 18 16 22" />
        <line x1="12" y1="12" x2="12" y2="14" />
      </svg>
      <p className="text-sm text-muted-foreground">3D model unavailable</p>
      <p className="text-xs text-muted-foreground/60 mt-1">WebGL may not be supported</p>
    </div>
  );
}

// ─── WebGL check ─────────────────────────────────────────
function isWebGLAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

// ─── Main Export ─────────────────────────────────────────
export default function Mannequin3D({
  motorPoints = [],
  onPointClick,
  interactive = true,
  width = 400,
  height = 550,
}: Mannequin3DProps) {
  const [webglOk] = useState(() => isWebGLAvailable());

  if (!webglOk) {
    return <FallbackUI width={width} height={height} />;
  }

  return (
    <Canvas3DErrorBoundary fallback={<FallbackUI width={width} height={height} />}>
      <div
        style={{ width, height }}
        className="relative rounded-xl overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
      >
        <Canvas
          camera={{
            position: [0, 0.82, 2.8],
            fov: 42,
            near: 0.1,
            far: 50,
          }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "default",
            failIfMajorPerformanceCaveat: false,
          }}
          onCreated={({ gl }: any) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.15;
          }}
        >
          <Scene
            motorPoints={motorPoints}
            onPointClick={onPointClick}
            interactive={interactive}
          />
        </Canvas>

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[10px] text-muted-foreground/60 select-none pointer-events-none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 4v6h6M23 20v-6h-6" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
          <span>Drag to rotate</span>
        </div>
      </div>
    </Canvas3DErrorBoundary>
  );
}

// Preload the model
useGLTF.preload("/models/human.glb");
