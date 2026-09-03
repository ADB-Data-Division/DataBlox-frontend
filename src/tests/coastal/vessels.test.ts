describe('Maritime Vessel Types Analysis Logic', () => {
  describe('Category Distribution Math', () => {
    const parentCategories = [
      { id: 'trade', label: 'Trade', value: 92 },
      { id: 'recreation', label: 'Recreation', value: 52 },
      { id: 'harbor', label: 'Harbor', value: 28 },
      { id: 'miscellaneous', label: 'Miscellaneous', value: 28 },
    ];
    const total = parentCategories.reduce((sum, c) => sum + c.value, 0);

    function computePercentage(val: number, tot: number): number {
      if (tot <= 0) return 0;
      return Number(((val / tot) * 100).toFixed(1));
    }

    it('sums up to total vessels count correctly', () => {
      expect(total).toBe(200);
    });

    it('computes exact category distribution percentages', () => {
      expect(computePercentage(92, total)).toBe(46.0);
      expect(computePercentage(52, total)).toBe(26.0);
      expect(computePercentage(28, total)).toBe(14.0);
    });
  });

  describe('Subcategory Drilldown Filtering', () => {
    const subCategories = [
      { id: 'cargo', parentId: 'trade', label: 'Cargo', value: 69 },
      { id: 'tanker', parentId: 'trade', label: 'Tanker', value: 23 },
      { id: 'tug_tow', parentId: 'harbor', label: 'Tug & Tow', value: 18 },
      { id: 'dredger', parentId: 'harbor', label: 'Dredger', value: 10 },
    ];

    function filterSubCategories(parentId: string) {
      return subCategories.filter((s) => s.parentId === parentId);
    }

    it('filters subcategories for trade parent', () => {
      const tradeSubs = filterSubCategories('trade');
      expect(tradeSubs).toHaveLength(2);
      expect(tradeSubs.map((s) => s.label)).toEqual(['Cargo', 'Tanker']);
    });

    it('filters subcategories for harbor parent', () => {
      const harborSubs = filterSubCategories('harbor');
      expect(harborSubs).toHaveLength(2);
      expect(harborSubs.map((s) => s.label)).toEqual(['Tug & Tow', 'Dredger']);
    });

    it('returns empty array for non-existent category', () => {
      expect(filterSubCategories('unknown')).toHaveLength(0);
    });
  });

  describe('Vessel Summary Card Metrics and Mathematical Formulas', () => {
    function computePeriodDelta(current: number, baseline: number): number | null {
      if (baseline <= 0) return null;
      return ((current - baseline) / baseline) * 100;
    }

    function computePeriodAverage(total: number, count: number): number {
      if (count <= 0) return 0;
      return Math.round(total / count);
    }

    it('computes cumulative sum and period average correctly', () => {
      const totalVessels = 12500;
      const periodCount = 24;
      const periodAvg = computePeriodAverage(totalVessels, periodCount);
      expect(periodAvg).toBe(521);
    });

    it('computes period percentage change with correct direction', () => {
      const current = 1200;
      const previous = 1000;
      const delta = computePeriodDelta(current, previous);
      expect(delta).toBe(20.0);
    });

    it('returns null when baseline count is zero', () => {
      const current = 500;
      const previous = 0;
      const delta = computePeriodDelta(current, previous);
      expect(delta).toBeNull();
    });

    it('calculates negative delta accurately', () => {
      const current = 800;
      const previous = 1000;
      const delta = computePeriodDelta(current, previous);
      expect(delta).toBe(-20.0);
    });
  });
});
