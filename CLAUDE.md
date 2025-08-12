# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server on localhost:3000
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run Jest tests

### Docker
- `npm run build-image` - Build Docker image
- `npm run push-image` - Push to GitHub Container Registry
- `npm run docker-login` - Authenticate with Docker registry
- `npm run build-and-push-image` - Build and push in one command

### Testing
- Jest configuration uses ts-jest for TypeScript
- Tests located in `src/tests/` directory
- Use `@/` path alias for imports

## Architecture Overview

This is a Next.js 15 application built with TypeScript that visualizes migration and tourism data for Thailand. The architecture follows a modern React pattern with Redux for state management.

### Core Technologies
- **Framework**: Next.js 15 with App Router
- **UI**: Material-UI (MUI) v7 with Toolpad Core
- **State Management**: Redux Toolkit with Redux Persist
- **Data Visualization**: D3.js, MUI X Charts, custom chord diagrams
- **Maps**: Leaflet with custom GeoJSON overlays
- **Authentication**: NextAuth.js with Auth0 provider
- **Data Processing**: Danfo.js (pandas-like library for JavaScript)

### State Management Architecture
- Redux store configured with persistence in `app/store/`
- Two main slices: `datasetSlice` and `userPreferencesSlice`
- State persisted to localStorage with selective persistence
- Redux Provider wraps the entire application

### Data Layer
- Migration data processing in `app/services/data-loader/`
- API services in `app/services/api/` handle data transformation
- GeoJSON data for Thailand administrative boundaries (provinces, districts, subdistricts)
- CSV datasets for migration and tourism data

### Visualization Components
- `chord-diagram/` - D3-based migration flow visualization
- `migration-flow-diagram/` - Node-based migration visualization
- `leaflet/` - Map-based visualizations with administrative overlays
- `migration-results-table/` - Tabular data display
- All visualizations support interactive filtering and real-time updates

### App Structure
- Uses Next.js App Router with nested layouts
- Dashboard pages organized by visualization type: `overview/`, `migration-flow/`, `inter-province/`, `intra-province/`
- Each page has corresponding `page-content.tsx` for separation of concerns
- Shared visualization toolbar with filtering controls

### Authentication & Security
- Auth0 integration via NextAuth.js
- Protected routes using middleware
- Environment variables for Auth0 configuration

### Key Features
- Interactive province/district filtering
- Date range selection for temporal analysis
- Multiple visualization types (chord diagrams, maps, tables, charts)
- Data export capabilities
- Theme switching (forced light mode currently)
- Responsive design with MUI components

### Configuration
- TypeScript configuration uses path aliases (`@/` → root)
- Multiple Next.js configs for different environments (dev/prod)
- Docker multi-stage build with Node.js 20 Alpine
- Ansible deployment configurations in `ansible/` directory

## Important Notes

🤖 Cursor Rules acknowledged.

From .cursorrules:
- Never use `npm run build` to test changes during development

### Environment Setup
- Requires Auth0 credentials in `.env.local`
- Run `npx auth secret` to generate NextAuth secret
- Add CLIENT_ID and CLIENT_SECRET for OAuth provider

### Data Sources
- Thailand administrative boundary data (GeoJSON format)
- Migration matrices and tourism count datasets
- Sample datasets in `public/` directory for development

This application handles large datasets and complex visualizations, so performance considerations are important when making changes to data processing or rendering logic.