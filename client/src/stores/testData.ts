import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TestRun, TestCase, Stats } from '../api/client'
import { apiClient } from '../api/client'

export const useTestDataStore = defineStore('testData', () => {
  // State
  const runs = ref<TestRun[]>([])
  const currentRun = ref<TestRun | null>(null)
  const cases = ref<TestCase[]>([])
  const stats = ref<Stats | null>(null)
  const projects = ref<string[]>([])
  const activeRequests = ref(0)
  const loading = computed(() => activeRequests.value > 0)
  const error = ref<string | null>(null)
  const globalProjectFilter = ref<string>('')

  // Computed
  const hasData = computed(() => runs.value.length > 0 || cases.value.length > 0)
  const latestRun = computed(() => (runs.value.length > 0 ? runs.value[0] : null))
  const availableProjects = computed(() => [...projects.value].sort())
  const startRequest = () => {
    activeRequests.value += 1
  }
  const finishRequest = () => {
    activeRequests.value = Math.max(0, activeRequests.value - 1)
  }

  // Actions
  async function fetchProjects() {
    startRequest()
    error.value = null
    try {
      projects.value = await apiClient.getProjects()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch projects'
      throw e
    } finally {
      finishRequest()
    }
  }

  async function fetchRuns(filters = {}) {
    startRequest()
    error.value = null
    try {
      const response = await apiClient.getRuns(filters)
      runs.value = response.runs
      return response
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch test runs'
      throw e
    } finally {
      finishRequest()
    }
  }

  async function fetchCases(filters = {}) {
    startRequest()
    error.value = null
    try {
      const response = await apiClient.getTestCases(filters)
      cases.value = response.cases
      return response
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch test cases'
      throw e
    } finally {
      finishRequest()
    }
  }

  async function fetchStats(filters = {}) {
    startRequest()
    error.value = null
    try {
      stats.value = await apiClient.getStats(filters)
      return stats.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch statistics'
      throw e
    } finally {
      finishRequest()
    }
  }

  async function uploadFile(file: File) {
    startRequest()
    error.value = null
    try {
      const result = await apiClient.uploadTestResults(file)
      // Refresh data after upload
      await Promise.all([fetchRuns(), fetchStats(), fetchProjects()])
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to upload file'
      throw e
    } finally {
      finishRequest()
    }
  }

  function setCurrentRun(run: TestRun | null) {
    currentRun.value = run
  }

  function clearError() {
    error.value = null
  }

  function setGlobalProjectFilter(projectName: string) {
    globalProjectFilter.value = projectName
  }

  function reset() {
    runs.value = []
    currentRun.value = null
    cases.value = []
    stats.value = null
    projects.value = []
    activeRequests.value = 0
    error.value = null
    globalProjectFilter.value = ''
  }

  return {
    // State
    runs,
    currentRun,
    cases,
    stats,
    projects,
    loading,
    error,
    globalProjectFilter,
    // Computed
    hasData,
    latestRun,
    availableProjects,
    // Actions
    fetchProjects,
    fetchRuns,
    fetchCases,
    fetchStats,
    uploadFile,
    setCurrentRun,
    clearError,
    setGlobalProjectFilter,
    reset,
  }
})
