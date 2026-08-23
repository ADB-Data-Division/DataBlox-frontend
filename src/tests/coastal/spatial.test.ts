describe('Coastal Spatial Map & Temporal Scrubber Logic', () => {
  describe('Color Gradient Interpolation', () => {
    function interpolateColor(color1: string, color2: string, factor: number) {
      const hex1 = color1.substring(1);
      const hex2 = color2.substring(1);
      const r1 = parseInt(hex1.substring(0, 2), 16);
      const g1 = parseInt(hex1.substring(2, 4), 16);
      const b1 = parseInt(hex1.substring(4, 6), 16);
      const r2 = parseInt(hex2.substring(0, 2), 16);
      const g2 = parseInt(hex2.substring(2, 4), 16);
      const b2 = parseInt(hex2.substring(4, 6), 16);
      const r = Math.round(r1 + factor * (r2 - r1));
      const g = Math.round(g1 + factor * (g2 - g1));
      const b = Math.round(b1 + factor * (b2 - b1));
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    function getChlorophyllColor(value: number) {
      const clamped = Math.max(0, Math.min(20, value));
      if (clamped <= 10) {
        return interpolateColor('#22c55e', '#eab308', clamped / 10);
      }
      return interpolateColor('#eab308', '#ef4444', (clamped - 10) / 10);
    }

    function getSSTColor(value: number) {
      const clamped = Math.max(290, Math.min(310, value));
      return interpolateColor('#a855f7', '#ef4444', (clamped - 290) / 20);
    }

    it('returns green for minimum Chlorophyll-a concentration (0 mg/m³)', () => {
      expect(getChlorophyllColor(0).toLowerCase()).toBe('#22c55e');
    });

    it('returns yellow for midpoint Chlorophyll-a concentration (10 mg/m³)', () => {
      expect(getChlorophyllColor(10).toLowerCase()).toBe('#eab308');
    });

    it('returns red for maximum Chlorophyll-a concentration (20 mg/m³)', () => {
      expect(getChlorophyllColor(20).toLowerCase()).toBe('#ef4444');
    });

    it('clamps Chlorophyll-a out of range values', () => {
      expect(getChlorophyllColor(-5).toLowerCase()).toBe('#22c55e');
      expect(getChlorophyllColor(35).toLowerCase()).toBe('#ef4444');
    });

    it('interpolates SST colors within 290 to 310 K range', () => {
      expect(getSSTColor(290).toLowerCase()).toBe('#a855f7');
      expect(getSSTColor(310).toLowerCase()).toBe('#ef4444');
    });
  });

  describe('Temporal Slider Index Stepping', () => {
    function stepIndex(current: number, total: number, step: number): number {
      if (total <= 0) return 0;
      const next = current + step;
      return Math.max(0, Math.min(total - 1, next));
    }

    it('steps forward without exceeding the array boundary', () => {
      expect(stepIndex(5, 12, 1)).toBe(6);
      expect(stepIndex(11, 12, 1)).toBe(11);
    });

    it('steps backward without dropping below zero', () => {
      expect(stepIndex(3, 12, -1)).toBe(2);
      expect(stepIndex(0, 12, -1)).toBe(0);
    });

    it('handles empty period arrays safely', () => {
      expect(stepIndex(0, 0, 1)).toBe(0);
    });
  });
});
