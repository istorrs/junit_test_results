# Vue 3 Migration Guide

## Overview

This project has been successfully migrated from vanilla HTML/CSS/JavaScript to a modern Vue 3 + TypeScript + Vite stack. This guide covers the new architecture, development workflow, and deployment process.

## What Changed

### Before (Vanilla JS)
- **15,391 lines** of vanilla JavaScript across 13 modules
- 10 separate HTML pages with duplicated structure
- Global scope pollution and manual DOM manipulation
- CDN dependencies (ECharts, Anime.js)
- No build step, no type checking, no testing framework

### After (Vue 3)
- **Modern single-page application** with Vue 3 Composition API
- Component-based architecture with TypeScript
- Centralized state management with Pinia
- Client-side routing with Vue Router
- **87 passing unit tests** with Vitest
- Vite build system for fast development and optimized production builds

## Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Vue 3.5 | Reactive UI framework with Composition API |
| **Language** | TypeScript 5.9 | Type-safe JavaScript |
| **Build Tool** | Vite 7.2 | Fast dev server and optimized builds |
| **Routing** | Vue Router 4 | Client-side navigation |
| **State Management** | Pinia | Centralized application state |
| **Testing** | Vitest + Vue Test Utils | Unit testing framework |
| **Code Quality** | ESLint + Prettier | Code linting and formatting |

### Project Structure

```
client/
├── src/
│   ├── api/                    # API client layer
│   │   ├── client.ts           # HTTP client with typed endpoints
│   │   └── client.test.ts      # API client tests (14 tests)
│   │
│   ├── components/             # Reusable components
│   │   ├── shared/             # Shared UI components
│   │   │   ├── Button.vue      # Button with variants and states
│   │   │   ├── Button.test.ts  # (11 tests)
│   │   │   ├── Card.vue        # Content container
│   │   │   ├── Card.test.ts    # (10 tests)
│   │   │   ├── Modal.vue       # Modal dialog with Teleport
│   │   │   └── Modal.test.ts   # (12 tests)
│   │   │
│   │   └── layout/             # Layout components
│   │       └── AppLayout.vue   # Main app layout with navigation
│   │
│   ├── views/                  # Page components
│   │   ├── Dashboard.vue       # Statistics overview
│   │   ├── TestRuns.vue        # Test runs list
│   │   ├── TestCases.vue       # Test cases with filtering
│   │   └── Upload.vue          # File upload interface
│   │
│   ├── stores/                 # Pinia stores
│   │   └── testData.ts         # Test data state management
│   │
│   ├── router/                 # Vue Router configuration
│   │   └── index.ts            # Routes and navigation guards
│   │
│   ├── utils/                  # Utility functions
│   │   ├── formatters.ts       # Data formatting utilities
│   │   └── formatters.test.ts  # (38 tests)
│   │
│   ├── App.vue                 # Root component
│   └── main.ts                 # Application entry point
│
├── public/                     # Static assets
├── tests/                      # Test utilities
├── package.json                # Dependencies
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
└── eslint.config.js            # ESLint configuration
```

## Key Features

### 1. API Client (src/api/client.ts)

Type-safe HTTP client with methods for all backend endpoints:

```typescript
import { apiClient } from '@/api/client'

// Fetch test runs with filters
const { runs, pagination } = await apiClient.getRuns({
  page: 1,
  limit: 50,
  job_name: 'CI Pipeline',
  branch: 'main'
})

// Get statistics
const stats = await apiClient.getStats({
  from_date: '2025-01-01',
  to_date: '2025-01-31'
})

// Upload test results
const result = await apiClient.uploadTestResults(file)
```

### 2. State Management (Pinia Store)

Centralized state with automatic reactivity:

```typescript
import { useTestDataStore } from '@/stores/testData'

const store = useTestDataStore()

// Fetch data
await store.fetchRuns()
await store.fetchStats()

// Access reactive state
console.log(store.runs)      // Test runs array
console.log(store.stats)     // Statistics object
console.log(store.loading)   // Loading state
console.log(store.error)     // Error message

// Computed properties
console.log(store.hasData)   // boolean
console.log(store.latestRun) // most recent run
```

### 3. Shared Components

#### Button Component

```vue
<Button
  variant="primary"  // primary, secondary, danger, success
  size="md"          // sm, md, lg
  :loading="isLoading"
  :disabled="isDisabled"
  :fullWidth="false"
  @click="handleClick"
>
  Click Me
</Button>
```

#### Card Component

```vue
<Card
  title="Card Title"
  :noPadding="false"
  :noShadow="false"
  :clickable="false"
>
  <template #title>Custom Title</template>
  Card content goes here
  <template #footer>Footer actions</template>
</Card>
```

#### Modal Component

```vue
<Modal
  :open="isOpen"
  title="Modal Title"
  size="md"           // sm, md, lg, full
  :closeOnOverlay="true"
  :hideClose="false"
  @close="handleClose"
>
  Modal content
  <template #footer>
    <Button @click="handleSave">Save</Button>
  </template>
</Modal>
```

### 4. Utility Functions

```typescript
import {
  formatDate,
  formatDuration,
  formatPercentage,
  formatNumber,
  getStatusColor,
  getStatusIcon,
  formatFileSize,
  truncateText
} from '@/utils/formatters'

formatDate(new Date())                // "Jan 15, 2025, 10:30 AM"
formatDuration(2500)                  // "2.50s"
formatPercentage(85.678)              // "85.68%"
formatNumber(1234567)                 // "1,234,567"
getStatusColor('passed')              // "green"
getStatusIcon('failed')               // "✗"
formatFileSize(2048)                  // "2.00 KB"
truncateText('Long text...', 20)      // "Long text..."
```

## Development Workflow

### Prerequisites

- Node.js 18+ and npm 10+
- Backend API running on port 3000

### Installation

```bash
cd client
npm install
```

### Development

```bash
# Start dev server with hot reload (http://localhost:5173)
npm run dev

# Run tests in watch mode
npm test

# Run tests with coverage
npm test:coverage

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Building for Production

```bash
# Build for production
npm run build

# Output: ../public/ (integrates with backend)

# Preview production build
npm run preview
```

### Testing

```bash
# Run all tests
npm test -- --run

# Run specific test file
npm test -- src/api/client.test.ts

# Run with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

**Current Test Coverage:**
- 87 tests passing
- 6 test files
- Coverage includes:
  - API client (14 tests)
  - Formatters (38 tests)
  - Button component (11 tests)
  - Card component (10 tests)
  - Modal component (12 tests)
  - Sample tests (2 tests)

## Migration Benefits

### Developer Experience

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Type Safety** | ❌ None | ✅ Full TypeScript | Catch errors at compile time |
| **Testing** | ❌ None | ✅ 87 unit tests | Prevent regressions |
| **Code Reuse** | ❌ Low (duplicated HTML) | ✅ High (components) | 10 pages → shared components |
| **Build Time** | ⚡ 0s (no build) | ⚡ ~2s (Vite) | Fast HMR in development |
| **Bundle Size** | ~50kb (CDN) | ~120kb (optimized) | Tree-shaking, code splitting |
| **Dev Server** | ❌ Manual refresh | ✅ Hot Module Replacement | Instant updates |
| **Maintainability** | 😰 Hard | 😊 Easy | Component-based architecture |

### Code Quality

1. **Type Safety**: TypeScript catches errors before runtime
2. **Testing**: Comprehensive unit test coverage
3. **Linting**: ESLint enforces code standards
4. **Formatting**: Prettier ensures consistent style
5. **Component Isolation**: Each component is self-contained
6. **State Management**: Centralized, predictable state

### Performance

1. **Code Splitting**: Lazy-loaded routes reduce initial bundle
2. **Tree Shaking**: Unused code is eliminated
3. **Minification**: Production builds are optimized
4. **Caching**: Proper cache headers for static assets
5. **Reactivity**: Efficient DOM updates with Vue's reactivity system

## Deployment

### Docker Integration

The Vue app builds to `public/` directory, which is served by the existing Express backend.

**Updated Dockerfile** (for backend):

```dockerfile
# Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Backend + Frontend
FROM node:22-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --production
COPY backend/ ./
COPY --from=frontend-build /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables

Add to `.env`:

```bash
# Frontend build variables
VITE_API_URL=http://localhost:3000
```

### Production Checklist

- [ ] Run `npm test` - all tests passing
- [ ] Run `npm run lint` - no linting errors
- [ ] Run `npm run build` - successful build
- [ ] Test production build with `npm run preview`
- [ ] Verify API integration
- [ ] Check browser console for errors
- [ ] Test all routes and features
- [ ] Verify file upload functionality
- [ ] Check responsive design on mobile

## Common Issues & Solutions

### Issue: API calls fail with 404

**Solution**: Ensure backend is running on port 3000 and Vite proxy is configured:

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

### Issue: Tests fail with module resolution errors

**Solution**: Check TypeScript configuration and ensure all dependencies are installed:

```bash
npm install
npm test -- --run
```

### Issue: Hot reload not working

**Solution**: Check Vite dev server is running and no conflicting processes on port 5173:

```bash
lsof -i :5173
npm run dev
```

## Future Enhancements

### Recommended Additions

1. **ECharts Integration**: Add data visualization components
   ```bash
   npm install echarts vue-echarts
   ```

2. **Tailwind CSS**: Add utility-first CSS framework
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

3. **End-to-End Testing**: Add Playwright or Cypress
   ```bash
   npm install -D @playwright/test
   ```

4. **Component Library**: Consider Vue 3 UI libraries
   - Headless UI
   - Radix Vue
   - PrimeVue

5. **State Persistence**: Add Pinia plugin for localStorage
   ```bash
   npm install pinia-plugin-persistedstate
   ```

## Resources

- [Vue 3 Documentation](https://vuejs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Vue Router Documentation](https://router.vuejs.org/)
- [Vitest Documentation](https://vitest.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Support

For issues or questions about the Vue 3 migration:

1. Check this documentation
2. Review test files for usage examples
3. Consult Vue 3 and Vite documentation
4. Open an issue on GitHub

---

**Migration completed with TDD approach - all 87 tests passing!** ✨
