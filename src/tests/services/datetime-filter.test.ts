import { DateTimeFilter } from '@/app/services/data-loader/data-loader-interface';
import MigrationDataProcessor from '@/app/services/data-loader/danfo-service';

describe('MigrationDataProcessor DateTime Filtering', () => {
  // Create a mock implementation of fetch for testing with specific month data
  global.fetch = jest.fn(() => 
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        "Jan20": { "ProvinceA#DistrictA": { "ProvinceB#DistrictB": 10 } },
        "Feb20": { "ProvinceA#DistrictA": { "ProvinceB#DistrictB": 20 } },
        "Mar20": { "ProvinceA#DistrictA": { "ProvinceB#DistrictB": 30 } },
        "Apr20": { "ProvinceA#DistrictA": { "ProvinceB#DistrictB": 40 } },
        "May20": { "ProvinceA#DistrictA": { "ProvinceB#DistrictB": 50 } },
        "Jun20": { "ProvinceA#DistrictA": { "ProvinceB#DistrictB": 60 } },
        "Dec20": { "ProvinceA#DistrictA": { "ProvinceB#DistrictB": 120 } }
      })
    } as Response)
  );
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should correctly filter data for exact month start/end dates', async () => {
    // Arrange
    const dataProcessor = new MigrationDataProcessor();
    await dataProcessor.fetchData('test-url');
    
    const dateTimeFilter: DateTimeFilter = {
      type: 'datetime',
      filter_id: 'datetime-filter',
      label: 'Feb-Mar 2020',
      // Exact dates for February and March 2020
      start_date: '2020-02-01',
      end_date: '2020-03-31',
      time_period: 'custom'
    };
    
    // Act
    const result = await dataProcessor.applyFilters([dateTimeFilter]);
    
    // Assert
    expect(result).toHaveLength(2); // Should only include Feb and Mar
    const monthNames = result.map(item => item.month);
    expect(monthNames).toContain('Feb');
    expect(monthNames).toContain('Mar');
    expect(monthNames).not.toContain('Jan');
    expect(monthNames).not.toContain('Apr');
  });
  
  test('should correctly filter data for dates in the middle of months', async () => {
    // Arrange
    const dataProcessor = new MigrationDataProcessor();
    await dataProcessor.fetchData('test-url');
    
    const dateTimeFilter: DateTimeFilter = {
      type: 'datetime',
      filter_id: 'datetime-filter',
      label: 'Jan-Apr 2020',
      // Dates in the middle of months
      start_date: '2020-01-15',
      end_date: '2020-04-15',
      time_period: 'custom'
    };
    
    // Act
    const result = await dataProcessor.applyFilters([dateTimeFilter]);
    
    // Assert
    expect(result).toHaveLength(4); // Should include Jan, Feb, Mar, Apr
    const monthNames = result.map(item => item.month);
    expect(monthNames).toEqual(expect.arrayContaining(['Jan', 'Feb', 'Mar', 'Apr']));
  });
  
  test('should filter data for date range spanning across years', async () => {
    // Arrange
    const dataProcessor = new MigrationDataProcessor();
    await dataProcessor.fetchData('test-url');
    
    const dateTimeFilter: DateTimeFilter = {
      type: 'datetime',
      filter_id: 'datetime-filter',
      label: 'Nov 2019 - Feb 2020',
      // Range that starts before available data and ends after some data
      start_date: '2019-11-01',
      end_date: '2020-02-15',
      time_period: 'custom'
    };
    
    // Act
    const result = await dataProcessor.applyFilters([dateTimeFilter]);
    
    // Assert
    expect(result).toHaveLength(2); // Should include Jan, Feb
    const monthNames = result.map(item => item.month);
    expect(monthNames).toEqual(expect.arrayContaining(['Jan', 'Feb']));
    expect(monthNames).not.toContain('Mar');
  });
  
  test('should return all months when no datetime filter is provided', async () => {
    // Arrange
    const dataProcessor = new MigrationDataProcessor();
    await dataProcessor.fetchData('test-url');
    
    // Act
    const result = await dataProcessor.applyFilters([]);
    
    // Assert
    expect(result.length).toBe(7); // All months in mock data
    const monthNames = result.map(item => item.month);
    expect(monthNames).toEqual(
      expect.arrayContaining(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Dec'])
    );
  });
  
  test('should handle empty result when date range is outside available data', async () => {
    // Arrange
    const dataProcessor = new MigrationDataProcessor();
    await dataProcessor.fetchData('test-url');
    
    const dateTimeFilter: DateTimeFilter = {
      type: 'datetime',
      filter_id: 'datetime-filter',
      label: 'Q1 2021',
      // Range entirely in 2021, outside available data
      start_date: '2021-01-01',
      end_date: '2021-03-31',
      time_period: 'custom'
    };
    
    // Act
    const result = await dataProcessor.applyFilters([dateTimeFilter]);
    
    // Assert
    expect(result).toHaveLength(0); // No data should match
  });
  
  test('should correctly filter for a single month', async () => {
    // Arrange
    const dataProcessor = new MigrationDataProcessor();
    await dataProcessor.fetchData('test-url');
    
    const dateTimeFilter: DateTimeFilter = {
      type: 'datetime',
      filter_id: 'datetime-filter',
      label: 'May 2020',
      // Range for just May 2020
      start_date: '2020-05-01',
      end_date: '2020-05-31',
      time_period: 'custom'
    };
    
    // Act
    const result = await dataProcessor.applyFilters([dateTimeFilter]);
    
    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].month).toBe('May');
  });
  
  test('should correctly filter for non-consecutive months', async () => {
    // Arrange
    const dataProcessor = new MigrationDataProcessor();
    await dataProcessor.fetchData('test-url');
    
    const dateTimeFilter: DateTimeFilter = {
      type: 'datetime',
      filter_id: 'datetime-filter',
      label: '2020 Full Year',
      // Range that includes Jan and Dec but skips middle months
      start_date: '2020-01-01',
      end_date: '2020-12-31',
      time_period: 'custom'
    };
    
    // Act
    const result = await dataProcessor.applyFilters([dateTimeFilter]);
    
    // Assert
    // Should include all available months in 2020
    expect(result.length).toBe(7);
    const monthNames = result.map(item => item.month);
    expect(monthNames).toEqual(
      expect.arrayContaining(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Dec'])
    );
  });
}); 