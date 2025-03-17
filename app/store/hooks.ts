import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';
import { useCallback } from 'react';
import { persistor } from './index';
import { clearPersistedState } from './features/datasetSlice';
import { isBrowser } from './utils';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Hook for managing persisted state
export const usePersistStore = () => {
  const dispatch = useAppDispatch();
  
  // Clear all persisted data
  const clearPersistedData = useCallback(() => {
    // Clear Redux state
    dispatch(clearPersistedState());
    // Purge persistor if available
    if (isBrowser() && persistor) {
      persistor.purge();
    }
  }, [dispatch]);
  
  // Pause persistence (useful when you want to temporarily disable persistence)
  const pausePersistence = useCallback(() => {
    if (isBrowser() && persistor) {
      persistor.pause();
    }
  }, []);
  
  // Resume persistence
  const resumePersistence = useCallback(() => {
    if (isBrowser() && persistor) {
      persistor.persist();
    }
  }, []);
  
  return {
    clearPersistedData,
    pausePersistence,
    resumePersistence,
    // Flag to indicate if persistence is available
    isPersistenceAvailable: isBrowser() && !!persistor
  };
}; 