"use client";

/**
 * Visualizador 3D de Foot Scans e Palmilhas
 * Componente interativo usando React Three Fiber
 */

import { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Environment } from '@react-three/drei';
import { STLLoader } from 'three-stdlib';
import * as THREE from 'three';
import { Loader2 } from 'lucide-react';

interface STLModelProps {
  url: string;
  color?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

function STLModel({ url, color = '#14b8a6', position = [0, 0, 0], rotation = [0, 0, 0] }: STLModelProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Carregar STL
  const geometry = useLoader(STLLoader, url);
  
  // Centralizar geometria
  geometry.center();
  geometry.computeVertexNormals();
  
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={color}
        metalness={0.3}
        roughness={0.4}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

interface FootScan3DViewerProps {
  leftInsoleUrl?: string;
  rightInsoleUrl?: string;
  title?: string;
  showControls?: boolean;
}

export function FootScan3DViewer({
  leftInsoleUrl,
  rightInsoleUrl,
  title = "Suas Palmilhas em 3D",
  showControls = true,
}: FootScan3DViewerProps) {
  const [activeView, setActiveView] = useState<'both' | 'left' | 'right'>('both');
  
  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">{title}</h3>
        
        {showControls && (
          <div className="flex gap-2">
            <button
              onClick={() => setActiveView('both')}
              className={`px-3 py-1 rounded text-sm ${
                activeView === 'both'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Ambos
            </button>
            <button
              onClick={() => setActiveView('left')}
              className={`px-3 py-1 rounded text-sm ${
                activeView === 'left'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Esquerdo
            </button>
            <button
              onClick={() => setActiveView('right')}
              className={`px-3 py-1 rounded text-sm ${
                activeView === 'right'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Direito
            </button>
          </div>
        )}
      </div>
      
      {/* Canvas 3D */}
      <div className="flex-1 relative bg-gradient-to-b from-gray-50 to-gray-100">
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[0, 150, 300]} fov={50} />
          
          {/* Iluminação */}
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <pointLight position={[-10, -10, -5]} intensity={0.5} />
          
          {/* Ambiente */}
          <Environment preset="studio" />
          
          {/* Grid */}
          <Grid
            args={[400, 400]}
            cellSize={20}
            cellThickness={0.5}
            cellColor="#6b7280"
            sectionSize={100}
            sectionThickness={1}
            sectionColor="#4b5563"
            fadeDistance={800}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid
          />
          
          {/* Modelos 3D */}
          <Suspense fallback={null}>
            {leftInsoleUrl && (activeView === 'both' || activeView === 'left') && (
              <STLModel
                url={leftInsoleUrl}
                color="#14b8a6"
                position={activeView === 'both' ? [-60, 0, 0] : [0, 0, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
              />
            )}
            
            {rightInsoleUrl && (activeView === 'both' || activeView === 'right') && (
              <STLModel
                url={rightInsoleUrl}
                color="#0ea5e9"
                position={activeView === 'both' ? [60, 0, 0] : [0, 0, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
              />
            )}
          </Suspense>
          
          {/* Controles de órbita */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={100}
            maxDistance={500}
            maxPolarAngle={Math.PI / 2}
          />
        </Canvas>
        
        {/* Instruções */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 text-xs text-gray-600 shadow-lg">
          <p className="font-semibold mb-1">💡 Controles:</p>
          <p>• Arrastar: Rotacionar</p>
          <p>• Scroll: Zoom</p>
          <p>• Botão direito: Mover</p>
        </div>
        
        {/* Labels */}
        {activeView === 'both' && (
          <>
            <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 bg-teal-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
              Esquerdo
            </div>
            <div className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
              Direito
            </div>
          </>
        )}
      </div>
      
      {/* Loading fallback */}
      {!leftInsoleUrl && !rightInsoleUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Carregando modelo 3D...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente simplificado para preview
export function FootScan3DPreview({ url, title }: { url: string; title?: string }) {
  return (
    <div className="w-full h-64 rounded-lg overflow-hidden border">
      <FootScan3DViewer
        leftInsoleUrl={url}
        title={title}
        showControls={false}
      />
    </div>
  );
}
