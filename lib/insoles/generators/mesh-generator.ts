/**
 * Gerador de Malha 3D para Palmilhas Personalizadas
 * Usa Three.js para criar geometria 3D baseada em especificações biomecânicas
 */

import * as THREE from 'three';
import { InsoleSpecification, Point2D } from '@/types/insole';

export class InsoleMeshGenerator {
  private spec: InsoleSpecification;
  private geometry: THREE.BufferGeometry;
  
  constructor(spec: InsoleSpecification) {
    this.spec = spec;
    this.geometry = new THREE.BufferGeometry();
  }
  
  /**
   * Gera a malha 3D completa da palmilha
   */
  public generate(): THREE.BufferGeometry {
    console.log(`[MeshGen] Generating insole for ${this.spec.side} foot...`);
    
    // 1. Criar forma base (footprint)
    const baseShape = this.createBaseShape();
    
    // 2. Extrudar para criar volume 3D
    let geometry = this.extrudeShape(baseShape);
    
    // 3. Aplicar modificações
    geometry = this.applyArchSupport(geometry);
    geometry = this.applyPosting(geometry);
    geometry = this.applyHeelCup(geometry);
    
    if (this.spec.metatarsalPad?.enabled) {
      geometry = this.applyMetatarsalPad(geometry);
    }
    
    geometry = this.applyOffloadingZones(geometry);
    geometry = this.applyVariableThickness(geometry);
    
    // 4. Finalizar geometria
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    this.geometry = geometry;
    
    console.log(`[MeshGen] Insole generated successfully`);
    return this.geometry;
  }
  
  /**
   * Cria a forma base da palmilha (contorno do pé)
   */
  private createBaseShape(): THREE.Shape {
    const shape = new THREE.Shape();
    
    const { footLength, footWidth, heelWidth, foreFootWidth } = this.spec;
    
    // Criar contorno simplificado do pé
    // Em produção, isso seria baseado em scan 3D real
    
    // Começar no calcanhar (centro traseiro)
    shape.moveTo(0, 0);
    
    // Lado medial (interno)
    shape.lineTo(heelWidth * 0.2, footLength * 0.2); // Arco medial
    shape.quadraticCurveTo(
      heelWidth * 0.25, footLength * 0.5,  // Ponto de controle
      foreFootWidth * 0.3, footLength * 0.8 // Antepé medial
    );
    shape.lineTo(foreFootWidth * 0.4, footLength * 0.95); // Dedos medial
    
    // Ponta dos dedos
    shape.quadraticCurveTo(
      foreFootWidth * 0.5, footLength,     // Ponto de controle
      foreFootWidth * 0.6, footLength * 0.95 // Dedos lateral
    );
    
    // Lado lateral (externo)
    shape.lineTo(foreFootWidth * 0.7, footLength * 0.8); // Antepé lateral
    shape.quadraticCurveTo(
      heelWidth * 0.75, footLength * 0.5,  // Ponto de controle
      heelWidth * 0.8, footLength * 0.2    // Arco lateral
    );
    shape.lineTo(heelWidth, 0); // Calcanhar lateral
    
    // Fechar no calcanhar
    shape.quadraticCurveTo(
      heelWidth * 0.5, -heelWidth * 0.1,   // Ponto de controle
      0, 0                                  // Volta ao início
    );
    
    return shape;
  }
  
  /**
   * Extrudar forma 2D para criar volume 3D
   */
  private extrudeShape(shape: THREE.Shape): THREE.BufferGeometry {
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: this.spec.thicknessMap.heel,
      bevelEnabled: true,
      bevelThickness: 0.5,
      bevelSize: 0.3,
      bevelSegments: 2,
      steps: 1,
      curveSegments: 24,
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }
  
  /**
   * Aplica suporte de arco à geometria
   */
  private applyArchSupport(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    const { archSupport } = this.spec;
    
    // Modificar vértices para criar elevação no arco
    const positions = geometry.attributes.position;
    const archCenter = archSupport.position;
    const archRadius = archSupport.width / 2;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      // Calcular distância do ponto ao centro do arco
      const dx = x - archCenter.x;
      const dy = y - archCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Se está dentro da área do arco, elevar
      if (distance < archRadius) {
        const influence = 1 - (distance / archRadius); // 1 no centro, 0 na borda
        const elevation = archSupport.height * influence * Math.cos(influence * Math.PI / 2);
        positions.setZ(i, z + elevation);
      }
    }
    
    positions.needsUpdate = true;
    return geometry;
  }
  
  /**
   * Aplica posting (cunha medial ou lateral)
   */
  private applyPosting(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    const { posting } = this.spec;
    
    if (posting.type === 'none') return geometry;
    
    const positions = geometry.attributes.position;
    const postingLength = posting.length;
    const angleRad = (posting.angle * Math.PI) / 180;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      // Aplicar cunha apenas na parte traseira (calcanhar)
      if (y < postingLength) {
        const influence = 1 - (y / postingLength); // 1 no calcanhar, 0 na frente
        
        if (posting.type === 'medial') {
          // Elevar lado medial (interno)
          const medialInfluence = x < (this.spec.footWidth / 2) ? influence : 0;
          const elevation = Math.tan(angleRad) * y * medialInfluence;
          positions.setZ(i, z + elevation);
        } else if (posting.type === 'lateral') {
          // Elevar lado lateral (externo)
          const lateralInfluence = x > (this.spec.footWidth / 2) ? influence : 0;
          const elevation = Math.tan(angleRad) * y * lateralInfluence;
          positions.setZ(i, z + elevation);
        }
      }
    }
    
    positions.needsUpdate = true;
    return geometry;
  }
  
  /**
   * Aplica heel cup (depressão no calcanhar)
   */
  private applyHeelCup(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    const { heelCup } = this.spec;
    const positions = geometry.attributes.position;
    
    const heelCenter = { x: this.spec.heelWidth / 2, y: 0 };
    const heelRadius = heelCup.width / 2;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      // Calcular distância do ponto ao centro do calcanhar
      const dx = x - heelCenter.x;
      const dy = y - heelCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Se está dentro da área do heel cup, criar depressão
      if (distance < heelRadius && y < heelRadius) {
        const influence = 1 - (distance / heelRadius);
        const depression = heelCup.depth * influence * Math.cos(influence * Math.PI / 2);
        positions.setZ(i, z - depression);
      }
    }
    
    positions.needsUpdate = true;
    return geometry;
  }
  
  /**
   * Aplica metatarsal pad (elevação)
   */
  private applyMetatarsalPad(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    const pad = this.spec.metatarsalPad!;
    const positions = geometry.attributes.position;
    
    const padRadius = pad.diameter / 2;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      // Calcular distância do ponto ao centro do pad
      const dx = x - pad.position.x;
      const dy = y - pad.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Se está dentro da área do pad, elevar
      if (distance < padRadius) {
        const influence = 1 - (distance / padRadius);
        const elevation = pad.height * influence * Math.cos(influence * Math.PI / 2);
        positions.setZ(i, z + elevation);
      }
    }
    
    positions.needsUpdate = true;
    return geometry;
  }
  
  /**
   * Aplica zonas de offloading (redução de pressão)
   */
  private applyOffloadingZones(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    const positions = geometry.attributes.position;
    
    for (const zone of this.spec.offloadingZones) {
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        
        // Calcular distância do ponto à zona
        const dx = x - zone.location.x;
        const dy = y - zone.location.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Se está dentro da zona, reduzir espessura
        if (distance < zone.radius) {
          const influence = 1 - (distance / zone.radius);
          const reduction = zone.depth * influence * Math.cos(influence * Math.PI / 2);
          positions.setZ(i, z - reduction);
        }
      }
    }
    
    positions.needsUpdate = true;
    return geometry;
  }
  
  /**
   * Aplica espessuras variáveis por zona
   */
  private applyVariableThickness(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    const positions = geometry.attributes.position;
    const { thicknessMap, footLength } = this.spec;
    
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      // Determinar zona baseada na posição Y
      let targetThickness: number;
      
      if (y < footLength * 0.25) {
        // Calcanhar
        targetThickness = thicknessMap.heel;
      } else if (y < footLength * 0.5) {
        // Meio do pé
        targetThickness = thicknessMap.midfoot;
      } else if (y < footLength * 0.85) {
        // Antepé
        targetThickness = thicknessMap.forefoot;
      } else {
        // Dedos
        targetThickness = thicknessMap.toes;
      }
      
      // Ajustar espessura (simplificado - em produção seria mais sofisticado)
      const currentThickness = z;
      const adjustment = (targetThickness - thicknessMap.heel) * 0.5;
      positions.setZ(i, currentThickness + adjustment);
    }
    
    positions.needsUpdate = true;
    return geometry;
  }
  
  /**
   * Retorna a geometria gerada
   */
  public getGeometry(): THREE.BufferGeometry {
    return this.geometry;
  }
}
