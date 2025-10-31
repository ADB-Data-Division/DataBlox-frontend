import { auth } from '@/auth';
import { getSession } from 'next-auth/react';

/**
 * Server-side function to get access token from NextAuth session
 * Use this in server components and API routes
 */
export async function getServerAccessToken(): Promise<string | null> {
  try {
    const session = await auth();
    return (session as any)?.accessToken || null;
  } catch (error) {
    console.error('Error getting server access token:', error);
    return null;
  }
}

/**
 * Client-side function to get access token from NextAuth session
 * Use this in client components and hooks
 */
export async function getClientAccessToken(): Promise<string | null> {
  try {
    const session = await getSession();
    return (session as any)?.accessToken || null;
  } catch (error) {
    console.error('Error getting client access token:', error);
    return null;
  }
}

/**
 * Generic function that works in both server and client contexts
 * Attempts to get token from session parameter if provided, otherwise uses appropriate method
 */
export function getAccessTokenFromSession(session: any): string | null {
  return session?.accessToken || null;
}
