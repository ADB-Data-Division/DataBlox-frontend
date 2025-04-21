import { transformFilter } from '@/app/services/filter/transform';
import { VisualizationFilters } from '@/components/visualization-toolbar/state/types';
import { Filter, ProvinceFilter, DateTimeFilter, SubactionFilter } from '@/app/services/data-loader/data-loader-interface';
import { Province } from '@/models/province-district-subdistrict';
import { DateTime } from 'luxon';
import MigrationDataProcessor from '@/app/services/data-loader/danfo-service';

// Add helper function to simulate the transformation done in the component
function transformToMonthGranularity(dateStr: string, isEndDate: boolean): string {
  if (!dateStr) return dateStr;
  
  const date = DateTime.fromFormat(dateStr, 'yyyy-MM-dd');
  if (!date.isValid) return dateStr;
  
  if (isEndDate) {
    // Set to last day of month
    return date.endOf('month').toFormat('yyyy-MM-dd');
  } else {
    // Set to first day of month
    return date.startOf('month').toFormat('yyyy-MM-dd');
  }
}

describe('transformFilter function', () => {
  test('should return empty array when no filters are provided', async () => {
    // Arrange
    const visualizationFilters: VisualizationFilters = {
      provinces: [],
      timePeriod: '',
      visualizationType: 'bar',
      dataType: 'movein',
      datasetId: '',
      subaction: null
    };

    // Act
    const result = transformFilter(visualizationFilters);

    // Assert
    expect(result).toEqual([]);
  });

  test('should transform province filter correctly', async () => {
    // Arrange
    const provinces: Province[] = [
      { id: 'province1', name: 'Province 1', category: 'province' },
      { id: 'province2', name: 'Province 2', category: 'province' }
    ];
    
    const visualizationFilters: VisualizationFilters = {
      provinces,
      timePeriod: '',
      visualizationType: 'bar',
      dataType: 'movein',
      datasetId: '',
      subaction: null
    };

    // Act
    const result = transformFilter(visualizationFilters);

    // Assert
    const expectedProvinceFilter: ProvinceFilter = {
      type: 'province',
      filter_id: 'province-filter',
      province_ids: ['province1', 'province2']
    };

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expectedProvinceFilter);
  });

  test('should transform date range filter correctly for custom period', async () => {
    // Arrange
    const visualizationFilters: VisualizationFilters = {
      provinces: [],
      timePeriod: 'custom',
      startDate: '2023-01-01',
      endDate: '2023-12-31',
      visualizationType: 'bar',
      dataType: 'movein',
      datasetId: '',
      subaction: null
    };

    // Act
    const result = transformFilter(visualizationFilters);

    // Assert
    const expectedDateTimeFilter: DateTimeFilter = {
      type: 'datetime',
      filter_id: 'datetime-filter',
      time_period: 'custom',
      start_date: '2023-01-01',
      end_date: '2023-12-31'
    };

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expectedDateTimeFilter);
  });

  test('should transform date range filter correctly for predefined period', async () => {
    // Arrange
    const visualizationFilters: VisualizationFilters = {
      provinces: [],
      timePeriod: 'lastYear',
      startDate: '2023-01-01', // These dates would be calculated by the DateTimePeriodFilter
      endDate: '2024-01-01', 
      visualizationType: 'bar',
      dataType: 'movein',
      datasetId: '',
      subaction: null
    };

    // Act
    const result = transformFilter(visualizationFilters);

    // Assert
    const expectedDateTimeFilter: DateTimeFilter = {
      type: 'datetime',
      filter_id: 'datetime-filter',
      time_period: 'lastYear',
      start_date: '2023-01-01',
      end_date: '2024-01-01'
    };

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expectedDateTimeFilter);
  });

  test('should transform date range filter with month granularity properly', async () => {
    // Arrange
    // Use dates that aren't already at month boundaries
    const midMonthStart = '2023-01-15';
    const midMonthEnd = '2023-12-15';
    
    // Apply the transformation that would happen in the component
    const monthStart = transformToMonthGranularity(midMonthStart, false); // Should be 2023-01-01
    const monthEnd = transformToMonthGranularity(midMonthEnd, true); // Should be 2023-12-31
    
    const visualizationFilters: VisualizationFilters = {
      provinces: [],
      timePeriod: 'custom',
      startDate: monthStart,
      endDate: monthEnd,
      visualizationType: 'bar',
      dataType: 'movein',
      datasetId: '',
      subaction: null
    };

    // Act
    const result = transformFilter(visualizationFilters);

    // Assert
    const expectedDateTimeFilter: DateTimeFilter = {
      type: 'datetime',
      filter_id: 'datetime-filter',
      time_period: 'custom',
      start_date: '2023-01-01',
      end_date: '2023-12-31'
    };

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expectedDateTimeFilter);
    
    // Explicitly verify the transformation worked as expected
    expect(monthStart).toBe('2023-01-01');
    expect(monthEnd).toBe('2023-12-31');
  });

  test('should transform multiple filters correctly', async () => {
    // Arrange
    const provinces: Province[] = [
      { id: 'province1', name: 'Province 1', category: 'province' }
    ];
    
    const visualizationFilters: VisualizationFilters = {
      provinces,
      timePeriod: 'custom',
      startDate: '2023-01-01',
      endDate: '2023-12-31',
      visualizationType: 'bar',
      dataType: 'moveout',
      datasetId: 'dataset1',
      subaction: 'moveout'
    };

    // Act
    const result = transformFilter(visualizationFilters);

    // Assert
    const expectedProvinceFilter: ProvinceFilter = {
      type: 'province',
      filter_id: 'province-filter',
      province_ids: ['province1']
    };

    const expectedDateTimeFilter: DateTimeFilter = {
      type: 'datetime',
      filter_id: 'datetime-filter',
      time_period: 'custom',
      start_date: '2023-01-01',
      end_date: '2023-12-31'
    };

    const expectedSubactionFilter: SubactionFilter = {
      type: 'subaction',
      filter_id: 'subaction-filter',
      subaction: 'moveout'
    };

    expect(result).toHaveLength(3);
    expect(result).toContainEqual(expectedProvinceFilter);
    expect(result).toContainEqual(expectedDateTimeFilter);
    expect(result).toContainEqual(expectedSubactionFilter);
  });

  test('should not add date filter when only startDate is provided', async () => {
    // Arrange
    const visualizationFilters: VisualizationFilters = {
      provinces: [],
      timePeriod: 'custom',
      startDate: '2023-01-01',
      visualizationType: 'bar',
      dataType: 'movein',
      datasetId: '',
      subaction: null
    };

    // Act
    const result = transformFilter(visualizationFilters);

    // Assert
    expect(result).toHaveLength(0);
  });

  test('should not add date filter when only endDate is provided', async () => {
    // Arrange
    const visualizationFilters: VisualizationFilters = {
      provinces: [],
      timePeriod: 'custom',
      endDate: '2023-12-31',
      visualizationType: 'bar',
      dataType: 'movein',
      datasetId: '',
      subaction: null
    };

    // Act
    const result = transformFilter(visualizationFilters);

    // Assert
    expect(result).toHaveLength(0);
  });
});

// Add tests for the datetime functionality in danfo-service
describe('MigrationDataProcessor with datetime filters', () => {
  // Create a mock implementation of fetch for testing
  global.fetch = jest.fn(() => 
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        "Jan20": { "ProvinceA#DistrictA": { "ProvinceB#DistrictB": 10 } },
        "Feb20": { "ProvinceA#DistrictA": { "ProvinceB#DistrictB": 20 } },
        "Mar20": { "ProvinceA#DistrictA": { "ProvinceB#DistrictB": 30 } },
        "Apr20": { "ProvinceA#DistrictA": { "ProvinceB#DistrictB": 40 } },
        "May20": { "ProvinceA#DistrictA": { "ProvinceB#DistrictB": 50 } }
      })
    } as Response)
  );
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should filter data based on datetime filter', async () => {
    // Arrange
    const dataProcessor = new MigrationDataProcessor();
    await dataProcessor.fetchData('test-url');
    
    const dateTimeFilter: DateTimeFilter = {
      type: 'datetime',
      filter_id: 'datetime-filter',
      time_period: 'custom',
      start_date: '2020-02-01',
      end_date: '2020-03-31'
    };
    
    // Act
    const result = await dataProcessor.applyFilters([dateTimeFilter]);
    
    // Assert
    expect(result).toHaveLength(2); // Should only include Feb and Mar
    expect(result[0].month).toBe('Feb');
    expect(result[1].month).toBe('Mar');
  });
  
  test('should include all months when no datetime filter is provided', async () => {
    // Arrange
    const dataProcessor = new MigrationDataProcessor();
    await dataProcessor.fetchData('test-url');
    
    // Act
    const result = await dataProcessor.applyFilters([]);
    
    // Assert
    // Should include all months in the mock data (Jan20-May20)
    expect(result.length).toBe(5);
    expect(result.map(item => item.month)).toContain('Jan');
    expect(result.map(item => item.month)).toContain('Feb');
    expect(result.map(item => item.month)).toContain('Mar');
    expect(result.map(item => item.month)).toContain('Apr');
    expect(result.map(item => item.month)).toContain('May');
  });
  
  test('should handle datetime filter that spans partial year', async () => {
    // Arrange
    const dataProcessor = new MigrationDataProcessor();
    await dataProcessor.fetchData('test-url');
    
    const dateTimeFilter: DateTimeFilter = {
      type: 'datetime',
      filter_id: 'datetime-filter',
      time_period: 'custom',
      start_date: '2019-11-01', // Before the data range
      end_date: '2020-02-15'    // During the data range
    };
    
    // Act
    const result = await dataProcessor.applyFilters([dateTimeFilter]);
    
    // Assert
    expect(result).toContainEqual(expect.objectContaining({ month: 'Jan' }));
    expect(result).toContainEqual(expect.objectContaining({ month: 'Feb' }));
    expect(result).not.toContainEqual(expect.objectContaining({ month: 'Mar' }));
  });
}); 