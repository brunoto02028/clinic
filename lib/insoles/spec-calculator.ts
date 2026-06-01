/**
 * Calculador de Especificações de Palmilhas
 * Gera especificações automáticas baseadas em análise biomecânica
 */

import { InsoleSpecification } from '@/types/insole';

interface FootScanData {
  id: string;
  side: 'left' | 'right';
  footLength: number;
  footWidth: number;
  archType: string | null;
  archIndex: number | null;
  pronation: string | null;
  calcanealAlignment: number | null;
  halluxValgusAngle: number | null;
  metatarsalSpread: number | null;
  navicularHeight: number | null;
}

export class InsoleSpecCalculator {
  /**
   * Calcula especificação completa baseada no foot scan
   */
  public static calculate(scanData: FootScanData): InsoleSpecification {
    console.log(`[SpecCalc] Calculating specification for ${scanData.side} foot...`);
    
    const {
      id,
      side,
      footLength,
      footWidth,
      archType,
      pronation,
      calcanealAlignment,
      halluxValgusAngle,
    } = scanData;
    
    // CALCULAR SUPORTE DE ARCO
    const archHeight = this.calculateArchHeight(archType);
    
    // CALCULAR POSTING
    const posting = this.calculatePosting(pronation, calcanealAlignment);
    
    // CALCULAR METATARSAL PAD
    const metatarsalPad = this.calculateMetatarsalPad(halluxValgusAngle);
    
    // CALCULAR OFFLOADING ZONES
    const offloadingZones = this.calculateOffloadingZones(
      halluxValgusAngle,
      footLength,
      footWidth
    );
    
    // MONTAR ESPECIFICAÇÃO COMPLETA
    const spec: InsoleSpecification = {
      footScanId: id,
      side,
      
      // Geometria Base
      footLength,
      footWidth,
      heelWidth: footWidth * 0.65,
      foreFootWidth: footWidth * 0.95,
      
      // Espessuras
      thicknessMap: {
        heel: 6,
        midfoot: 4,
        forefoot: 3,
        toes: 2,
      },
      
      // Suporte de Arco
      archSupport: {
        height: archHeight,
        position: {
          x: footWidth * 0.4,
          y: footLength * 0.45,
        },
        width: 35,
        slope: 15,
      },
      
      // Posting
      posting,
      
      // Heel Cup
      heelCup: {
        depth: 15,
        width: footWidth * 0.7,
        angle: 12,
      },
      
      // Metatarsal Pad
      metatarsalPad,
      
      // Offloading Zones
      offloadingZones,
      
      // Trimline
      trimline: {
        style: '3/4',
        coordinates: [], // Será calculado pelo gerador
      },
      
      // Materiais
      materials: {
        topCover: 'Microfiber',
        baseLayer: 'EVA 40 Shore A',
        archFiller: 'EVA 60 Shore A',
        posting: 'EVA 70 Shore A',
      },
      
      // Manufatura
      manufacturing: {
        method: '3D_PRINT',
        tolerance: 0.5,
        estimatedTime: 45,
      },
      
      // Validação
      validation: {
        geometryValid: true,
        printable: true,
        warnings: [],
      },
    };
    
    console.log(`[SpecCalc] ✓ Specification calculated`);
    console.log(`[SpecCalc]   - Arch height: ${archHeight}mm`);
    console.log(`[SpecCalc]   - Posting: ${posting.type} ${posting.angle}°`);
    console.log(`[SpecCalc]   - Metatarsal pad: ${metatarsalPad?.enabled ? 'Yes' : 'No'}`);
    console.log(`[SpecCalc]   - Offloading zones: ${offloadingZones.length}`);
    
    return spec;
  }
  
  /**
   * Calcula altura do suporte de arco baseado no tipo de arco
   */
  private static calculateArchHeight(archType: string | null): number {
    if (!archType) return 6; // Padrão
    
    switch (archType.toLowerCase()) {
      case 'flat':
      case 'low':
        return 10; // Arco mais alto para pé plano
      
      case 'high':
      case 'cavus':
        return 4; // Arco mais baixo para pé cavo
      
      case 'normal':
      default:
        return 6; // Arco padrão
    }
  }
  
  /**
   * Calcula posting (cunha) baseado em pronação e alinhamento
   */
  private static calculatePosting(
    pronation: string | null,
    calcanealAlignment: number | null
  ): InsoleSpecification['posting'] {
    let type: 'medial' | 'lateral' | 'none' = 'none';
    let angle = 0;
    
    if (!pronation) {
      return { type, angle, length: 60, material: 'EVA 70 Shore A' };
    }
    
    switch (pronation.toLowerCase()) {
      case 'overpronation':
      case 'pronation':
        type = 'medial';
        // Ângulo baseado no alinhamento do calcanhar
        angle = calcanealAlignment
          ? Math.min(Math.abs(calcanealAlignment) * 0.5, 6)
          : 4;
        break;
      
      case 'supination':
      case 'underpronation':
        type = 'lateral';
        angle = calcanealAlignment
          ? Math.min(Math.abs(calcanealAlignment) * 0.5, 6)
          : 4;
        break;
      
      case 'neutral':
      default:
        type = 'none';
        angle = 0;
        break;
    }
    
    return {
      type,
      angle,
      length: 60,
      material: 'EVA 70 Shore A',
    };
  }
  
  /**
   * Calcula metatarsal pad baseado em hallux valgus
   */
  private static calculateMetatarsalPad(
    halluxValgusAngle: number | null
  ): InsoleSpecification['metatarsalPad'] {
    if (!halluxValgusAngle || halluxValgusAngle < 15) {
      return undefined; // Não precisa de metatarsal pad
    }
    
    // Altura baseada na severidade do hallux valgus
    let height = 3;
    if (halluxValgusAngle > 30) {
      height = 5; // Severo
    } else if (halluxValgusAngle > 20) {
      height = 4; // Moderado
    }
    
    return {
      enabled: true,
      height,
      position: { x: 50, y: 165 }, // Posição típica (será ajustada pelo gerador)
      diameter: 25,
    };
  }
  
  /**
   * Calcula zonas de offloading baseado em patologias
   */
  private static calculateOffloadingZones(
    halluxValgusAngle: number | null,
    footLength: number,
    footWidth: number
  ): InsoleSpecification['offloadingZones'] {
    const zones: InsoleSpecification['offloadingZones'] = [];
    
    // Offloading para hallux valgus severo
    if (halluxValgusAngle && halluxValgusAngle > 20) {
      zones.push({
        location: {
          x: footWidth * 0.2,
          y: footLength * 0.85,
        },
        radius: 15,
        depth: 2,
        reason: 'Hallux valgus',
      });
    }
    
    // Adicionar mais zonas conforme outras patologias forem detectadas
    // TODO: Adicionar offloading para metatarsalgia, fascite plantar, etc
    
    return zones;
  }
  
  /**
   * Calcula especificações para ambos os pés
   */
  public static calculateBoth(
    leftScan: FootScanData,
    rightScan: FootScanData
  ): {
    left: InsoleSpecification;
    right: InsoleSpecification;
  } {
    return {
      left: this.calculate(leftScan),
      right: this.calculate(rightScan),
    };
  }
}
