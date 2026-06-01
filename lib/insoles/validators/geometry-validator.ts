/**
 * Validador de Geometria 3D
 * Verifica se a malha gerada é válida para impressão 3D
 */

import * as THREE from 'three';
import { GeometryValidationResult } from '@/types/insole';

export class GeometryValidator {
  /**
   * Valida se a geometria é válida para impressão 3D
   */
  public static validate(geometry: THREE.BufferGeometry): GeometryValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    console.log('[Validator] Validating geometry...');
    
    // 1. Verificar se geometria existe
    if (!geometry || !geometry.attributes.position) {
      errors.push('Geometry is null or has no position attribute');
      return { valid: false, errors, warnings };
    }
    
    // 2. Verificar número de vértices
    const vertexCount = geometry.attributes.position.count;
    if (vertexCount === 0) {
      errors.push('Geometry has no vertices');
      return { valid: false, errors, warnings };
    }
    
    if (vertexCount < 100) {
      warnings.push(`Geometry has very few vertices (${vertexCount}). May not be detailed enough.`);
    }
    
    // 3. Verificar índices (triângulos)
    const triangleCount = geometry.index ? geometry.index.count / 3 : 0;
    if (triangleCount === 0) {
      errors.push('Geometry has no triangles');
      return { valid: false, errors, warnings };
    }
    
    if (triangleCount > 100000) {
      warnings.push(`Geometry has many triangles (${triangleCount}). May be slow to process.`);
    }
    
    // 4. Verificar bounding box (tamanho)
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox!;
    const size = {
      x: bbox.max.x - bbox.min.x,
      y: bbox.max.y - bbox.min.y,
      z: bbox.max.z - bbox.min.z,
    };
    
    // Verificar se tamanho é razoável para uma palmilha (mm)
    if (size.x < 50 || size.y < 150) {
      warnings.push(`Geometry seems too small: ${size.x.toFixed(1)}mm x ${size.y.toFixed(1)}mm`);
    }
    
    if (size.x > 200 || size.y > 400) {
      warnings.push(`Geometry seems too large: ${size.x.toFixed(1)}mm x ${size.y.toFixed(1)}mm`);
    }
    
    if (size.z < 1) {
      errors.push(`Geometry is too thin: ${size.z.toFixed(1)}mm (minimum 1mm required)`);
    }
    
    if (size.z > 20) {
      warnings.push(`Geometry is very thick: ${size.z.toFixed(1)}mm`);
    }
    
    // 5. Verificar normais
    if (!geometry.attributes.normal) {
      warnings.push('Geometry has no normals. Computing normals...');
      geometry.computeVertexNormals();
    }
    
    // 6. Verificar se há NaN ou Infinity
    const positions = geometry.attributes.position;
    let hasInvalidValues = false;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
        hasInvalidValues = true;
        break;
      }
    }
    
    if (hasInvalidValues) {
      errors.push('Geometry contains NaN or Infinity values');
    }
    
    // 7. Calcular volume (aproximado)
    let volume = 0;
    if (geometry.index) {
      const indices = geometry.index;
      for (let i = 0; i < indices.count; i += 3) {
        const i1 = indices.getX(i);
        const i2 = indices.getX(i + 1);
        const i3 = indices.getX(i + 2);
        
        const v1 = new THREE.Vector3(
          positions.getX(i1),
          positions.getY(i1),
          positions.getZ(i1)
        );
        const v2 = new THREE.Vector3(
          positions.getX(i2),
          positions.getY(i2),
          positions.getZ(i2)
        );
        const v3 = new THREE.Vector3(
          positions.getX(i3),
          positions.getY(i3),
          positions.getZ(i3)
        );
        
        // Volume do tetraedro formado pela origem e o triângulo
        volume += v1.dot(v2.cross(v3)) / 6;
      }
    }
    
    volume = Math.abs(volume);
    
    if (volume < 1000) {
      warnings.push(`Geometry has very small volume: ${volume.toFixed(0)}mm³`);
    }
    
    // 8. Resultado final
    const valid = errors.length === 0;
    
    const result: GeometryValidationResult = {
      valid,
      errors,
      warnings,
      metrics: {
        triangleCount,
        size,
        volume,
      },
    };
    
    if (valid) {
      console.log('[Validator] ✓ Geometry is valid');
    } else {
      console.error('[Validator] ✗ Geometry validation failed:', errors);
    }
    
    if (warnings.length > 0) {
      console.warn('[Validator] Warnings:', warnings);
    }
    
    return result;
  }
  
  /**
   * Verifica se a geometria é manifold (watertight)
   * Simplificado - em produção seria mais rigoroso
   */
  public static isManifold(geometry: THREE.BufferGeometry): boolean {
    // TODO: Implementar verificação completa de manifold
    // Por enquanto, assumimos que é manifold se tem índices
    return geometry.index !== null;
  }
  
  /**
   * Verifica se as normais são consistentes
   */
  public static hasConsistentNormals(geometry: THREE.BufferGeometry): boolean {
    if (!geometry.attributes.normal) {
      return false;
    }
    
    // TODO: Implementar verificação de consistência de normais
    // Por enquanto, assumimos que são consistentes
    return true;
  }
}
