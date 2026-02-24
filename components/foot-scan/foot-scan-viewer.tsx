'use client';

/**
 * Foot Scan 3D Viewer
 * 
 * Displays 3D foot scans (.obj, .stl, .glb files)
 * with measurement overlays and analysis visualization.
 */

import { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Html, useProgress, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface FootScanViewerProps {
  scanUrl?: string;
  scanType?: 'obj' | 'stl' | 'glb';
  biomechanicData?: {
    archType?: string;
    pronation?: string;
    pressurePoints?: Array<{ x: number; y: number; z: number; intensity: number }>;
  };
  showMeasurements?: boolean;
  showPressureMap?: boolean;
}

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
        <p>{progress.toFixed(0)}% loaded</p>
      </div>
    </Html>
  );
}

function GLBModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  return (
    <group ref={meshRef}>
      <primitive object={scene} scale={0.01} />
    </group>
  );
}

function FootModel({ url, type }: { url: string; type: string }) {
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  // If we have a GLB URL, use the GLB loader
  if (url && type === 'glb') {
    return <GLBModel url={url} />;
  }

  // Default placeholder foot (used when no scan URL provided)
  return (
    <group ref={meshRef}>
      {/* Left Foot Placeholder */}
      <group position={[-0.5, 0, 0]}>
        <mesh>
          <capsuleGeometry args={[0.15, 0.5, 8, 16]} />
          <meshStandardMaterial color="#f5d6ba" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.3, 0.05]}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshStandardMaterial color="#e8c4a8" roughness={0.8} />
        </mesh>
      </group>
      
      {/* Right Foot Placeholder */}
      <group position={[0.5, 0, 0]}>
        <mesh>
          <capsuleGeometry args={[0.15, 0.5, 8, 16]} />
          <meshStandardMaterial color="#f5d6ba" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.3, 0.05]}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshStandardMaterial color="#e8c4a8" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

function PressurePoints({ points }: { points: Array<{ x: number; y: number; z: number; intensity: number }> }) {
  return (
    <group>
      {points.map((point, i) => (
        <mesh key={i} position={[point.x, point.y, point.z]}>
          <sphereGeometry args={[0.02 + point.intensity * 0.03, 8, 8]} />
          <meshStandardMaterial 
            color={point.intensity > 0.7 ? '#ef4444' : point.intensity > 0.4 ? '#f59e0b' : '#22c55e'}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}

export function FootScanViewer({
  scanUrl,
  scanType = 'obj',
  biomechanicData,
  showMeasurements = true,
  showPressureMap = false,
}: FootScanViewerProps) {
  const [autoRotate, setAutoRotate] = useState(true);

  const defaultPressurePoints = [
    { x: -0.5, y: -0.2, z: 0.1, intensity: 0.8 },
    { x: -0.5, y: 0.1, z: 0.05, intensity: 0.5 },
    { x: 0.5, y: -0.2, z: 0.1, intensity: 0.6 },
    { x: 0.5, y: 0.1, z: 0.05, intensity: 0.4 },
  ];

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-sm rounded-md backdrop-blur-sm transition-colors"
        >
          {autoRotate ? 'Stop Rotation' : 'Auto Rotate'}
        </button>
      </div>

      {/* Info Panel */}
      {biomechanicData && (
        <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white text-sm">
          <h4 className="font-semibold mb-2 text-bruno-turquoise">Analysis</h4>
          {biomechanicData.archType && (
            <p>Arch Type: <span className="font-medium">{biomechanicData.archType}</span></p>
          )}
          {biomechanicData.pronation && (
            <p>Pronation: <span className="font-medium">{biomechanicData.pronation}</span></p>
          )}
        </div>
      )}

      <Canvas gl={{ antialias: true }} dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 1, 2]} />
        <OrbitControls 
          enableZoom={true} 
          enablePan={true}
          autoRotate={autoRotate}
          autoRotateSpeed={1}
          minDistance={1}
          maxDistance={5}
        />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
        <directionalLight position={[-5, 5, -5]} intensity={0.4} />
        <pointLight position={[0, -2, 0]} intensity={0.3} color="#5dc9c0" />
        
        <Suspense fallback={<Loader />}>
          <FootModel url={scanUrl || ''} type={scanType} />
          
          {showPressureMap && (
            <PressurePoints 
              points={biomechanicData?.pressurePoints || defaultPressurePoints} 
            />
          )}
        </Suspense>
        
        {/* Ground reflection */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial 
            color="#1a1a2e" 
            transparent 
            opacity={0.5}
          />
        </mesh>
        
        <Environment preset="studio" />
      </Canvas>
      
      {/* Legend */}
      {showPressureMap && (
        <div className="absolute bottom-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white text-xs">
          <p className="font-semibold mb-2">Pressure Map</p>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span>Low</span>
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span>Medium</span>
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span>High</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default FootScanViewer;
