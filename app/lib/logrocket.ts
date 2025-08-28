/**
 * LogRocket configuration and initialization
 */
import LogRocket from 'logrocket';

const LOGROCKET_APP_ID = 'bjdyev/datablox';

/**
 * Initialize LogRocket
 * Should only be called on the client side
 */
export function initLogRocket(): void {
  // Only initialize in browser environment
  if (typeof window === 'undefined') {
    return;
  }

  // Only initialize in production or when explicitly enabled
  const shouldInitialize = 
    process.env.NODE_ENV === 'production' || 
    process.env.NEXT_PUBLIC_LOGROCKET_ENABLED === 'true';

  if (!shouldInitialize) {
    console.log('LogRocket initialization skipped (not in production)');
    return;
  }

  try {
    LogRocket.init(LOGROCKET_APP_ID);
    console.log('LogRocket initialized successfully');
  } catch (error) {
    console.error('Failed to initialize LogRocket:', error);
  }
}

/**
 * Identify a user in LogRocket
 */
export function identifyUser(userId: string, userInfo?: Record<string, any>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    LogRocket.identify(userId, userInfo);
  } catch (error) {
    console.error('Failed to identify user in LogRocket:', error);
  }
}

/**
 * Add custom tags to the current session
 */
export function addSessionTags(tags: Record<string, string>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // LogRocket uses getSessionURL() and track() for metadata
    // We'll use track() to record session information
    LogRocket.track('Session Tags', tags);
  } catch (error) {
    console.error('Failed to add LogRocket tags:', error);
  }
}

/**
 * Capture custom events
 */
export function captureEvent(eventName: string, properties?: Record<string, any>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    LogRocket.track(eventName, properties);
  } catch (error) {
    console.error('Failed to capture LogRocket event:', error);
  }
}

export default LogRocket;