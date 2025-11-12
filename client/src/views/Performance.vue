<template>
  <div class="performance-view">
    <div class="page-header">
      <h1>Performance Trends</h1>
      <p class="subtitle">Track test execution times and detect performance regressions</p>
    </div>

    <Card title="🚧 Coming Soon">
      <div class="placeholder">
        <p>Performance trends feature is under development.</p>
        <p>This will allow you to:</p>
        <ul>
          <li>View test execution time trends over time</li>
          <li>Identify slowest tests automatically</li>
          <li>Detect performance regressions</li>
          <li>Track performance baselines</li>
        </ul>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import Card from '../components/shared/Card.vue'
</script>

<style scoped>
.performance-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem;
}

.subtitle {
  color: var(--text-secondary);
  margin: 0;
}

.placeholder {
  padding: 2rem;
  text-align: center;
}

.placeholder p {
  color: var(--text-secondary);
  margin: 0.5rem 0;
}

.placeholder ul {
  list-style: none;
  padding: 0;
  margin: 1.5rem 0;
}

.placeholder li {
  padding: 0.5rem;
  color: var(--text-primary);
}
</style>
