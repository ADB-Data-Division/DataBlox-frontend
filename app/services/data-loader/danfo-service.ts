import { normalizeAsKey } from "@/models/normalize";
import { Province } from "@/models/province-district-subdistrict";
import * as dfd from "danfojs";
import { Filter, ProvinceFilter, DateTimeFilter, SubactionFilter } from "./data-loader-interface";
import { DateTime } from "luxon";

interface SparseMatrix {
  [sourceDistrict: string]: {
    [destinationDistrict: string]: number;
  };
}

interface MonthlyData {
  [month: string]: SparseMatrix;
}

class MigrationDataProcessor {
  private data: MonthlyData | null = null;
  private districtMapping: string[] = [];
  private nameToIdMap: Map<string, number> = new Map();

  /**
   * Fetches migration data from a URL and processes it
   */
  async fetchData(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      this.data = await response.json();
      console.log(`Loaded data for ${Object.keys(this.data!).length} months`);
      
      // Create district mapping on first load
      this.createDistrictMapping();
    } catch (error) {
      console.error("Error fetching migration data:", error);
      throw error;
    }
  }

  /**
   * Creates a mapping between district names and numeric IDs
   */
  private createDistrictMapping(): void {
    if (!this.data) {
      throw new Error("No data loaded");
    }

    const uniqueDistricts = new Set<string>();
    
    // Collect all unique district names from all months
    Object.values(this.data).forEach(monthData => {
      // Add source districts
      Object.keys(monthData).forEach(source => uniqueDistricts.add(source));
      
      // Add destination districts
      Object.values(monthData).forEach(sourceData => {
        Object.keys(sourceData).forEach(dest => uniqueDistricts.add(dest));
      });
    });

    // Create the mapping
    this.districtMapping = Array.from(uniqueDistricts).sort();
    this.nameToIdMap = new Map(
      this.districtMapping.map((name, index) => [name, index])
    );
    
    console.log(`Created mapping for ${this.districtMapping.length} districts`);
  }

  /**
   * Gets the list of available months in the data
   */
  getAvailableMonths(): string[] {
    if (!this.data) return [];
    return Object.keys(this.data);
  }

  /**
   * Converts sparse data to a format suitable for Danfo.js DataFrame
   * Returns an array of objects with source, destination, and count
   */
  convertToDanfoFormat(month: string): { source: string; destination: string; count: number }[] {
    if (!this.data || !this.data[month]) {
      throw new Error(`No data available for month: ${month}`);
    }

    const monthData = this.data[month];
    const records: { source: string; destination: string; count: number }[] = [];

    // Convert sparse format to array of records
    Object.entries(monthData).forEach(([source, destinations]) => {
      Object.entries(destinations).forEach(([destination, count]) => {
        records.push({
          source,
          destination,
          count
        });
      });
    });

    return records;
  }

  /**
   * Creates a Danfo.js DataFrame for a specific month
   */
  async createDataFrame(month: string): Promise<dfd.DataFrame> {
    const records = this.convertToDanfoFormat(month);
    return new dfd.DataFrame(records);
  }

  /**
   * Creates a pivot table suitable for migration matrix visualization
   * Returns a DataFrame with sources as rows and destinations as columns
   */
  async createMigrationMatrix(month: string): Promise<dfd.DataFrame> {
    const df = await this.createDataFrame(month);
    
    // Group by source and destination
    const grouped = df.groupby(["source", "destination"]);
    
    // Aggregate to get counts
    const aggregated = grouped.agg({ "count": "sum" });
    
    // Get unique sources and destinations
    const uniqueSources = df["source"].unique().values as string[];
    const uniqueDestinations = df["destination"].unique().values as string[];
    
    // Create a plain 2D array for the matrix data
    const matrixData = Array(uniqueSources.length).fill(0).map(() => 
      Array(uniqueDestinations.length).fill(0)
    );

    // Fill the matrix using the correct data extraction
    for (let i = 0; i < aggregated.shape[0]; i++) {
      // Get the row data using iloc
      const row = aggregated.iloc({ rows: [i] }).getColumnData;
      const source = (row[0] as any)[0] as string;
      const destination = (row[1] as any)[0] as string;
      const count = Number((row[2] as any)[0]) as number;
      
      // Find the indices in our unique arrays
      const sourceIdx = uniqueSources.indexOf(source);
      const destIdx = uniqueDestinations.indexOf(destination);
      
      // Set value in the array if indices are valid
      if (sourceIdx !== -1 && destIdx !== -1) {
        matrixData[sourceIdx][destIdx] = count;
      } else {
        console.warn(`Source or destination not found: source=${source}, destination=${destination}`);
      }
    }

    // Create DataFrame from the filled array
    const matrix = new dfd.DataFrame(matrixData, {
      index: uniqueSources,
      columns: uniqueDestinations
    });
    
    return matrix;
  }

  /**
   * Exports data in a format optimized for Danfo.js
   * Returns a JSON string that can be directly loaded into Danfo.js
   */
  exportForDanfo(month: string): string {
    const records = this.convertToDanfoFormat(month);
    return JSON.stringify(records);
  }

  /**
   * Exports all months' data in a format optimized for Danfo.js
   * Returns a JSON object with month keys and arrays of records as values
   */
  exportAllMonthsForDanfo(): string {
    if (!this.data) {
      throw new Error("No data loaded");
    }

    const result: { [month: string]: any[] } = {};
    
    Object.keys(this.data).forEach(month => {
      result[month] = this.convertToDanfoFormat(month);
    });
    
    return JSON.stringify(result);
  }

  /**
   * Exports the district mapping
   */
  exportMapping(): string {
    return JSON.stringify(this.districtMapping);
  }

  /**
   * Creates a numeric version of the migration matrix
   * Uses district IDs instead of names for better performance
   */
  async createNumericMigrationMatrix(month: string): Promise<{
    mapping: string[];
    matrix: dfd.DataFrame;
  }> {
    if (!this.data || !this.data[month]) {
      throw new Error(`No data available for month: ${month}`);
    }

    const monthData = this.data[month];
    const records: { sourceId: number; destId: number; count: number }[] = [];

    // Convert sparse format to array of records with numeric IDs
    Object.entries(monthData).forEach(([source, destinations]) => {
      const sourceId = this.nameToIdMap.get(source)!;
      
      Object.entries(destinations).forEach(([destination, count]) => {
        const destId = this.nameToIdMap.get(destination)!;
        records.push({
          sourceId,
          destId,
          count
        });
      });
    });

    // Create DataFrame with numeric IDs
    const df = new dfd.DataFrame(records);

    const grouped = df.groupby(["sourceId", "destId"]);
    const aggregated = grouped.agg({ "count": "sum" });
    aggregated.fillNa(0, { inplace: true });
    
    return {
      mapping: this.districtMapping,
      matrix: aggregated
    };
  }

  async createProvinceMigrationMatrix(month: string, filters: Filter[]): Promise<dfd.DataFrame> {
    const df = await this.createDataFrame(month);
    
    // Extract province names from the district identifiers
    df.addColumn("source_province", df["source"].apply((value: string) => {
      const parts = value.split('#');
      if (parts.length > 1) {
        return parts[0];
      }
      return value;
    }), { inplace: true });
    df.addColumn("destination_province", df["destination"].apply((value: string) => {
      const parts = value.split('#');
      if (parts.length > 1) {
        return parts[0];
      }
      return value;
    }), { inplace: true });
    
    // Group by province and aggregate
    const grouped = df.groupby(["source_province", "destination_province"]);
    const aggregated = grouped.agg({ "count": "sum" });

    const provinceFilters = filters.find(filter => filter.type === "province") as ProvinceFilter | undefined;

    const provinceFilter = provinceFilters ? 
    (province: string) => provinceFilters.province_ids.includes(normalizeAsKey(province)) : 
    () => true;
    
    // Get unique provinces
    const uniqueSourceProvinces = (df["source_province"].unique().values as string[]).filter(provinceFilter);
    const uniqueDestProvinces = (df["destination_province"].unique().values as string[]).filter(provinceFilter);
    
    // Create a plain 2D array for the matrix data
    const matrixData = Array(uniqueSourceProvinces.length).fill(0).map(() => 
      Array(uniqueDestProvinces.length).fill(0)
    );

    // Fill the matrix using the correct data extraction
    for (let i = 0; i < aggregated.shape[0]; i++) {
      // Get the row data using iloc
      const row = aggregated.iloc({ rows: [i] }).getColumnData;
      const sourceProvince = (row[0] as any)[0] as string;
      const destProvince = (row[1] as any)[0] as string;
      const srcProvinceKey = normalizeAsKey(sourceProvince);
      const destProvinceKey = normalizeAsKey(destProvince);

      // Don't process if there are province filters
      if (!provinceFilter(srcProvinceKey) || !provinceFilter(destProvinceKey)) {
        continue;
      }
      
      const count = Number((row[2] as any)[0]) as number;
      
      // Find the indices in our unique arrays
      const sourceIdx = uniqueSourceProvinces.indexOf(sourceProvince);
      const destIdx = uniqueDestProvinces.indexOf(destProvince);
      
      // Set value in the array if indices are valid
      if (sourceIdx !== -1 && destIdx !== -1) {
        matrixData[sourceIdx][destIdx] = count;
      } else {
        console.warn(`Province not found: source=${sourceProvince}, destination=${destProvince}`);
      }
    }

    // Create DataFrame from the filled array
    const matrix = new dfd.DataFrame(matrixData, {
      index: uniqueSourceProvinces,
      columns: uniqueDestProvinces
    });
    
    return matrix;
  }

  async loadDataset(dataset: string) {
    const processor = this;
  
    // Replace with your actual JSON URL
    await processor.fetchData(dataset);
    
    // Get available months
    const months = processor.getAvailableMonths();
    console.log("Available months:", months);
    
    if (months.length > 0) {
      const firstMonth = months[0];
      
      // Create a Danfo DataFrame
      const df = await processor.createDataFrame(firstMonth);
      console.log("DataFrame created:");
      df.head().print();
      
      // Get basic statistics
      console.log("Migration count statistics:");
      df.loc({ columns: ["count"] }).describe().print();
      
      // Create a migration matrix
      console.log("Creating migration matrix...");
      const matrix = await processor.createMigrationMatrix(firstMonth);
      console.log(`Matrix shape: ${matrix.shape[0]} x ${matrix.shape[1]}`);
      
      // Example: Get top 5 source districts by total outgoing migration
      const outgoingTotals = df.groupby(["source"]).col(["count"]).sum();
      outgoingTotals.sortValues("count_sum", { ascending: false }).head().print();
      
      // Export data for later use with Danfo.js
      const jsonData = processor.exportForDanfo(firstMonth);
      console.log(`Exported JSON data size: ${jsonData.length} characters`);
      
      // Example of loading the exported data back into Danfo.js
      console.log("Loading data from exported JSON:");
      const parsedData = JSON.parse(jsonData);
      const newDf = new dfd.DataFrame(parsedData);
      newDf.head().print();

      return matrix;
    }
  }

  async applyFilters(filters: Filter[]){ 
    // Convert dates from datetime filter to Month format for filtering
    const getFilteredMonths = (filters: Filter[]): string[] => {
      // Get all available months from the data
      const availableMonths = this.data ? Object.keys(this.data) : [];
      if (availableMonths.length === 0) {
        console.warn("No months available in data");
        return [];
      }
      
      // If no datetime filter is present, return all available months
      const datetimeFilter = filters.find(filter => filter.type === 'datetime') as DateTimeFilter | undefined;
      if (!datetimeFilter) {
        return availableMonths;
      }

      // Parse start and end dates
      const startDate = DateTime.fromISO(datetimeFilter.start_date);
      const endDate = DateTime.fromISO(datetimeFilter.end_date);
      
      if (!startDate.isValid || !endDate.isValid) {
        console.error("Invalid date format in datetime filter");
        return availableMonths.slice(0, 3); // Return first 3 months as fallback
      }

      // Map of month codes to DateTime objects for each available month
      const monthMap: {[key: string]: DateTime} = {};
      
      // Populate the monthMap with available months from data
      availableMonths.forEach(monthCode => {
        // Assuming month codes are in format "MmmYY" like "Jan20"
        const monthName = monthCode.substring(0, 3);
        const yearSuffix = monthCode.substring(3);
        const year = 2000 + parseInt(yearSuffix, 10); // Convert "20" to 2020
        
        // Map month name to month number (1-12)
        const monthNameToNumber: {[key: string]: number} = {
          "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
          "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12
        };
        
        const month = monthNameToNumber[monthName] || 1;
        monthMap[monthCode] = DateTime.fromObject({ year, month, day: 1 });
      });

      // Filter months based on date range
      return Object.entries(monthMap)
        .filter(([_, monthDate]) => {
          // Proper DateTime comparisons in Luxon
          // For start date: Check if month date is after or equal to the start of the month containing the start date
          const monthStartDate = startDate.startOf('month');
          const monthEndDate = endDate.endOf('month');
          
          return monthDate.toMillis() >= monthStartDate.toMillis() && 
                 monthDate.toMillis() <= monthEndDate.toMillis();
        })
        .map(([monthCode, _]) => monthCode);
    };

    const filteredMonths = getFilteredMonths(filters);
    console.log("Filtered months based on datetime filter:", filteredMonths);

    const loadData = async (month: string) => {
      const matrix = await this.createProvinceMigrationMatrix(month, filters);
      const subactionFilter = filters.find(filter => filter.type === "subaction") as SubactionFilter | undefined;
      const subaction = subactionFilter?.subaction;
      if (subaction === "raw") {
        return (matrix as any).$data;
      }
      
      const data = this.mapToProvince(matrix, subaction as "movein"|"moveout"|"net", "province")
      return {...data, month: month}
    }

    // Only load data for months that match the datetime filter
    const monthlyData = await Promise.all(
      filteredMonths.map(async (month) => {
        const data = await loadData(month);
        // Extract short month name for display
        const shortMonth = month.substring(0, 3);
        return {...data, month: shortMonth};
      })
    );
    
    // Return the filtered data
    return monthlyData;
  }

  mapToProvince(source: dfd.DataFrame, subaction: string, scope: "province"): any {
    let result: any = {};
    
    // Ensure source is defined and has values
    if (!source || source.shape[0] === 0) {
      console.warn("Source DataFrame is empty or undefined");
      return result;
    }

    // Get values as a proper 2D array to ensure consistent access
    const values = source.values as number[][];
    
    switch (subaction) {
      case "moveout":
        // Debug the source at this point
        console.log("Processing moveout with source shape:", source.shape);
        
        // Iterate through columns (target provinces)
        source.columns.forEach((targetProvince: string|number, targetIdx: number) => {
          // Only process string column names (provinces)
          if (typeof targetProvince === 'string') {
            // Iterate through rows (source provinces)
            source.index.forEach((sourceProvince: string|number, sourceIdx: number) => {
              // Skip self-to-self migrations
              if (targetIdx === sourceIdx) return;
              
              const key = normalizeAsKey(sourceProvince as string);
              const current = result[key] || 0;
              
              // Safely access value - ensure indices are valid
              let addition = 0;
              if (sourceIdx < values.length && targetIdx < values[sourceIdx].length) {
                addition = values[sourceIdx][targetIdx];
              }
              
              result[key] = current + addition;
            });
          }
        });
        break;
      case "movein":
        source.index.forEach((sourceProvince: (string|number), idxr: number) => {
          if (typeof sourceProvince == 'string') {
            source.columns.forEach((column: string, idxc: number) => {
              if (idxr == idxc) return; // Don't regard self to self movement as moveout
              const key = normalizeAsKey(sourceProvince as string);
              const current = result[key] ?? 0;
              const addition = values[idxr][idxc];
              result[key] = current + addition;
            });
          }
        });
        break;
      case "net":
        let movein: any = {};
        let moveout: any = {};
            
        source.index.forEach((sourceProvince: (string|number), idxr: number) => {
          if (typeof sourceProvince == 'string') {
            source.columns.forEach((targetProvince: (string|number), idxc: number) => {
              if (idxr == idxc) return; // Don't regard self to self movement as moveout
              const key = normalizeAsKey(sourceProvince as string);
              const current = movein[key] ?? 0;
              const addition = values[idxr][idxc];
              movein[key] = current + addition;
            });
          }
        });

        source.columns.forEach((targetProvince: (string|number), idxr: number) => {
          if (typeof targetProvince == 'string') {
            source.index.forEach((sourceProvince: (string|number), idxc: number) => {
              if (idxr == idxc) return; // Don't regard self to self movement as moveout
              const key = normalizeAsKey(sourceProvince as string);
              const current = moveout[key] ?? 0;
              const addition = values[idxr][idxc];
              moveout[key] = current + addition;
            });
          }
        });

        Object.keys(movein).forEach((key) => {
          result[key] = movein[key] - moveout[key];
        });
        break;

      case "raw":
        return (source as any).$data;
    }

    return result;
  }
}

export default MigrationDataProcessor;