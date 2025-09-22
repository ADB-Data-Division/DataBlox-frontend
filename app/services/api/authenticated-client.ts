import { createAPIClient } from './client';
import { getClientAccessToken } from '@/app/lib/auth-utils';

/**
 * Create an authenticated API client for use in client-side components
 * This client automatically includes the bearer token from the user's session
 */
export const createAuthenticatedAPIClient = () => {
  return createAPIClient(
    process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:2020',
    getClientAccessToken
  );
};

/**
 * Export a default authenticated client instance for client-side use
 */
export const authenticatedApiClient = createAuthenticatedAPIClient();
