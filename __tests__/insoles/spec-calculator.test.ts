/**
 * Testes para InsoleSpecCalculator
 */

import { InsoleSpecCalculator } from '@/lib/insoles/spec-calculator';

describe('InsoleSpecCalculator', () => {
  const mockScanData = {
    id: 'test-scan-1',
    side: 'left' as const,
    footLength: 260,
    footWidth: 100,
    archType: 'Normal',
    archIndex: 0.3,
    pronation: 'Neutral',
    calcanealAlignment: 0,
    halluxValgusAngle: 10,
    metatarsalSpread: null,
    navicularHeight: null,
  };

  describe('calculate', () => {
    it('should calculate specification for normal foot', () => {
      const spec = InsoleSpecCalculator.calculate(mockScanData);

      expect(spec).toBeDefined();
      expect(spec.footScanId).toBe('test-scan-1');
      expect(spec.side).toBe('left');
      expect(spec.footLength).toBe(260);
      expect(spec.footWidth).toBe(100);
    });

    it('should calculate correct arch height for flat foot', () => {
      const flatFootData = { ...mockScanData, archType: 'Flat' };
      const spec = InsoleSpecCalculator.calculate(flatFootData);

      expect(spec.archSupport.height).toBe(10); // Maior para pé plano
    });

    it('should calculate correct arch height for high arch', () => {
      const highArchData = { ...mockScanData, archType: 'High' };
      const spec = InsoleSpecCalculator.calculate(highArchData);

      expect(spec.archSupport.height).toBe(4); // Menor para pé cavo
    });

    it('should calculate medial posting for overpronation', () => {
      const overpronationData = {
        ...mockScanData,
        pronation: 'Overpronation',
        calcanealAlignment: -8,
      };
      const spec = InsoleSpecCalculator.calculate(overpronationData);

      expect(spec.posting.type).toBe('medial');
      expect(spec.posting.angle).toBeGreaterThan(0);
      expect(spec.posting.angle).toBeLessThanOrEqual(6);
    });

    it('should calculate lateral posting for supination', () => {
      const supinationData = {
        ...mockScanData,
        pronation: 'Supination',
        calcanealAlignment: 8,
      };
      const spec = InsoleSpecCalculator.calculate(supinationData);

      expect(spec.posting.type).toBe('lateral');
      expect(spec.posting.angle).toBeGreaterThan(0);
    });

    it('should not add metatarsal pad for mild hallux valgus', () => {
      const mildHalluxData = { ...mockScanData, halluxValgusAngle: 12 };
      const spec = InsoleSpecCalculator.calculate(mildHalluxData);

      expect(spec.metatarsalPad).toBeUndefined();
    });

    it('should add metatarsal pad for moderate hallux valgus', () => {
      const moderateHalluxData = { ...mockScanData, halluxValgusAngle: 25 };
      const spec = InsoleSpecCalculator.calculate(moderateHalluxData);

      expect(spec.metatarsalPad).toBeDefined();
      expect(spec.metatarsalPad?.enabled).toBe(true);
      expect(spec.metatarsalPad?.height).toBeGreaterThan(0);
    });

    it('should add offloading zone for severe hallux valgus', () => {
      const severeHalluxData = { ...mockScanData, halluxValgusAngle: 30 };
      const spec = InsoleSpecCalculator.calculate(severeHalluxData);

      expect(spec.offloadingZones.length).toBeGreaterThan(0);
      expect(spec.offloadingZones[0].reason).toBe('Hallux valgus');
    });

    it('should set default materials', () => {
      const spec = InsoleSpecCalculator.calculate(mockScanData);

      expect(spec.materials.topCover).toBe('Microfiber');
      expect(spec.materials.baseLayer).toBe('EVA 40 Shore A');
      expect(spec.materials.archFiller).toBe('EVA 60 Shore A');
    });

    it('should set manufacturing method to 3D_PRINT', () => {
      const spec = InsoleSpecCalculator.calculate(mockScanData);

      expect(spec.manufacturing.method).toBe('3D_PRINT');
      expect(spec.manufacturing.tolerance).toBe(0.5);
      expect(spec.manufacturing.estimatedTime).toBeGreaterThan(0);
    });

    it('should mark as valid by default', () => {
      const spec = InsoleSpecCalculator.calculate(mockScanData);

      expect(spec.validation.geometryValid).toBe(true);
      expect(spec.validation.printable).toBe(true);
      expect(spec.validation.warnings).toEqual([]);
    });
  });

  describe('calculateBoth', () => {
    it('should calculate specifications for both feet', () => {
      const leftData = { ...mockScanData, side: 'left' as const };
      const rightData = { ...mockScanData, side: 'right' as const };

      const result = InsoleSpecCalculator.calculateBoth(leftData, rightData);

      expect(result.left).toBeDefined();
      expect(result.right).toBeDefined();
      expect(result.left.side).toBe('left');
      expect(result.right.side).toBe('right');
    });
  });
});
