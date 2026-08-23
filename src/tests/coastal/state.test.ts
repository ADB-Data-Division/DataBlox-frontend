import coastalReducer, {
  setCountry,
  setAois,
  setDateRange,
  setGrain,
  toggleIndicator,
  setAggFunc,
  resetFilters,
} from '@/app/store/features/coastalSlice';

describe('Coastal Redux State Slice', () => {
  const initialState = {
    country: 'IDN',
    aois: [],
    dateRange: {
      start_date: '2019-01-01',
      end_date: '2025-12-31',
    },
    grain: 'monthly' as const,
    indicators: ['chlor_a', 'vessels'],
    aggFunc: 'average' as const,
    vesselMetric: 'Vessel Count',
    activeTab: 0,
    activeChoroplethIndicator: 'chlor_a',
    selectedHexCell: null,
    selectedPeriodIndex: 6,
  };

  it('updates selected country and clears previous AOIs and selected hex', () => {
    const prevState = { ...initialState, aois: ['bali-1'], selectedHexCell: 'hex-123' };
    const nextState = coastalReducer(prevState, setCountry('PHL'));
    expect(nextState.country).toBe('PHL');
    expect(nextState.aois).toEqual([]);
    expect(nextState.selectedHexCell).toBeNull();
  });

  it('updates selected AOIs array', () => {
    const nextState = coastalReducer(initialState, setAois(['aoi-1', 'aoi-2']));
    expect(nextState.aois).toEqual(['aoi-1', 'aoi-2']);
  });

  it('updates date range bounds', () => {
    const nextState = coastalReducer(
      initialState,
      setDateRange({ start_date: '2020-01-01', end_date: '2024-12-31' })
    );
    expect(nextState.dateRange.start_date).toBe('2020-01-01');
    expect(nextState.dateRange.end_date).toBe('2024-12-31');
  });

  it('updates aggregation grain', () => {
    const nextState = coastalReducer(initialState, setGrain('weekly'));
    expect(nextState.grain).toBe('weekly');
  });

  it('toggles indicators and enforces maximum 2 selected', () => {
    let state = coastalReducer(initialState, toggleIndicator('sst'));
    expect(state.indicators).toHaveLength(2);
    expect(state.indicators).toContain('sst');

    // Toggle off one
    state = coastalReducer(state, toggleIndicator('sst'));
    expect(state.indicators).toHaveLength(1);
    expect(state.indicators).not.toContain('sst');

    // Add back
    state = coastalReducer(state, toggleIndicator('sst'));
    expect(state.indicators).toHaveLength(2);
    expect(state.indicators).toContain('sst');
  });

  it('updates aggregation function', () => {
    const nextState = coastalReducer(initialState, setAggFunc('maximum'));
    expect(nextState.aggFunc).toBe('maximum');
  });

  it('resets filters back to defaults', () => {
    const modifiedState = {
      ...initialState,
      indicators: ['sst'],
      aggFunc: 'maximum' as const,
      grain: 'weekly' as const,
      selectedHexCell: 'hex-999',
    };
    const resetState = coastalReducer(modifiedState, resetFilters());
    expect(resetState.indicators).toEqual(['chlor_a', 'vessels']);
    expect(resetState.aggFunc).toBe('average');
    expect(resetState.grain).toBe('monthly');
    expect(resetState.selectedHexCell).toBeNull();
  });
});
