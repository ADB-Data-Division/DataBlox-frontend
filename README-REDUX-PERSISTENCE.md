# Redux Persistence Implementation

This document outlines how Redux state persistence is implemented in this application using `redux-persist`.

## Overview

The application uses Redux for state management and `redux-persist` to save the state to the browser's localStorage. This allows the application to maintain user preferences and settings between sessions.

## Key Components

### 1. Redux Store Configuration (`app/store/index.ts`)

The Redux store is configured to use `redux-persist` to persist the state to localStorage:

```typescript
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Configure persistence
const persistConfig = {
  key: 'root',
  storage,
  // You can blacklist specific parts of the state if needed
  // blacklist: ['somePartToNotPersist']
};

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, datasetReducer);

// Create store with persisted reducer
export const store = configureStore({
  reducer: {
    dataset: persistedReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// Create persistor
export const persistor = isBrowser() ? persistStore(store) : null;
```

### 2. Redux Provider (`app/store/provider.tsx`)

The Redux provider is wrapped with `PersistGate` to ensure that the persisted state is loaded before rendering the application:

```typescript
export function ReduxProvider({ children }: { children: React.ReactNode }) {
  // In SSR, we don't want to use PersistGate
  if (!isBrowser() || !persistor) {
    return <Provider store={store}>{children}</Provider>;
  }
  
  // In browser environment, use PersistGate
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
}
```

### 3. Persistence Utilities (`app/store/hooks.ts`)

Custom hooks are provided to manage the persisted state:

```typescript
export const usePersistStore = () => {
  const dispatch = useAppDispatch();
  
  // Clear all persisted data
  const clearPersistedData = useCallback(() => {
    dispatch(clearPersistedState());
    if (isBrowser() && persistor) {
      persistor.purge();
    }
  }, [dispatch]);
  
  // Pause persistence
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
    isPersistenceAvailable: isBrowser() && !!persistor
  };
};
```

### 4. SSR Compatibility (`app/store/utils.ts`)

Utilities are provided to ensure compatibility with server-side rendering:

```typescript
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

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
  // ... other methods
};
```

## Usage

### Accessing Persisted State

The persisted state can be accessed using the `useAppSelector` hook:

```typescript
import { useAppSelector } from '@/app/store/hooks';

function MyComponent() {
  const { datasetId, timePeriod } = useAppSelector(state => state.dataset);
  
  // Use the persisted state
  return (
    <div>
      <p>Selected Dataset: {datasetId}</p>
      <p>Time Period: {timePeriod}</p>
    </div>
  );
}
```

### Managing Persisted State

The persisted state can be managed using the `usePersistStore` hook:

```typescript
import { usePersistStore } from '@/app/store/hooks';

function PersistenceControls() {
  const { clearPersistedData, pausePersistence, resumePersistence } = usePersistStore();
  
  return (
    <div>
      <button onClick={clearPersistedData}>Clear Persisted Data</button>
      <button onClick={pausePersistence}>Pause Persistence</button>
      <button onClick={resumePersistence}>Resume Persistence</button>
    </div>
  );
}
```

## Customization

### Blacklisting State

You can blacklist specific parts of the state to prevent them from being persisted:

```typescript
const persistConfig = {
  key: 'root',
  storage,
  blacklist: ['temporaryData', 'sensitiveData']
};
```

### Whitelisting State

Alternatively, you can whitelist specific parts of the state to only persist those parts:

```typescript
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['userPreferences', 'settings']
};
```

### Using Different Storage

You can use different storage engines, such as sessionStorage:

```typescript
import storageSession from 'redux-persist/lib/storage/session';

const persistConfig = {
  key: 'root',
  storage: storageSession,
};
```

## Troubleshooting

### Clearing Persisted State

If you need to clear the persisted state, you can use the `clearPersistedData` function from the `usePersistStore` hook:

```typescript
const { clearPersistedData } = usePersistStore();
clearPersistedData();
```

### Disabling Persistence

If you need to temporarily disable persistence, you can use the `pausePersistence` function from the `usePersistStore` hook:

```typescript
const { pausePersistence } = usePersistStore();
pausePersistence();
```

### Enabling Persistence

If you need to re-enable persistence after disabling it, you can use the `resumePersistence` function from the `usePersistStore` hook:

```typescript
const { resumePersistence } = usePersistStore();
resumePersistence();
``` 