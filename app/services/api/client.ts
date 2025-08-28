import { 
  APIConfig, 
  APIResponse, 
  MetadataResponse, 
  MigrationRequest, 
  MigrationResponse, 
  ValidationResponse,
  ErrorResponse 
} from './types';

/**
 * API Client for the Datablox Engine - Migrations API
 * Implements the OpenAPI 3.0.3 specification
 */
export class MigrationAPIClient {
  private baseURL: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;
  private connectivityCallback?: (connected: boolean) => void;

  constructor(config: APIConfig) {
    this.baseURL = config.baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = config.timeout || 30000; // 30 second default timeout
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...config.headers
    };
  }

  /**
   * Set callback function to update connectivity status
   */
  setConnectivityCallback(callback: (connected: boolean) => void) {
    this.connectivityCallback = callback;
  }

  /**
   * Generic HTTP request method
   */
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      let data: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Handle non-JSON responses
        data = await response.text() as unknown as T;
      }

      if (!response.ok) {
        // Handle API errors
        const errorData = data as unknown as ErrorResponse;
        throw new APIError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData
        );
      }

      // Update connectivity status on successful response
      this.connectivityCallback?.(true);

      return {
        data,
        status: response.status,
        statusText: response.statusText
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Update connectivity status on error
      this.connectivityCallback?.(false);
      
      if (error instanceof APIError) {
        throw error;
      }
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new APIError('Request timeout', 408);
      }
      
      throw new APIError(
        error instanceof Error ? error.message : 'Network error',
        0
      );
    }
  }

  /**
   * GET /api/v1/metadata
   * Retrieves metadata about available provinces, districts, subdistricts, and time periods
   */
  async getMetadata(): Promise<MetadataResponse> {
    const response = await this.request<MetadataResponse>('/api/v1/metadata', {
      method: 'GET'
    });
    return response.data;
  }

  /**
   * POST /api/v1/migrations
   * Retrieves migration data based on specified parameters
   */
  async getMigrations(request: MigrationRequest): Promise<MigrationResponse> {
    const response = await this.request<MigrationResponse>('/api/v1/migrations', {
      method: 'POST',
      body: JSON.stringify(request)
    });
    return response.data;
  }

  /**
   * POST /api/v1/datasets/{item_key}/validate
   * Validates migration dataset files for the specified item key
   */
  async validateDataset(itemKey: string): Promise<ValidationResponse> {
    const response = await this.request<ValidationResponse>(
      `/api/v1/datasets/${encodeURIComponent(itemKey)}/validate`,
      {
        method: 'POST'
      }
    );
    return response.data;
  }

  /**
   * Health check method to test API connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Use metadata endpoint as a health check
      await this.getMetadata();
      return true;
    } catch (error) {
      console.warn('API health check failed:', error);
      return false;
    }
  }
}

/**
 * Custom API Error class
 */
export class APIError extends Error {
  public status: number;
  public details?: ErrorResponse;

  constructor(message: string, status: number, details?: ErrorResponse) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.details = details;
  }

  /**
   * Check if error is a specific HTTP status
   */
  is(status: number): boolean {
    return this.status === status;
  }

  /**
   * Check if error is a client error (4xx)
   */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Check if error is a server error (5xx)
   */
  isServerError(): boolean {
    return this.status >= 500 && this.status < 600;
  }
}

/**
 * Default API client instance
 * Can be configured based on environment
 */
export const createAPIClient = (baseURL?: string): MigrationAPIClient => {
  // Default to localhost:2020 as specified in OpenAPI spec
  const apiBaseURL = baseURL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:2020';
  
  return new MigrationAPIClient({
    baseURL: apiBaseURL,
    timeout: 30000,
    headers: {
      // Add any default headers here
    }
  });
};

// Export a default client instance
export const apiClient = createAPIClient(); 