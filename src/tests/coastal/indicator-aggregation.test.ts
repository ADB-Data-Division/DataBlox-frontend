import {
  aggregateIndicatorValues,
  formatIndicatorAggregation,
  getIndicatorAggregation,
  normalizeIndicatorAggregation,
} from '@/app/(dashboard)/coastal/indicators';

describe('coastal indicator aggregation metadata', () => {
  it.each([
    ['AVG', 'avg'],
    ['average', 'avg'],
    ['SUM', 'sum'],
    ['MAX', 'max'],
    ['MIN', 'min'],
  ])('normalizes backend aggregation %s', (backendValue, expected) => {
    expect(normalizeIndicatorAggregation(backendValue)).toBe(expected);
  });

  it('prefers the backend aggregation map over the static presentation fallback', () => {
    expect(getIndicatorAggregation('chlor_a', { chlor_a: 'MAX' })).toBe('max');
    expect(getIndicatorAggregation('tc_wind')).toBe('max');
  });

  it.each([
    ['avg', 'Average'],
    ['sum', 'Total'],
    ['max', 'Maximum'],
    ['min', 'Minimum'],
  ])('shows a clear label for %s', (aggregation, expectedLabel) => {
    expect(formatIndicatorAggregation(aggregation)).toBe(expectedLabel);
  });

  it('applies AVG while treating zero-fill nulls as zero', () => {
    expect(aggregateIndicatorValues([10, null, 20], 'AVG', true)).toBe(10);
  });

  it('skips null-policy gaps and applies SUM, MAX, and MIN from metadata', () => {
    expect(aggregateIndicatorValues([10, null, 20], 'SUM', false)).toBe(30);
    expect(aggregateIndicatorValues([10, null, 20], 'MAX', false)).toBe(20);
    expect(aggregateIndicatorValues([10, null, 20], 'MIN', false)).toBe(10);
    expect(aggregateIndicatorValues([null, undefined], 'AVG', false)).toBeNull();
  });

});
