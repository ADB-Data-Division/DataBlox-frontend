# Authentication Implementation for API Requests

## Summary
This document outlines the implementation of bearer token authentication for API requests to `/metadata` and `/migrations` endpoints using Auth0 and NextAuth.js.

## Changes Made

### 1. NextAuth Configuration (`auth.ts`)
- Added JWT callback to persist OAuth access_token
- Added session callback to include access_token in client-side session
- Access tokens from Auth0 are now available in the session object

### 2. Authentication Utilities (`app/lib/auth-utils.ts`)
- `getServerAccessToken()`: Gets access token from server-side session
- `getClientAccessToken()`: Gets access token from client-side session 
- `getAccessTokenFromSession()`: Utility to extract token from session object

### 3. API Client Enhancement (`app/services/api/client.ts`)
- Modified `MigrationAPIClient` constructor to accept optional `getAccessToken` function
- Updated `request()` method to automatically include `Authorization: Bearer <token>` header
- Enhanced `APIConfig` interface to support access token provider

### 4. Authenticated Client Factory (`app/services/api/authenticated-client.ts`)
- Created `createAuthenticatedAPIClient()` function that automatically configures authentication
- Exported `authenticatedApiClient` instance for immediate use

### 5. Service Layer Updates
- **MetadataService**: Now uses `authenticatedApiClient` for all metadata requests
- **MigrationService**: Now uses `authenticatedApiClient` for all migration requests  
- **ValidationService**: Now uses `authenticatedApiClient` for all validation requests

### 6. Type Definitions (`types/next-auth.d.ts`)
- Extended NextAuth session and JWT interfaces to include `accessToken` property
- Provides proper TypeScript support for the enhanced session

## How It Works

1. **Authentication Flow**:
   - User signs in with Auth0 via NextAuth.js
   - Auth0 access token is captured and stored in the JWT
   - Access token is made available in the client-side session

2. **API Request Flow**:
   - Services use `authenticatedApiClient` which is configured with `getClientAccessToken`
   - Before each API request, the client automatically retrieves the current access token
   - If token exists, it's included as `Authorization: Bearer <token>` header
   - Request proceeds to the backend with authentication

3. **Fallback Behavior**:
   - If no access token is available, requests proceed without authentication
   - Backend can handle authenticated vs unauthenticated requests as needed

## Usage

### For New Services
```typescript
import { authenticatedApiClient } from '@/app/services/api/authenticated-client';

// All requests will automatically include bearer token
const metadata = await authenticatedApiClient.getMetadata();
const migrations = await authenticatedApiClient.getMigrations(request);
```

### For Custom Authentication
```typescript
import { createAPIClient } from '@/app/services/api/client';
import { getClientAccessToken } from '@/app/lib/auth-utils';

const customClient = createAPIClient(
  'https://api.example.com',
  getClientAccessToken
);
```

## Verification

All API requests to `/metadata` and `/migrations` endpoints now automatically include the bearer token when a user is authenticated. This ensures that:

1. Authenticated users can access protected resources
2. The backend receives proper authorization headers
3. Token handling is transparent to the application logic
4. No manual token management is required in components

## Environment Requirements

Ensure these environment variables are configured:
- `AUTH0_CLIENT_ID`: Auth0 application client ID
- `AUTH0_CLIENT_SECRET`: Auth0 application client secret  
- `AUTH0_ISSUER`: Auth0 domain/issuer URL
- `AUTH_SECRET`: NextAuth.js secret key
- `NEXT_PUBLIC_BACKEND_URL`: Backend API base URL
