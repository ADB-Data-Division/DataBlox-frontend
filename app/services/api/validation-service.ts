import { apiClient } from './client';
import { authenticatedApiClient } from './authenticated-client';
import { ValidationResponse } from './types';

/**
 * Service for validating migration datasets
 */
export class ValidationService {
  private validationCache = new Map<string, ValidationResponse>();
  private cacheExpiry = new Map<string, number>();
  private cacheDuration: number = 10 * 60 * 1000; // 10 minutes

  /**
   * Validate a dataset by item key
   */
  async validateDataset(itemKey: string, forceRefresh: boolean = false): Promise<ValidationResponse> {
    // Normalize item key
    const normalizedKey = this.normalizeItemKey(itemKey);
    
    // Check cache first
    if (!forceRefresh && this.isCacheValid(normalizedKey)) {
      const cached = this.validationCache.get(normalizedKey);
      if (cached) {
        return cached;
      }
    }

    try {
      // Use authenticated client for validation requests
      const result = await authenticatedApiClient.validateDataset(normalizedKey);
      
      // Cache the result
      this.validationCache.set(normalizedKey, result);
      this.cacheExpiry.set(normalizedKey, Date.now() + this.cacheDuration);
      
      return result;
    } catch (error) {
      console.error(`Failed to validate dataset ${normalizedKey}:`, error);
      throw error;
    }
  }

  /**
   * Validate multiple datasets concurrently
   */
  async validateMultipleDatasets(
    itemKeys: string[], 
    forceRefresh: boolean = false
  ): Promise<Map<string, ValidationResponse>> {
    const results = new Map<string, ValidationResponse>();
    
    // Process validation requests in parallel
    const validationPromises = itemKeys.map(async (itemKey) => {
      try {
        const result = await this.validateDataset(itemKey, forceRefresh);
        return { itemKey, result, error: null };
      } catch (error) {
        return { itemKey, result: null, error };
      }
    });

    const validationResults = await Promise.allSettled(validationPromises);
    
    validationResults.forEach((promiseResult, index) => {
      const itemKey = itemKeys[index];
      
      if (promiseResult.status === 'fulfilled') {
        const { result, error } = promiseResult.value;
        if (result) {
          results.set(itemKey, result);
        } else if (error) {
          console.error(`Validation failed for ${itemKey}:`, error);
        }
      } else {
        console.error(`Validation promise rejected for ${itemKey}:`, promiseResult.reason);
      }
    });

    return results;
  }

  /**
   * Get validation summary for multiple datasets
   */
  async getValidationSummary(
    itemKeys: string[], 
    forceRefresh: boolean = false
  ): Promise<{
    total: number;
    valid: number;
    invalid: number;
    results: Map<string, ValidationResponse>;
  }> {
    const results = await this.validateMultipleDatasets(itemKeys, forceRefresh);
    
    let valid = 0;
    let invalid = 0;
    
    results.forEach((validation) => {
      if (validation.valid) {
        valid++;
      } else {
        invalid++;
      }
    });

    return {
      total: itemKeys.length,
      valid,
      invalid,
      results
    };
  }

  /**
   * Filter datasets by validation status
   */
  async getValidDatasets(
    itemKeys: string[], 
    forceRefresh: boolean = false
  ): Promise<string[]> {
    const results = await this.validateMultipleDatasets(itemKeys, forceRefresh);
    
    return Array.from(results.entries())
      .filter(([_, validation]) => validation.valid)
      .map(([itemKey, _]) => itemKey);
  }

  /**
   * Filter datasets by validation status (invalid ones)
   */
  async getInvalidDatasets(
    itemKeys: string[], 
    forceRefresh: boolean = false
  ): Promise<Array<{ itemKey: string; validation: ValidationResponse }>> {
    const results = await this.validateMultipleDatasets(itemKeys, forceRefresh);
    
    return Array.from(results.entries())
      .filter(([_, validation]) => !validation.valid)
      .map(([itemKey, validation]) => ({ itemKey, validation }));
  }

  /**
   * Clear validation cache
   */
  clearCache(itemKey?: string): void {
    if (itemKey) {
      const normalizedKey = this.normalizeItemKey(itemKey);
      this.validationCache.delete(normalizedKey);
      this.cacheExpiry.delete(normalizedKey);
    } else {
      this.validationCache.clear();
      this.cacheExpiry.clear();
    }
  }

  /**
   * Check if cached validation is still valid
   */
  private isCacheValid(normalizedKey: string): boolean {
    const expiry = this.cacheExpiry.get(normalizedKey);
    return expiry !== undefined && Date.now() < expiry;
  }

  /**
   * Normalize item key according to API requirements
   */
  private normalizeItemKey(itemKey: string): string {
    // Remove any leading/trailing whitespace
    let normalized = itemKey.trim();
    
    // Ensure it matches the pattern ^[a-zA-Z0-9_-]+$
    if (!/^[a-zA-Z0-9_-]+$/.test(normalized)) {
      throw new Error(`Invalid item key format: "${itemKey}". Item key must contain only alphanumeric characters, hyphens, and underscores.`);
    }
    
    // Check length constraints
    if (normalized.length < 1 || normalized.length > 50) {
      throw new Error(`Invalid item key length: "${itemKey}". Item key must be between 1 and 50 characters.`);
    }
    
    return normalized;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    keys: string[];
    validEntries: number;
    expiredEntries: number;
  } {
    const now = Date.now();
    const keys = Array.from(this.validationCache.keys());
    let validEntries = 0;
    let expiredEntries = 0;

    keys.forEach(key => {
      const expiry = this.cacheExpiry.get(key);
      if (expiry && now < expiry) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });

    return {
      size: this.validationCache.size,
      keys,
      validEntries,
      expiredEntries
    };
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpiredCache(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now >= expiry) {
        this.validationCache.delete(key);
        this.cacheExpiry.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Validate item key format without making API call
   */
  static isValidItemKeyFormat(itemKey: string): boolean {
    if (!itemKey || itemKey.trim().length === 0) {
      return false;
    }
    
    const normalized = itemKey.trim();
    
    // Check pattern and length
    return /^[a-zA-Z0-9_-]+$/.test(normalized) && 
           normalized.length >= 1 && 
           normalized.length <= 50;
  }
}

// Export a default instance
export const validationService = new ValidationService(); 