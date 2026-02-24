'use client';

/**
 * Three.js Test Component
 * 
 * A simple component to verify Three.js is working correctly
 * without adding too much weight to the application.
 */

import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

function RotatingBox() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <mesh
      ref={meshRef}
      scale={hovered ? 1.2 : 1}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? '#5dc9c0' : '#607d7d'} />
    </mesh>
  );
}

function FootShape() {
  // Simple foot-like shape using a capsule
  return (
    <group position={[2, 0, 0]}>
      <mesh>
        <capsuleGeometry args={[0.3, 1, 8, 16]} />
        <meshStandardMaterial color="#f5d6ba" />
      </mesh>
      {/* Heel */}
      <mesh position={[0, -0.6, 0.1]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#e8c4a8" />
      </mesh>
    </group>
  );
}

export function ThreeJSTest() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800">
      <Canvas
        onCreated={() => setLoaded(true)}
        gl={{ antialias: true }}
        dpr={[1, 2]}
      >
        <PerspectiveCamera makeDefault position={[0, 2, 5]} />
        <OrbitControls enableZoom={true} enablePan={true} />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.5} color="#5dc9c0" />
        
        {/* Objects */}
        <RotatingBox />
        <FootShape />
        
        {/* Grid for reference */}
        <gridHelper args={[10, 10, '#607d7d', '#3a4d4d']} />
      </Canvas>
      
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="text-white">Loading 3D Engine...</div>
        </div>
      )}
    </div>
  );
}

export default ThreeJSTest;
