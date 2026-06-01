# 🚀 ROADMAP COMPLETO - 80% → 100%

**Objetivo:** Sistema totalmente funcional, testado e pronto para produção  
**Status Atual:** 80% completo  
**Meta:** 100% completo em 8-10 semanas  
**Data Início:** 01/06/2026  
**Data Prevista:** 01/08/2026

---

## 📊 VISÃO GERAL

### **O que falta para 100%:**

```
SISTEMA ATUAL (80%):
✅ Infraestrutura base
✅ Autenticação e usuários
✅ Dashboard admin
✅ Análise biomecânica (ensemble AI)
✅ Foot scan (captura e análise)
✅ Agendamentos
✅ Pagamentos (Stripe)
✅ E-mails automáticos

GAPS CRÍTICOS (20%):
❌ Geração real de STL (palmilhas)
❌ Especificação técnica completa
❌ Relatórios de manufatura
❌ Portal do paciente completo
❌ Visualização 3D
❌ Testes end-to-end
❌ Documentação de usuário
❌ Onboarding de pacientes
```

---

## 🎯 FASES DE IMPLEMENTAÇÃO

### **FASE 1: SISTEMA DE PALMILHAS (CRÍTICO)** 🔴
**Duração:** 3 semanas  
**Prioridade:** BLOQUEADOR  
**Investimento:** £2,700

### **FASE 2: PORTAL DO PACIENTE** 🟡
**Duração:** 2 semanas  
**Prioridade:** ALTA  
**Investimento:** £1,600

### **FASE 3: TESTES E VALIDAÇÃO** 🟢
**Duração:** 2 semanas  
**Prioridade:** ALTA  
**Investimento:** £1,600

### **FASE 4: DOCUMENTAÇÃO E TREINAMENTO** 🔵
**Duração:** 1 semana  
**Prioridade:** MÉDIA  
**Investimento:** £800

### **FASE 5: LANÇAMENTO E MONITORAMENTO** 🟣
**Duração:** Contínuo  
**Prioridade:** ALTA  
**Investimento:** £0

**TOTAL:** 8 semanas | £6,700

---

## 📅 CRONOGRAMA DETALHADO

```
SEMANA 1-3: FASE 1 (Palmilhas)
├─ Semana 1: Geração de STL
├─ Semana 2: Especificação técnica
└─ Semana 3: Relatórios de manufatura

SEMANA 4-5: FASE 2 (Portal do Paciente)
├─ Semana 4: Visualização 3D + Timeline
└─ Semana 5: Instruções + Comparações

SEMANA 6-7: FASE 3 (Testes)
├─ Semana 6: Testes unitários + integração
└─ Semana 7: Testes E2E + UAT

SEMANA 8: FASE 4 (Documentação)
└─ Semana 8: Manuais + Vídeos + Onboarding

SEMANA 9+: FASE 5 (Lançamento)
└─ Monitoramento contínuo
```

---

## 🔴 FASE 1: SISTEMA DE PALMILHAS (SEMANAS 1-3)

### **SEMANA 1: GERAÇÃO REAL DE STL**

#### **DIA 1-2: Setup e Biblioteca 3D**

**Tarefas:**
```bash
# 1. Instalar dependências
npm install three @react-three/fiber @react-three/drei

# 2. Criar estrutura de pastas
mkdir -p lib/insoles/{generators,validators,exporters}

# 3. Arquivos a criar:
lib/insoles/
├── generators/
│   ├── mesh-generator.ts      # Geração de malha 3D
│   ├── arch-support.ts         # Suporte de arco
│   ├── posting.ts              # Cunhas
│   ├── heel-cup.ts             # Heel cup
│   └── metatarsal-pad.ts       # Metatarsal pad
├── validators/
│   ├── geometry-validator.ts   # Validação de geometria
│   └── manifold-checker.ts     # Verificar se é manifold
├── exporters/
│   └── stl-exporter.ts         # Exportar para STL binário
└── index.ts                    # API principal
```

**Código Base:**
```typescript
// lib/insoles/generators/mesh-generator.ts

import * as THREE from 'three';
import { InsoleSpecificationComplete } from '@/types/insole';

export class InsoleMeshGenerator {
  private spec: InsoleSpecificationComplete;
  private geometry: THREE.BufferGeometry;
  
  constructor(spec: InsoleSpecificationComplete) {
    this.spec = spec;
    this.geometry = new THREE.BufferGeometry();
  }
  
  /**
   * Gera a malha 3D completa da palmilha
   */
  public generate(): THREE.BufferGeometry {
    // 1. Criar base (footprint)
    const baseShape = this.createBaseShape();
    
    // 2. Adicionar suporte de arco
    this.addArchSupport(baseShape);
    
    // 3. Adicionar posting (cunhas)
    this.addPosting(baseShape);
    
    // 4. Adicionar heel cup
    this.addHeelCup(baseShape);
    
    // 5. Adicionar metatarsal pad (se necessário)
    if (this.spec.metatarsalPad?.enabled) {
      this.addMetatarsalPad(baseShape);
    }
    
    // 6. Aplicar offloading zones
    this.applyOffloadingZones(baseShape);
    
    // 7. Aplicar trimline (contorno)
    this.applyTrimline(baseShape);
    
    // 8. Gerar malha final
    this.geometry = this.createMeshFromShape(baseShape);
    
    return this.geometry;
  }
  
  /**
   * Cria a forma base da palmilha (footprint)
   */
  private createBaseShape(): THREE.Shape {
    const shape = new THREE.Shape();
    
    // Usar medidas do pé para criar contorno
    const length = this.spec.footLength;
    const width = this.spec.footWidth;
    const heelWidth = this.spec.heelWidth || width * 0.6;
    const foreFootWidth = this.spec.foreFootWidth || width;
    
    // Desenhar contorno (simplificado - em produção usar curvas Bezier)
    shape.moveTo(0, 0); // Calcanhar
    shape.lineTo(heelWidth * 0.3, length * 0.3); // Arco medial
    shape.lineTo(foreFootWidth * 0.4, length * 0.7); // Antepé medial
    shape.lineTo(foreFootWidth * 0.5, length); // Dedos
    shape.lineTo(foreFootWidth * 0.6, length * 0.7); // Antepé lateral
    shape.lineTo(heelWidth * 0.7, length * 0.3); // Arco lateral
    shape.lineTo(heelWidth, 0); // Calcanhar lateral
    shape.closePath();
    
    return shape;
  }
  
  /**
   * Adiciona suporte de arco à forma
   */
  private addArchSupport(shape: THREE.Shape): void {
    const arch = this.spec.archSupport;
    
    // Criar elevação no arco
    // Posição: arch.position (coordenadas)
    // Altura: arch.height (mm)
    // Largura: arch.width (mm)
    // Inclinação: arch.slope (graus)
    
    // TODO: Implementar modificação da geometria
  }
  
  /**
   * Adiciona posting (cunhas medial/lateral)
   */
  private addPosting(shape: THREE.Shape): void {
    const posting = this.spec.posting;
    
    if (posting.type === 'none') return;
    
    // Criar cunha
    // Tipo: posting.type ('medial' ou 'lateral')
    // Ângulo: posting.angle (graus)
    // Extensão: posting.length (mm do calcanhar)
    
    // TODO: Implementar cunha
  }
  
  /**
   * Adiciona heel cup
   */
  private addHeelCup(shape: THREE.Shape): void {
    const heelCup = this.spec.heelCup;
    
    // Criar depressão no calcanhar
    // Profundidade: heelCup.depth (mm)
    // Largura: heelCup.width (mm)
    // Ângulo: heelCup.angle (graus)
    
    // TODO: Implementar heel cup
  }
  
  /**
   * Adiciona metatarsal pad
   */
  private addMetatarsalPad(shape: THREE.Shape): void {
    const pad = this.spec.metatarsalPad!;
    
    // Criar elevação circular
    // Posição: pad.position (coordenadas)
    // Altura: pad.height (mm)
    // Diâmetro: pad.diameter (mm)
    
    // TODO: Implementar metatarsal pad
  }
  
  /**
   * Aplica zonas de offloading (redução de pressão)
   */
  private applyOffloadingZones(shape: THREE.Shape): void {
    for (const zone of this.spec.offloadingZones) {
      // Criar depressão
      // Localização: zone.location (coordenadas)
      // Raio: zone.radius (mm)
      // Profundidade: zone.depth (mm de redução)
      
      // TODO: Implementar offloading
    }
  }
  
  /**
   * Aplica trimline (contorno de corte)
   */
  private applyTrimline(shape: THREE.Shape): void {
    const trimline = this.spec.trimline;
    
    // Cortar a forma conforme o estilo
    // 'full': palmilha completa
    // '3/4': 3/4 do comprimento
    // 'sulcus': corte no sulco metatarsal
    
    // TODO: Implementar trimline
  }
  
  /**
   * Cria malha 3D a partir da forma 2D
   */
  private createMeshFromShape(shape: THREE.Shape): THREE.BufferGeometry {
    // Extrudar a forma 2D para criar volume 3D
    const extrudeSettings = {
      depth: this.spec.thicknessMap.heel, // Espessura base
      bevelEnabled: true,
      bevelThickness: 1,
      bevelSize: 0.5,
      bevelSegments: 3,
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Aplicar espessuras variáveis por zona
    this.applyVariableThickness(geometry);
    
    return geometry;
  }
  
  /**
   * Aplica espessuras variáveis por zona
   */
  private applyVariableThickness(geometry: THREE.BufferGeometry): void {
    const thicknessMap = this.spec.thicknessMap;
    
    // Modificar vértices para criar espessuras diferentes
    // Calcanhar: thicknessMap.heel
    // Meio do pé: thicknessMap.midfoot
    // Antepé: thicknessMap.forefoot
    // Dedos: thicknessMap.toes
    
    // TODO: Implementar espessuras variáveis
  }
}
```

**Validação:**
```typescript
// lib/insoles/validators/geometry-validator.ts

import * as THREE from 'three';

export class GeometryValidator {
  /**
   * Valida se a geometria é válida para impressão 3D
   */
  public static validate(geometry: THREE.BufferGeometry): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 1. Verificar se é manifold (watertight)
    if (!this.isManifold(geometry)) {
      errors.push('Geometry is not manifold (has holes or non-manifold edges)');
    }
    
    // 2. Verificar normais
    if (!this.hasConsistentNormals(geometry)) {
      errors.push('Geometry has inconsistent normals');
    }
    
    // 3. Verificar tamanho
    const size = this.getSize(geometry);
    if (size.x < 100 || size.y < 200) {
      warnings.push('Geometry seems too small for a typical insole');
    }
    if (size.x > 150 || size.y > 350) {
      warnings.push('Geometry seems too large for a typical insole');
    }
    
    // 4. Verificar espessura mínima
    if (size.z < 2) {
      errors.push('Geometry is too thin (minimum 2mm required)');
    }
    
    // 5. Verificar número de triângulos
    const triangles = geometry.index ? geometry.index.count / 3 : 0;
    if (triangles > 100000) {
      warnings.push('Geometry has too many triangles (may be slow to process)');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  private static isManifold(geometry: THREE.BufferGeometry): boolean {
    // TODO: Implementar verificação de manifold
    // Verificar se cada aresta é compartilhada por exatamente 2 faces
    return true;
  }
  
  private static hasConsistentNormals(geometry: THREE.BufferGeometry): boolean {
    // TODO: Implementar verificação de normais
    // Todas as normais devem apontar para fora
    return true;
  }
  
  private static getSize(geometry: THREE.BufferGeometry): THREE.Vector3 {
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox!;
    return new THREE.Vector3(
      bbox.max.x - bbox.min.x,
      bbox.max.y - bbox.min.y,
      bbox.max.z - bbox.min.z
    );
  }
}
```

**Exportação para STL:**
```typescript
// lib/insoles/exporters/stl-exporter.ts

import * as THREE from 'three';

export class STLExporter {
  /**
   * Exporta geometria para STL binário
   */
  public static export(geometry: THREE.BufferGeometry): ArrayBuffer {
    // STL binário format:
    // 80 bytes: header
    // 4 bytes: número de triângulos (uint32)
    // Para cada triângulo:
    //   12 bytes: normal (3x float32)
    //   36 bytes: vértices (9x float32)
    //   2 bytes: attribute byte count (uint16)
    
    const triangles = geometry.index ? geometry.index.count / 3 : 0;
    const bufferSize = 80 + 4 + (triangles * 50);
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);
    
    // Header (80 bytes)
    const header = 'BPR Clinic - Custom Insole';
    for (let i = 0; i < 80; i++) {
      view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
    }
    
    // Número de triângulos
    view.setUint32(80, triangles, true);
    
    // Triângulos
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    const indices = geometry.index!;
    
    let offset = 84;
    for (let i = 0; i < triangles; i++) {
      const i1 = indices.getX(i * 3);
      const i2 = indices.getX(i * 3 + 1);
      const i3 = indices.getX(i * 3 + 2);
      
      // Normal
      const nx = normals.getX(i1);
      const ny = normals.getY(i1);
      const nz = normals.getZ(i1);
      view.setFloat32(offset, nx, true); offset += 4;
      view.setFloat32(offset, ny, true); offset += 4;
      view.setFloat32(offset, nz, true); offset += 4;
      
      // Vértice 1
      view.setFloat32(offset, positions.getX(i1), true); offset += 4;
      view.setFloat32(offset, positions.getY(i1), true); offset += 4;
      view.setFloat32(offset, positions.getZ(i1), true); offset += 4;
      
      // Vértice 2
      view.setFloat32(offset, positions.getX(i2), true); offset += 4;
      view.setFloat32(offset, positions.getY(i2), true); offset += 4;
      view.setFloat32(offset, positions.getZ(i2), true); offset += 4;
      
      // Vértice 3
      view.setFloat32(offset, positions.getX(i3), true); offset += 4;
      view.setFloat32(offset, positions.getY(i3), true); offset += 4;
      view.setFloat32(offset, positions.getZ(i3), true); offset += 4;
      
      // Attribute byte count
      view.setUint16(offset, 0, true); offset += 2;
    }
    
    return buffer;
  }
  
  /**
   * Salva STL em arquivo
   */
  public static async saveToFile(
    geometry: THREE.BufferGeometry,
    filename: string,
    uploadsDir: string
  ): Promise<string> {
    const stlBuffer = this.export(geometry);
    
    // Salvar em Railway Volume ou local
    const fs = require('fs').promises;
    const path = require('path');
    
    const fullPath = path.join(uploadsDir, filename);
    await fs.writeFile(fullPath, Buffer.from(stlBuffer));
    
    return `/uploads/${filename}`;
  }
}
```

**API Endpoint:**
```typescript
// app/api/foot-scans/[id]/generate-insoles/route.ts (ATUALIZADO)

import { InsoleMeshGenerator } from '@/lib/insoles/generators/mesh-generator';
import { GeometryValidator } from '@/lib/insoles/validators/geometry-validator';
import { STLExporter } from '@/lib/insoles/exporters/stl-exporter';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ... (código de autenticação e validação)
    
    // Buscar foot scan
    const footScan = await prisma.footScan.findUnique({
      where: { id: params.id },
      include: { patient: true }
    });
    
    if (!footScan || !footScan.insoleSpecs) {
      return NextResponse.json({ error: 'Specifications not found' }, { status: 400 });
    }
    
    const specs = footScan.insoleSpecs as InsoleSpecificationComplete;
    
    // GERAR PALMILHA ESQUERDA
    console.log('[Insoles] Generating left insole...');
    const leftGenerator = new InsoleMeshGenerator(specs.left);
    const leftGeometry = leftGenerator.generate();
    
    // Validar geometria
    const leftValidation = GeometryValidator.validate(leftGeometry);
    if (!leftValidation.valid) {
      return NextResponse.json({
        error: 'Left insole geometry validation failed',
        errors: leftValidation.errors
      }, { status: 400 });
    }
    
    // Exportar para STL
    const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads');
    const leftFilename = `${footScan.scanNumber}-left-insole.stl`;
    const leftInsoleUrl = await STLExporter.saveToFile(
      leftGeometry,
      leftFilename,
      uploadsDir
    );
    
    // GERAR PALMILHA DIREITA
    console.log('[Insoles] Generating right insole...');
    const rightGenerator = new InsoleMeshGenerator(specs.right);
    const rightGeometry = rightGenerator.generate();
    
    // Validar geometria
    const rightValidation = GeometryValidator.validate(rightGeometry);
    if (!rightValidation.valid) {
      return NextResponse.json({
        error: 'Right insole geometry validation failed',
        errors: rightValidation.errors
      }, { status: 400 });
    }
    
    // Exportar para STL
    const rightFilename = `${footScan.scanNumber}-right-insole.stl`;
    const rightInsoleUrl = await STLExporter.saveToFile(
      rightGeometry,
      rightFilename,
      uploadsDir
    );
    
    // Atualizar foot scan
    await prisma.footScan.update({
      where: { id: params.id },
      data: {
        leftInsoleSTL: leftInsoleUrl,
        rightInsoleSTL: rightInsoleUrl,
        status: 'COMPLETED',
        workflowStatus: 'INSOLES_GENERATED',
      }
    });
    
    return NextResponse.json({
      success: true,
      leftInsoleUrl,
      rightInsoleUrl,
      validation: {
        left: leftValidation,
        right: rightValidation,
      },
      message: 'Insoles generated successfully'
    });
    
  } catch (error) {
    console.error('[Insoles] Error:', error);
    return NextResponse.json({ error: 'Failed to generate insoles' }, { status: 500 });
  }
}
```

**Checklist Dia 1-2:**
- [ ] Instalar three.js e dependências
- [ ] Criar estrutura de pastas
- [ ] Implementar `InsoleMeshGenerator` (base)
- [ ] Implementar `GeometryValidator`
- [ ] Implementar `STLExporter`
- [ ] Atualizar endpoint de geração
- [ ] Testar com dados simples

---

#### **DIA 3-4: Implementar Geometrias Complexas**

**Tarefas:**
- [ ] Implementar `addArchSupport()` completo
- [ ] Implementar `addPosting()` completo
- [ ] Implementar `addHeelCup()` completo
- [ ] Implementar `addMetatarsalPad()` completo
- [ ] Implementar `applyOffloadingZones()` completo
- [ ] Implementar `applyTrimline()` completo
- [ ] Implementar `applyVariableThickness()` completo

**Código de Referência:**
```typescript
// Exemplo: addArchSupport() completo

private addArchSupport(shape: THREE.Shape): void {
  const arch = this.spec.archSupport;
  
  // Criar curva de elevação do arco
  const archCurve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(arch.position.x - arch.width/2, arch.position.y, 0),
    new THREE.Vector3(arch.position.x - arch.width/4, arch.position.y, arch.height * 0.7),
    new THREE.Vector3(arch.position.x + arch.width/4, arch.position.y, arch.height * 0.7),
    new THREE.Vector3(arch.position.x + arch.width/2, arch.position.y, 0)
  );
  
  // Aplicar curva à geometria
  // TODO: Modificar vértices da malha para seguir a curva
}
```

**Checklist Dia 3-4:**
- [ ] Todas as funções de geometria implementadas
- [ ] Testes com diferentes especificações
- [ ] Validação de cada componente
- [ ] Documentação inline

---

#### **DIA 5: Testes e Refinamento**

**Tarefas:**
- [ ] Testar geração com 10 especificações diferentes
- [ ] Validar STL gerados (abrir em software 3D)
- [ ] Corrigir bugs encontrados
- [ ] Otimizar performance
- [ ] Adicionar logs detalhados

**Software para Validação:**
- Blender (gratuito) - visualizar STL
- MeshLab (gratuito) - analisar malha
- Cura (gratuito) - simular impressão 3D

**Checklist Dia 5:**
- [ ] 10 STLs gerados com sucesso
- [ ] Todos validados em Blender
- [ ] Sem erros de geometria
- [ ] Performance <30s por palmilha
- [ ] Logs implementados

---

### **SEMANA 2: ESPECIFICAÇÃO TÉCNICA COMPLETA**

#### **DIA 6-7: Interface e Cálculos**

**Tarefas:**
```typescript
// types/insole.ts (CRIAR)

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D extends Point2D {
  z: number;
}

export interface InsoleSpecificationComplete {
  // Identificação
  footScanId: string;
  side: 'left' | 'right';
  
  // Geometria Base
  footLength: number;           // mm
  footWidth: number;            // mm
  heelWidth: number;            // mm
  foreFootWidth: number;        // mm
  
  // Curvaturas (Bezier curves)
  longitudinalArchCurve: {
    controlPoints: Point3D[];
    tension: number;            // 0-1
  };
  transverseArchCurve: {
    controlPoints: Point3D[];
    tension: number;
  };
  
  // Espessuras por Zona (mm)
  thicknessMap: {
    heel: number;               // 4-8mm
    midfoot: number;            // 3-6mm
    forefoot: number;           // 2-4mm
    toes: number;               // 1-3mm
  };
  
  // Suporte de Arco
  archSupport: {
    height: number;             // mm (0-15mm)
    position: Point2D;          // Coordenadas (mm do calcanhar)
    width: number;              // mm (20-50mm)
    slope: number;              // graus (5-20°)
  };
  
  // Posting (Cunhas)
  posting: {
    type: 'medial' | 'lateral' | 'none';
    angle: number;              // graus (0-8°)
    length: number;             // mm (extensão da cunha)
    material: string;           // "EVA 70 Shore A"
  };
  
  // Heel Cup
  heelCup: {
    depth: number;              // mm (10-20mm)
    width: number;              // mm (50-80mm)
    angle: number;              // graus (8-15°)
  };
  
  // Metatarsal Pad
  metatarsalPad?: {
    enabled: boolean;
    height: number;             // mm (2-5mm)
    position: Point2D;          // Coordenadas
    diameter: number;           // mm (20-35mm)
  };
  
  // Zonas de Offloading
  offloadingZones: Array<{
    location: Point2D;
    radius: number;             // mm
    depth: number;              // mm de redução (1-3mm)
    reason: string;             // "Hallux valgus", "Metatarsalgia"
  }>;
  
  // Trimline (Contorno)
  trimline: {
    style: 'full' | '3/4' | 'sulcus';
    coordinates: Point2D[];     // Pontos do contorno
  };
  
  // Materiais
  materials: {
    topCover: string;           // "EVA", "Leather", "Microfiber"
    baseLayer: string;          // "EVA 40 Shore A", "PU 60 Shore A"
    archFiller: string;         // "Cork", "EVA 60 Shore A"
    posting: string;            // "EVA 70 Shore A", "Rigid plastic"
  };
  
  // Compatibilidade com Calçado
  shoeCompatibility: {
    type: string[];             // ["Running", "Casual", "Dress"]
    minimalVolumeRequired: number; // mm³
  };
  
  // Manufatura
  manufacturing: {
    method: 'CNC' | '3D_PRINT' | 'VACUUM_FORM';
    tolerance: number;          // mm (±0.5mm típico)
    finishingRequired: string[];
    estimatedTime: number;      // minutos
  };
  
  // Validação
  validation: {
    geometryValid: boolean;
    printable: boolean;
    warnings: string[];
  };
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  version: number;
}
```

**Função de Cálculo Automático:**
```typescript
// lib/insoles/spec-calculator.ts (CRIAR)

import { FootScan } from '@prisma/client';
import { InsoleSpecificationComplete } from '@/types/insole';

export class InsoleSpecCalculator {
  /**
   * Calcula especificação completa baseada no foot scan
   */
  public static calculate(footScan: FootScan): InsoleSpecificationComplete {
    // Extrair dados do foot scan
    const {
      leftFootLength,
      rightFootLength,
      leftFootWidth,
      rightFootWidth,
      archType,
      pronation,
      calcanealAlignment,
      halluxValgusAngle,
    } = footScan;
    
    // Calcular para pé esquerdo
    const leftSpec = this.calculateSide({
      side: 'left',
      footLength: leftFootLength || 260,
      footWidth: leftFootWidth || 100,
      archType,
      pronation,
      calcanealAlignment,
      halluxValgusAngle,
    });
    
    // Calcular para pé direito
    const rightSpec = this.calculateSide({
      side: 'right',
      footLength: rightFootLength || 260,
      footWidth: rightFootWidth || 100,
      archType,
      pronation,
      calcanealAlignment,
      halluxValgusAngle,
    });
    
    return {
      left: leftSpec,
      right: rightSpec,
    };
  }
  
  private static calculateSide(params: {
    side: 'left' | 'right';
    footLength: number;
    footWidth: number;
    archType: string | null;
    pronation: string | null;
    calcanealAlignment: number | null;
    halluxValgusAngle: number | null;
  }): InsoleSpecificationComplete {
    
    const { footLength, footWidth, archType, pronation, calcanealAlignment, halluxValgusAngle } = params;
    
    // CALCULAR SUPORTE DE ARCO
    let archHeight = 6; // mm (padrão)
    if (archType === 'Flat') {
      archHeight = 10; // Arco mais alto para pé plano
    } else if (archType === 'High') {
      archHeight = 4; // Arco mais baixo para pé cavo
    }
    
    // CALCULAR POSTING
    let postingType: 'medial' | 'lateral' | 'none' = 'none';
    let postingAngle = 0;
    
    if (pronation === 'Overpronation') {
      postingType = 'medial';
      postingAngle = Math.min(Math.abs(calcanealAlignment || 0) * 0.5, 6);
    } else if (pronation === 'Supination') {
      postingType = 'lateral';
      postingAngle = Math.min(Math.abs(calcanealAlignment || 0) * 0.5, 6);
    }
    
    // CALCULAR METATARSAL PAD
    const needsMetatarsalPad = halluxValgusAngle && halluxValgusAngle > 15;
    
    // CALCULAR OFFLOADING ZONES
    const offloadingZones: Array<{
      location: Point2D;
      radius: number;
      depth: number;
      reason: string;
    }> = [];
    
    if (halluxValgusAngle && halluxValgusAngle > 20) {
      offloadingZones.push({
        location: { x: footWidth * 0.2, y: footLength * 0.85 },
        radius: 15,
        depth: 2,
        reason: 'Hallux valgus',
      });
    }
    
    // MONTAR ESPECIFICAÇÃO COMPLETA
    const spec: InsoleSpecificationComplete = {
      footScanId: '',
      side: params.side,
      
      // Geometria
      footLength,
      footWidth,
      heelWidth: footWidth * 0.65,
      foreFootWidth: footWidth * 0.95,
      
      // Curvaturas (valores padrão - podem ser ajustados)
      longitudinalArchCurve: {
        controlPoints: [
          { x: 0, y: 0, z: 0 },
          { x: footLength * 0.3, y: 0, z: archHeight * 0.5 },
          { x: footLength * 0.5, y: 0, z: archHeight },
          { x: footLength * 0.7, y: 0, z: archHeight * 0.3 },
          { x: footLength, y: 0, z: 0 },
        ],
        tension: 0.5,
      },
      transverseArchCurve: {
        controlPoints: [
          { x: 0, y: 0, z: 0 },
          { x: footWidth * 0.3, y: 0, z: 2 },
          { x: footWidth * 0.5, y: 0, z: 3 },
          { x: footWidth * 0.7, y: 0, z: 2 },
          { x: footWidth, y: 0, z: 0 },
        ],
        tension: 0.5,
      },
      
      // Espessuras
      thicknessMap: {
        heel: 6,
        midfoot: 4,
        forefoot: 3,
        toes: 2,
      },
      
      // Suporte de arco
      archSupport: {
        height: archHeight,
        position: { x: footWidth * 0.4, y: footLength * 0.45 },
        width: 35,
        slope: 15,
      },
      
      // Posting
      posting: {
        type: postingType,
        angle: postingAngle,
        length: 60,
        material: 'EVA 70 Shore A',
      },
      
      // Heel cup
      heelCup: {
        depth: 15,
        width: footWidth * 0.7,
        angle: 12,
      },
      
      // Metatarsal pad
      metatarsalPad: needsMetatarsalPad ? {
        enabled: true,
        height: 3,
        position: { x: footWidth * 0.5, y: footLength * 0.65 },
        diameter: 25,
      } : undefined,
      
      // Offloading zones
      offloadingZones,
      
      // Trimline
      trimline: {
        style: '3/4',
        coordinates: [], // TODO: Calcular pontos do contorno
      },
      
      // Materiais
      materials: {
        topCover: 'Microfiber',
        baseLayer: 'EVA 40 Shore A',
        archFiller: 'EVA 60 Shore A',
        posting: 'EVA 70 Shore A',
      },
      
      // Compatibilidade
      shoeCompatibility: {
        type: ['Running', 'Casual'],
        minimalVolumeRequired: 50000, // mm³
      },
      
      // Manufatura
      manufacturing: {
        method: '3D_PRINT',
        tolerance: 0.5,
        finishingRequired: ['Sanding', 'Sealing'],
        estimatedTime: 45,
      },
      
      // Validação
      validation: {
        geometryValid: true,
        printable: true,
        warnings: [],
      },
      
      // Metadata
      createdAt: new Date(),
      createdBy: 'system',
      version: 1,
    };
    
    return spec;
  }
}
```

**Checklist Dia 6-7:**
- [ ] Interface `InsoleSpecificationComplete` criada
- [ ] `InsoleSpecCalculator` implementado
- [ ] Testes com diferentes foot scans
- [ ] Validação de todos os campos
- [ ] Documentação completa

---

---

## 📚 DOCUMENTAÇÃO DETALHADA POR FASE

Este roadmap está dividido em documentos detalhados para facilitar a navegação:

### **Fase 1: Sistema de Palmilhas (Semanas 1-3)**
📄 **Documento:** `roadmap/FASE_1_PALMILHAS.md`
- Semana 1: Geração real de STL
- Semana 2: Especificação técnica completa
- Semana 3: Relatórios de manufatura

### **Fase 2: Portal do Paciente (Semanas 4-5)**
📄 **Documento:** `roadmap/FASE_2_PORTAL_PACIENTE.md`
- Semana 4: Visualização 3D + Timeline
- Semana 5: Instruções + Comparações

### **Fase 3: Testes e Validação (Semanas 6-7)**
📄 **Documento:** `roadmap/FASE_3_TESTES.md`
- Semana 6: Testes unitários + integração
- Semana 7: Testes E2E + UAT

### **Fase 4: Documentação e Treinamento (Semana 8)**
📄 **Documento:** `roadmap/FASE_4_DOCUMENTACAO.md`
- Manuais de usuário
- Vídeos tutoriais
- Onboarding automatizado

### **Fase 5: Lançamento e Monitoramento (Contínuo)**
📄 **Documento:** `roadmap/FASE_5_LANCAMENTO.md`
- Checklist de lançamento
- Monitoramento
- Suporte

---

## ✅ CHECKLIST GERAL

### **Pré-requisitos:**
- [ ] Ambiente de desenvolvimento configurado
- [ ] Acesso ao Railway (produção)
- [ ] API keys configuradas (Groq, Minimax, Gemini)
- [ ] Stripe configurado
- [ ] Domínio configurado (bpr.rehab)

### **Fase 1 (Semanas 1-3):**
- [ ] Geração de STL funcional
- [ ] Especificação técnica completa
- [ ] Relatórios de manufatura
- [ ] Testes com impressora 3D real

### **Fase 2 (Semanas 4-5):**
- [ ] Visualizador 3D implementado
- [ ] Timeline de produção
- [ ] Instruções de uso
- [ ] Comparações com scans anteriores

### **Fase 3 (Semanas 6-7):**
- [ ] Testes unitários (>80% coverage)
- [ ] Testes de integração
- [ ] Testes E2E (Playwright)
- [ ] UAT com usuários reais

### **Fase 4 (Semana 8):**
- [ ] Manual do paciente
- [ ] Manual do terapeuta
- [ ] Vídeos tutoriais
- [ ] Onboarding automatizado

### **Fase 5 (Lançamento):**
- [ ] Deploy em produção
- [ ] Monitoramento ativo
- [ ] Suporte configurado
- [ ] Backup automático

---

## 📊 MÉTRICAS DE SUCESSO

### **Técnicas:**
- ✅ STL gerado em <30s
- ✅ Geometria válida em 100% dos casos
- ✅ Relatório técnico em <10s
- ✅ Uptime >99.5%
- ✅ Tempo de resposta <2s

### **Qualidade:**
- ✅ Cobertura de testes >80%
- ✅ Zero bugs críticos
- ✅ Precisão biomecânica >95%
- ✅ Satisfação do usuário >90%

### **Negócio:**
- ✅ Tempo de produção <7 dias
- ✅ Taxa de retrabalho <5%
- ✅ Custo por palmilha <£50
- ✅ ROI >150%

---

## 💰 INVESTIMENTO TOTAL

| Fase | Duração | Investimento | ROI Esperado |
|------|---------|--------------|--------------|
| Fase 1 | 3 semanas | £2,700 | Produção real de palmilhas |
| Fase 2 | 2 semanas | £1,600 | Experiência do paciente |
| Fase 3 | 2 semanas | £1,600 | Qualidade e confiabilidade |
| Fase 4 | 1 semana | £800 | Redução de suporte |
| **TOTAL** | **8 semanas** | **£6,700** | **Payback: 4-6 meses** |

---

## 🎯 PRÓXIMOS PASSOS

### **Hoje:**
1. Revisar este roadmap completo
2. Ler documentos detalhados de cada fase
3. Decidir: começar Fase 1 ou contratar desenvolvedor?

### **Esta Semana:**
1. Se implementar in-house: começar Semana 1 (Geração de STL)
2. Se terceirizar: buscar desenvolvedor especializado
3. Preparar ambiente de desenvolvimento

### **Este Mês:**
1. Completar Fase 1 (Sistema de Palmilhas)
2. Testar com impressora 3D real
3. Validar com pacientes beta

---

**Este é o roadmap master. Consulte os documentos detalhados em `roadmap/` para instruções passo a passo de cada fase.**
