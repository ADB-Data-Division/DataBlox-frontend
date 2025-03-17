import { normalizeAsKey } from "@/models/normalize";
import { Province } from "@/models/province-district-subdistrict";
import * as dfd from "danfojs";
import { Filter, ProvinceFilter } from "./data-loader-interface";

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
    const loadData = async (month: string) => {
      const matrix = await this.createProvinceMigrationMatrix(month, filters);
      const moveOut = this.mapToProvince(matrix, "moveout", "province")
      return {...moveOut, month: month}
    }
    const jan20moveOut = await loadData("Jan20");
    const feb20moveOut = await loadData("Feb20");
    const mar20moveOut = await loadData("Mar20");
    // const apr20moveOut = await loadData("Apr20");
    // const may20moveOut = await loadData("May20");
    // const jun20moveOut = await loadData("Jun20");
    // const jul20moveOut = await loadData("Jul20");
    // const aug20moveOut = await loadData("Aug20");
    // const sep20moveOut = await loadData("Sep20");
    // const oct20moveOut = await loadData("Oct20");
    // const nov20moveOut = await loadData("Nov20");
    // const dec20moveOut = await loadData("Dec20");
    
    const data = [
      {...jan20moveOut, month: 'Jan'},
      {...feb20moveOut, month: 'Feb'},
      {...mar20moveOut, month: 'Mar'},
      // {...apr20moveOut, month: 'Apr'},
      // {...may20moveOut, month: 'May'},
      // {...jun20moveOut, month: 'Jun'},
      // {...jul20moveOut, month: 'Jul'},
      // {...aug20moveOut, month: 'Aug'},
      // {...sep20moveOut, month: 'Sep'},
      // {...oct20moveOut, month: 'Oct'},
      // {...nov20moveOut, month: 'Nov'},
      // {...dec20moveOut, month: 'Dec'},
    ]
    
    return data;
  }

  mapToProvince(data: dfd.DataFrame, type: "movein"|"moveout"|"net", scope: "province"): any {
    let result: any = {};

    const d: any = data.values;
    switch (type) {
      case "moveout":
        data.head().print();
        data.columns.forEach((targetProvince: (string|number), idxr: number) => {
          if (typeof targetProvince == 'string') {
            data.index.forEach((sourceProvince: (string|number), idxc: number) => {
              if (idxr == idxc) return; // Don't regard self to self movement as movein
              const key = normalizeAsKey(sourceProvince as string);
              const current = result[key] ?? 0;
              const addition = d[idxr][idxc];
              result[key] = current + addition;
            });
          }
        });
        break;
      case "movein":
        data.index.forEach((sourceProvince: (string|number), idxr: number) => {
          if (typeof sourceProvince == 'string') {
            data.columns.forEach((column: string, idxc: number) => {
              if (idxr == idxc) return; // Don't regard self to self movement as moveout
              const key = normalizeAsKey(sourceProvince as string);
              const current = result[key] ?? 0;
              const addition = d[idxr][idxc];
              result[key] = current + addition;
            });
          }
        });
        break;
      case "net":
        data.index.forEach((sourceProvince: (string|number)) => {
          if (typeof sourceProvince == 'string') {
            const key = normalizeAsKey(sourceProvince as string);
            result[key] = data.loc({ rows: [sourceProvince] }).sum();
          }
        });
        break;
    }

    
    return result;
  }
}

export default MigrationDataProcessor;