import { 
  APIConfig, 
  APIResponse, 
  OvertourismRequest, 
  OvertourismResponse, 
  OvertourismMetadataResponse,
  ErrorResponse 
} from './types';

/**
 * API Client for the Datablox Engine - Overtourism API
 * Separate from MigrationAPIClient to maintain separation of concerns
 */
export class OvertourismAPIClient {
  private baseURL: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;
  private connectivityCallback?: (connected: boolean) => void;
  private getAccessToken?: () => Promise<string | null>;

  constructor(config: APIConfig) {
    this.baseURL = config.baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = config.timeout || 30000; // 30 second default timeout
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...config.headers
    };
    this.getAccessToken = config.getAccessToken;
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

    // Get access token if available
    const accessToken = this.getAccessToken ? await this.getAccessToken() : null;
    
    // Prepare headers with optional authorization
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(options.headers && typeof options.headers === 'object' && !(options.headers instanceof Headers)
        ? options.headers as Record<string, string>
        : {})
    };
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
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
        
        if (response.status === 401) {
          const errorMessage = errorData.message || errorData.detail || '';
          if (errorMessage.toLowerCase().includes('token has expired')) {
            if (typeof window !== 'undefined') {
              window.location.href = '/auth/signin';
            }
          }
        }
        
        throw new OvertourismAPIError(
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
      
      if (error instanceof OvertourismAPIError) {
        throw error;
      }
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new OvertourismAPIError('Request timeout', 408);
      }
      
      throw new OvertourismAPIError(
        error instanceof Error ? error.message : 'Network error',
        0
      );
    }
  }

  /**
   * GET /api/v1/overtourism/metadata
   * Retrieves metadata about data coverage for overtourism calculations
   */
  async getMetadata(): Promise<OvertourismMetadataResponse> {
    const response = await this.request<OvertourismMetadataResponse>('/api/v1/overtourism/metadata', {
      method: 'GET'
    });
    return response.data;
  }

  /**
   * POST /api/v1/overtourism
   * Retrieves computed overtourism metrics
   */
  async getOvertourism(request: OvertourismRequest): Promise<OvertourismResponse> {
    const response = await this.request<OvertourismResponse>('/api/v1/overtourism', {
      method: 'POST',
      body: JSON.stringify(request)
    });
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
      console.warn('Overtourism API health check failed:', error);
      return false;
    }
  }
}

/**
 * Custom Overtourism API Error class
 */
export class OvertourismAPIError extends Error {
  public status: number;
  public details?: ErrorResponse;

  constructor(message: string, status: number, details?: ErrorResponse) {
    super(message);
    this.name = 'OvertourismAPIError';
    this.status = status;
    this.details = details;
  }

  is(status: number): boolean {
    return this.status === status;
  }

  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  isServerError(): boolean {
    return this.status >= 500 && this.status < 600;
  }

  isExpiredToken(): boolean {
    if (this.status !== 401) return false;
    const message = this.details?.message || this.details?.detail || this.message || '';
    return message.toLowerCase().includes('token has expired');
  }
}

/**
 * Default Overtourism API client instance factory
 */
export const createOvertourismAPIClient = (
  baseURL?: string, 
  getAccessToken?: () => Promise<string | null>
): OvertourismAPIClient => {
  const apiBaseURL = baseURL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:2020';
  
  return new OvertourismAPIClient({
    baseURL: apiBaseURL,
    timeout: 30000,
    headers: {},
    getAccessToken
  });
};

// Export a default client instance
export const overtourismApiClient = createOvertourismAPIClient();
