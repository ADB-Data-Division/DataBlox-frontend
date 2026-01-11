import { createTourismAPIClient, TourismAPIClient } from './tourism-client';
import { getSession } from 'next-auth/react';

/**
 * Create an authenticated Tourism API client that automatically includes auth tokens
 */
export const createAuthenticatedTourismAPIClient = (baseURL?: string): TourismAPIClient => {
  return createTourismAPIClient(baseURL, async () => {
    try {
      const session = await getSession();
      return session?.accessToken || null;
    } catch (error) {
      console.error('Failed to get session for tourism API:', error);
      return null;
    }
  });
};

// Export a singleton instance for convenience
export const authenticatedTourismApiClient = createAuthenticatedTourismAPIClient();
