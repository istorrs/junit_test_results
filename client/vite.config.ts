import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
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
  plugins: [vue()],
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
