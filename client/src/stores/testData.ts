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
  const loading = ref(false)
  const error = ref<string | null>(null)
  const globalProjectFilter = ref<string>('')

  // Computed
  const hasData = computed(() => runs.value.length > 0 || cases.value.length > 0)
  const latestRun = computed(() => (runs.value.length > 0 ? runs.value[0] : null))
  const availableProjects = computed(() => {
    const uniqueProjects = new Set<string>()
    runs.value.forEach(run => {
      if (run.ci_metadata?.job_name) {
        uniqueProjects.add(run.ci_metadata.job_name)
      }
    })
    return Array.from(uniqueProjects).sort()
  })

  // Actions
  async function fetchProjects() {
    loading.value = true
    error.value = null
    try {
      projects.value = await apiClient.getProjects()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch projects'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchRuns(filters = {}) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.getRuns(filters)
      runs.value = response.runs
      return response
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch test runs'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchCases(filters = {}) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.getTestCases(filters)
      cases.value = response.cases
      return response
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch test cases'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchStats(filters = {}) {
    loading.value = true
    error.value = null
    try {
      stats.value = await apiClient.getStats(filters)
      return stats.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch statistics'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function uploadFile(file: File) {
    loading.value = true
    error.value = null
    try {
      const result = await apiClient.uploadTestResults(file)
      // Refresh data after upload
      await Promise.all([fetchRuns(), fetchStats()])
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to upload file'
      throw e
    } finally {
      loading.value = false
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
    loading.value = false
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
