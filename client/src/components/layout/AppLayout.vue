<template>
  <div class="app-layout">
    <nav class="navbar">
      <div class="navbar-content">
        <div class="logo">
          <h2>JUnit Test Results</h2>
        </div>

        <div class="nav-links">
          <router-link to="/" class="nav-link">Dashboard</router-link>
          <router-link to="/runs" class="nav-link">Test Runs</router-link>
          <router-link to="/cases" class="nav-link">Test Cases</router-link>
          <router-link to="/upload" class="nav-link">Upload</router-link>
        </div>
      </div>
    </nav>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f3f4f6;
}

.navbar {
  background: white;
  border-bottom: 1px solid #e5e7eb;
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
  color: #111827;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-link {
  text-decoration: none;
  color: #6b7280;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.nav-link:hover {
  color: #111827;
  background: #f3f4f6;
}

.nav-link.router-link-active {
  color: #3b82f6;
  background: #eff6ff;
}

.main-content {
  flex: 1;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}
</style>
