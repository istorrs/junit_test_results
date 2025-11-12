<template>
  <div class="app-layout">
    <nav class="navbar">
      <div class="navbar-content">
        <div class="logo">
          <h2>Test Results Viewer</h2>
        </div>

        <div class="nav-links">
          <router-link to="/" class="nav-link">Dashboard</router-link>
          <router-link to="/runs" class="nav-link">Test Runs</router-link>
          <router-link to="/cases" class="nav-link">Test Cases</router-link>
          <router-link to="/upload" class="nav-link">Upload</router-link>
          <div class="nav-separator"></div>
          <router-link to="/releases" class="nav-link">Releases</router-link>
          <router-link to="/compare" class="nav-link">Compare</router-link>
          <router-link to="/performance" class="nav-link">Performance</router-link>
          <button @click="toggleTheme" class="theme-toggle" :title="`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`">
            <span v-if="currentTheme === 'light'">🌙</span>
            <span v-else>☀️</span>
          </button>
        </div>
      </div>
    </nav>

    <main class="main-content">
      <router-view />
    </main>

    <footer class="app-footer">
      <div class="footer-content">
        <span class="version-info">
          <span class="env-badge" :class="isDev ? 'env-dev' : 'env-prod'">
            {{ isDev ? 'DEV' : 'PROD' }}
          </span>
          <span class="separator">•</span>
          <span class="git-info">{{ gitBranch }}@{{ gitCommit }}</span>
        </span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useTheme } from '../../composables/useTheme'

const { currentTheme, toggleTheme, initTheme } = useTheme()

const isDev = computed(() => import.meta.env.DEV)
const gitBranch = __GIT_BRANCH__
const gitCommit = __GIT_COMMIT__

onMounted(() => {
  initTheme()
})
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
}

.navbar {
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.nav-links {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.nav-separator {
  width: 1px;
  height: 1.5rem;
  background: var(--border-color);
  margin: 0 0.5rem;
}

.nav-link {
  text-decoration: none;
  color: var(--text-secondary);
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.nav-link:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.nav-link.router-link-active {
  color: var(--primary-color);
  background: var(--primary-bg);
}

.theme-toggle {
  padding: 0.5rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 1.25rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
}

.theme-toggle:hover {
  background: var(--bg-hover);
  border-color: var(--primary-color);
}

.main-content {
  flex: 1;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

.app-footer {
  background: var(--bg-primary);
  border-top: 1px solid var(--border-color);
  padding: 0.75rem 2rem;
}

.footer-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
}

.version-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-family: monospace;
}

.env-badge {
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-weight: 600;
  font-size: 0.625rem;
  letter-spacing: 0.05em;
}

.env-dev {
  background: var(--warning-bg);
  color: var(--warning-color);
}

.env-prod {
  background: var(--success-bg);
  color: var(--success-color);
}

.separator {
  color: var(--border-color);
}

.git-info {
  font-size: 0.75rem;
}
</style>
