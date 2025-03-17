/**
 * Checks if the code is running in a browser environment.
 * This is useful for SSR compatibility with localStorage.
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * Safely access localStorage, handling cases where it might not be available
 * (e.g., in SSR or when cookies are disabled)
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!isBrowser()) return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage.getItem failed:', e);
      return null;
    }
  },
  
  setItem: (key: string, value: string): boolean => {
    if (!isBrowser()) return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn('localStorage.setItem failed:', e);
      return false;
    }
  },
  
  removeItem: (key: string): boolean => {
    if (!isBrowser()) return false;
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn('localStorage.removeItem failed:', e);
      return false;
    }
  },
  
  clear: (): boolean => {
    if (!isBrowser()) return false;
    try {
      localStorage.clear();
      return true;
    } catch (e) {
      console.warn('localStorage.clear failed:', e);
      return false;
    }
  }
}; 