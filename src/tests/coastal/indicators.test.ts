import type { IndicatorTimelinePoint, IndicatorTimelineSummary } from '@/types/coastal';

describe('Coastal Indicators Logic', () => {
  describe('Indicator Selection Limit Enforcement', () => {
    function toggleIndicator(selected: string[], indicatorId: string, max = 2): string[] {
      if (selected.includes(indicatorId)) {
        if (selected.length > 1) {
          return selected.filter((id) => id !== indicatorId);
        }
        return selected;
      }
      if (selected.length < max) {
        return [...selected, indicatorId];
      }
      return [selected[0], indicatorId];
    }

    it('adds an indicator when below max threshold', () => {
      const selected = ['chlor_a'];
      const next = toggleIndicator(selected, 'vessels');
      expect(next).toEqual(['chlor_a', 'vessels']);
    });

    it('replaces the second indicator when at max limit of 2', () => {
      const selected = ['chlor_a', 'vessels'];
      const next = toggleIndicator(selected, 'sst');
      expect(next).toEqual(['chlor_a', 'sst']);
    });

    it('removes an indicator when toggling an already selected one', () => {
      const selected = ['chlor_a', 'vessels'];
      const next = toggleIndicator(selected, 'vessels');
      expect(next).toEqual(['chlor_a']);
    });

    it('prevents deselecting the last remaining indicator', () => {
      const selected = ['chlor_a'];
      const next = toggleIndicator(selected, 'chlor_a');
      expect(next).toEqual(['chlor_a']);
    });
  });

  describe('Calculation Formulas & Deltas', () => {
    function calculatePercentageDelta(after: number, before: number): number {
      if (before === 0) return 0;
      return ((after - before) / before) * 100;
    }

    it('calculates positive percentage change correctly', () => {
      const delta = calculatePercentageDelta(5.01, 3.82);
      expect(Math.round(delta)).toBe(31);
    });

    it('calculates negative percentage change correctly', () => {
      const delta = calculatePercentageDelta(3.82, 6.00);
      expect(Math.round(delta)).toBe(-36);
    });

    it('returns 0 when baseline is 0 to prevent division by zero', () => {
      const delta = calculatePercentageDelta(5.0, 0);
      expect(delta).toBe(0);
    });
  });

  describe('Period Label Formatting', () => {
    function formatPeriod(iso: string, grain?: string): string {
      const date = new Date(iso);
      if (isNaN(date.getTime())) return iso;
      if (grain && grain.toLowerCase() === 'annually') {
        return String(date.getFullYear());
      }
      const month = date.toLocaleString('en-US', { month: 'short' });
      const year = date.getFullYear();
      return `${month} ${year}`;
    }

    it('formats ISO period string to Month Year', () => {
      expect(formatPeriod('2022-09-01')).toBe('Sep 2022');
      expect(formatPeriod('2019-01-15')).toBe('Jan 2019');
    });

    it('formats ISO period string to Year when grain is annually', () => {
      expect(formatPeriod('2022-09-01', 'annually')).toBe('2022');
      expect(formatPeriod('2019-01-15', 'annually')).toBe('2019');
    });

    it('returns original string if invalid date', () => {
      expect(formatPeriod('invalid-date')).toBe('invalid-date');
    });
  });

  describe('Peak Metric Label Granularity Formatting', () => {
    function formatPeakLabel(baseLabel: string, grain?: string): string {
      const grainLabel = grain === 'weekly' ? 'Weekly' : grain === 'annually' ? 'Annual' : 'Monthly';
      return baseLabel.replace('Monthly', grainLabel);
    }

    it('formats peak label with Monthly granularity by default', () => {
      expect(formatPeakLabel('Peak Vessel Count (Monthly):', 'monthly')).toBe('Peak Vessel Count (Monthly):');
      expect(formatPeakLabel('Peak Concentration (Monthly):', undefined)).toBe('Peak Concentration (Monthly):');
    });

    it('formats peak label with Weekly granularity', () => {
      expect(formatPeakLabel('Peak Vessel Count (Monthly):', 'weekly')).toBe('Peak Vessel Count (Weekly):');
      expect(formatPeakLabel('Peak Concentration (Monthly):', 'weekly')).toBe('Peak Concentration (Weekly):');
    });

    it('formats peak label with Annual granularity', () => {
      expect(formatPeakLabel('Peak Vessel Count (Monthly):', 'annually')).toBe('Peak Vessel Count (Annual):');
      expect(formatPeakLabel('Peak Concentration (Monthly):', 'annually')).toBe('Peak Concentration (Annual):');
    });
  });

  describe('Hex Detail Chart Max Lines Warning Condition', () => {
    function shouldShowMaxLinesWarning(activeIndicators: string[]): boolean {
      return activeIndicators.length >= 3;
    }

    it('hides warning when 1 indicator is active', () => {
      expect(shouldShowMaxLinesWarning(['chlor_a'])).toBe(false);
    });

    it('hides warning when 2 indicators are active', () => {
      expect(shouldShowMaxLinesWarning(['chlor_a', 'vessels'])).toBe(false);
    });

    it('shows warning when 3 or more indicators are active', () => {
      expect(shouldShowMaxLinesWarning(['chlor_a', 'vessels', 'sst'])).toBe(true);
      expect(shouldShowMaxLinesWarning(['chlor_a', 'vessels', 'sst', 'duration'])).toBe(true);
    });
  });

  describe('Choropleth Hover Tooltip Active Indicator Filtering', () => {
    function getVisibleTooltipMetrics(activeIndicators: string[], isSSTActive = false) {
      const hasChlor = !activeIndicators || activeIndicators.length === 0 || activeIndicators.includes('chlor_a');
      const hasSST = activeIndicators && activeIndicators.length > 0 ? activeIndicators.includes('sst') : isSSTActive;
      return { hasChlor, hasSST };
    }

    it('shows only Chlorophyll-a when only Chlorophyll-a is selected', () => {
      const metrics = getVisibleTooltipMetrics(['chlor_a']);
      expect(metrics.hasChlor).toBe(true);
      expect(metrics.hasSST).toBe(false);
    });

    it('shows only Chlorophyll-a when Chlorophyll-a and Vessels are selected', () => {
      const metrics = getVisibleTooltipMetrics(['chlor_a', 'vessels']);
      expect(metrics.hasChlor).toBe(true);
      expect(metrics.hasSST).toBe(false);
    });

    it('shows SST when SST is in active checklist', () => {
      const metrics = getVisibleTooltipMetrics(['chlor_a', 'vessels', 'sst']);
      expect(metrics.hasChlor).toBe(true);
      expect(metrics.hasSST).toBe(true);
    });
  });
});

