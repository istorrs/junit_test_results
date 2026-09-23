import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTestDataStore } from './testData'

vi.mock('../api/client', () => ({
  apiClient: {
    getRuns: vi.fn(),
    getStats: vi.fn(),
  },
}))

import { apiClient } from '../api/client'

describe('test data store loading state', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('stays loading until all concurrent requests finish', async () => {
    let finishRuns!: (value: unknown) => void
    let finishStats!: (value: unknown) => void
    vi.mocked(apiClient.getRuns).mockReturnValue(
      new Promise((resolve) => {
        finishRuns = resolve
      }) as ReturnType<typeof apiClient.getRuns>
    )
    vi.mocked(apiClient.getStats).mockReturnValue(
      new Promise((resolve) => {
        finishStats = resolve
      }) as ReturnType<typeof apiClient.getStats>
    )

    const store = useTestDataStore()
    const runsRequest = store.fetchRuns()
    const statsRequest = store.fetchStats()
    expect(store.loading).toBe(true)

    finishRuns({ runs: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } })
    await runsRequest
    expect(store.loading).toBe(true)

    finishStats({ total_runs: 0, total_tests: 0 })
    await statsRequest
    expect(store.loading).toBe(false)
  })
})
