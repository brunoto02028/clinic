/**
 * Tipos e interfaces para sistema de palmilhas personalizadas
 * BPR Clinic - Custom Insoles System
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D extends Point2D {
  z: number;
}

export interface InsoleSpecification {
  // Identificação
  footScanId: string;
  side: 'left' | 'right';
  
  // Geometria Base (mm)
  footLength: number;
  footWidth: number;
  heelWidth: number;
  foreFootWidth: number;
  
  // Espessuras por Zona (mm)
  thicknessMap: {
    heel: number;      // 4-8mm
    midfoot: number;   // 3-6mm
    forefoot: number;  // 2-4mm
    toes: number;      // 1-3mm
  };
  
  // Suporte de Arco
  archSupport: {
    height: number;    // mm (0-15mm)
    position: Point2D; // Coordenadas (mm do calcanhar)
    width: number;     // mm (20-50mm)
    slope: number;     // graus (5-20°)
  };
  
  // Posting (Cunhas)
  posting: {
    type: 'medial' | 'lateral' | 'none';
    angle: number;     // graus (0-8°)
    length: number;    // mm (extensão da cunha)
    material: string;  // "EVA 70 Shore A"
  };
  
  // Heel Cup
  heelCup: {
    depth: number;     // mm (10-20mm)
    width: number;     // mm (50-80mm)
    angle: number;     // graus (8-15°)
  };
  
  // Metatarsal Pad (opcional)
  metatarsalPad?: {
    enabled: boolean;
    height: number;    // mm (2-5mm)
    position: Point2D; // Coordenadas
    diameter: number;  // mm (20-35mm)
  };
  
  // Zonas de Offloading
  offloadingZones: Array<{
    location: Point2D;
    radius: number;    // mm
    depth: number;     // mm de redução (1-3mm)
    reason: string;    // "Hallux valgus", "Metatarsalgia"
  }>;
  
  // Trimline (Contorno)
  trimline: {
    style: 'full' | '3/4' | 'sulcus';
    coordinates: Point2D[];
  };
  
  // Materiais
  materials: {
    topCover: string;   // "EVA", "Leather", "Microfiber"
    baseLayer: string;  // "EVA 40 Shore A", "PU 60 Shore A"
    archFiller: string; // "Cork", "EVA 60 Shore A"
    posting: string;    // "EVA 70 Shore A", "Rigid plastic"
  };
  
  // Manufatura
  manufacturing: {
    method: 'CNC' | '3D_PRINT' | 'VACUUM_FORM';
    tolerance: number;  // mm (±0.5mm típico)
    estimatedTime: number; // minutos
  };
  
  // Validação
  validation: {
    geometryValid: boolean;
    printable: boolean;
    warnings: string[];
  };
}

export interface GeometryValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metrics?: {
    triangleCount: number;
    size: {
      x: number;
      y: number;
      z: number;
    };
    volume: number;
  };
}
