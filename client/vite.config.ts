import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'child_process'

// Get git information
const getGitInfo = () => {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
    const commit = execSync('git rev-parse --short HEAD').toString().trim()
    return { branch, commit }
  } catch {
    return { branch: 'unknown', commit: 'unknown' }
  }
}

const gitInfo = getGitInfo()

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg', 'apple-touch-icon.png', 'apple-touch-icon-152x152.png', 'apple-touch-icon-180x180.png', 'apple-touch-icon-167x167.png'],
      manifest: {
        name: 'JUnit Test Results Dashboard',
        short_name: 'JUnit Tests',
        description: 'View and analyze JUnit test results with detailed insights, trends, and failure analysis',
        theme_color: '#3b82f6',
        background_color: '#1e1e1e',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Cache API responses for offline access
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __GIT_BRANCH__: JSON.stringify(gitInfo.branch),
    __GIT_COMMIT__: JSON.stringify(gitInfo.commit),
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['klingon', 'localhost', '.local', 'klingon.tailfd6918.ts.net'],
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../public',
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/**/*.spec.ts', 'src/**/*.test.ts'],
    },
  },
})
