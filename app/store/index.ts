import { configureStore } from '@reduxjs/toolkit';
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER
} from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web
import { isBrowser } from './utils';
import datasetReducer from './features/datasetSlice';
import userPreferencesReducer from './features/userPreferencesSlice';

// Configure persistence for dataset
const datasetPersistConfig = {
  key: 'dataset',
  storage,
  // You can blacklist specific parts of the state if needed
  // blacklist: ['somePartToNotPersist']
};

// Configure persistence for user preferences
const userPreferencesPersistConfig = {
  key: 'userPreferences',
  storage,
};

// Create persisted reducers
const persistedDatasetReducer = persistReducer(datasetPersistConfig, datasetReducer);
const persistedUserPreferencesReducer = persistReducer(userPreferencesPersistConfig, userPreferencesReducer);

// Create store with persisted reducers
export const store = configureStore({
  reducer: {
    dataset: persistedDatasetReducer,
    userPreferences: persistedUserPreferencesReducer,
    // Add other reducers here as needed
  },
  // Add middleware to handle redux-persist actions
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// Create persistor only in browser environment
export const persistor = isBrowser() ? persistStore(store) : null;

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 