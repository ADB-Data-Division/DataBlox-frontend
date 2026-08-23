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
});
