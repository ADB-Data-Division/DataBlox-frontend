import { createOvertourismAPIClient, OvertourismAPIClient } from './overtourism-client';
import { getSession } from 'next-auth/react';

/**
 * Create an authenticated Overtourism API client that automatically includes auth tokens
 */
export const createAuthenticatedOvertourismAPIClient = (baseURL?: string): OvertourismAPIClient => {
  return createOvertourismAPIClient(baseURL, async () => {
    try {
      const session = await getSession();
      return session?.accessToken || null;
    } catch (error) {
      console.error('Failed to get session for overtourism API:', error);
      return null;
    }
  });
};

// Export a singleton instance for convenience
export const authenticatedOvertourismApiClient = createAuthenticatedOvertourismAPIClient();
