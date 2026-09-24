import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient } from './client'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getRuns', () => {
    it('should fetch test runs with default pagination', async () => {
      const mockData = {
        success: true,
        data: {
          runs: [
            {
              id: '1',
              name: 'Test Run 1',
              total_tests: 100,
              passed: 90,
              failed: 5,
              errors: 2,
              skipped: 3,
            },
          ],
          pagination: { page: 1, limit: 50, total: 1 },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const result = await apiClient.getRuns()

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/runs?page=1&limit=50', undefined)
      expect(result).toEqual(mockData.data)
    })

    it('should fetch test runs with custom pagination', async () => {
      const mockData = {
        success: true,
        data: {
          runs: [],
          pagination: { page: 2, limit: 25, total: 50 },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const result = await apiClient.getRuns({ page: 2, limit: 25 })

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/runs?page=2&limit=25', undefined)
      expect(result).toEqual(mockData.data)
    })

    it('should fetch test runs with filters', async () => {
      const mockData = {
        success: true,
        data: { runs: [], pagination: { page: 1, limit: 50, total: 0 } },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      await apiClient.getRuns({
        page: 1,
        limit: 50,
        job_name: 'CI Pipeline',
        branch: 'main',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/runs?page=1&limit=50&job_name=CI+Pipeline&branch=main',
        undefined
      )
    })

    it('should send server-side sorting parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { runs: [], pagination: { page: 1, limit: 50, total: 0 } },
        }),
      })

      await apiClient.getRuns({ sort_by: 'pass_rate', sort_order: 'asc' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/runs?page=1&limit=50&sort_by=pass_rate&sort_order=asc',
        undefined
      )
    })

    it('should throw error when API returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(apiClient.getRuns()).rejects.toThrow('Failed to GET /runs')
    })

    it('should preserve an API error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid date range' }),
      })

      await expect(apiClient.getRuns()).rejects.toThrow('Invalid date range')
    })
  })

  describe('batchUpdateRuns', () => {
    it('assigns selected runs to a project', async () => {
      const mockData = {
        success: true,
        data: { matched_count: 1, modified_count: 1 },
      }
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockData })

      const result = await apiClient.batchUpdateRuns(['run-1'], {
        job_name: 'xtg-pdw-gcs-hub-test',
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/runs/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_ids: ['run-1'],
          job_name: 'xtg-pdw-gcs-hub-test',
        }),
      })
      expect(result).toEqual(mockData.data)
    })
  })

  describe('getProjects', () => {
    it('should fetch all unique projects', async () => {
      const mockData = {
        success: true,
        data: {
          projects: ['Project A', 'Project B', 'Project C'],
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const result = await apiClient.getProjects()

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/runs/projects', undefined)
      expect(result).toEqual(mockData.data.projects)
    })
  })

  describe('getReleases', () => {
    it('sends search and page parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            releases: [],
            pagination: { page: 2, limit: 25, total: 0, pages: 0 },
          },
        }),
      })

      await apiClient.getReleases({ page: 2, limit: 25, search: '1.0', job_name: 'gateway' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/releases?page=2&limit=25&search=1.0&job_name=gateway',
        undefined
      )
    })
  })

  describe('getStats', () => {
    it('should fetch overview statistics', async () => {
      const mockData = {
        success: true,
        data: {
          total_runs: 100,
          total_tests: 500,
          total_passed: 450,
          total_failed: 40,
          total_errors: 5,
          total_skipped: 5,
          success_rate: '90.00',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const result = await apiClient.getStats()

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/stats/overview', undefined)
      expect(result).toEqual(mockData.data)
    })

    it('should fetch stats with filters', async () => {
      const mockData = {
        success: true,
        data: { total_runs: 10, total_tests: 50 },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      await apiClient.getStats({
        run_id: '123',
        from_date: '2025-01-01',
        to_date: '2025-01-31',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/stats/overview?run_id=123&from_date=2025-01-01&to_date=2025-01-31',
        undefined
      )
    })
  })

  describe('getTestCases', () => {
    it('should fetch test cases with pagination', async () => {
      const mockData = {
        success: true,
        data: {
          cases: [
            { id: '1', name: 'Test Case 1', status: 'passed' },
            { id: '2', name: 'Test Case 2', status: 'failed' },
          ],
          pagination: { page: 1, limit: 50, total: 2 },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const result = await apiClient.getTestCases()

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/cases?page=1&limit=50', undefined)
      expect(result).toEqual(mockData.data)
    })

    it('should fetch test cases with filters', async () => {
      const mockData = {
        success: true,
        data: { cases: [], pagination: { page: 1, limit: 50, total: 0 } },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      await apiClient.getTestCases({
        run_id: '123',
        status: 'failed',
        tag: 'hardware',
        sort_by: 'name',
        sort_order: 'desc',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/cases?page=1&limit=50&run_id=123&status=failed&tag=hardware&sort_by=name&sort_order=desc',
        undefined
      )
    })
  })

  describe('getTestCaseSuites', () => {
    it('fetches all suite names for the selected project', async () => {
      const mockData = {
        success: true,
        data: { suites: ['suite.alpha', 'suite.beta'] },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const result = await apiClient.getTestCaseSuites({ job_name: 'Gateway Tests' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/cases/suites?job_name=Gateway+Tests',
        undefined
      )
      expect(result).toEqual(mockData.data.suites)
    })
  })

  describe('getTestCaseLabels', () => {
    it('fetches sorted label values within the selected run', async () => {
      const mockData = {
        success: true,
        data: { name: 'tag', values: ['hardware', 'smoke'] },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const result = await apiClient.getTestCaseLabels('tag', { run_id: 'run-123' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/cases/labels?name=tag&run_id=run-123',
        undefined
      )
      expect(result).toEqual(mockData.data.values)
    })
  })

  describe('performance project filters', () => {
    it('includes the selected project in performance requests', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { slowest_tests: [] } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { trends: [] } }),
        })

      await apiClient.getSlowestTests({ days: 30, job_name: 'Gateway Tests' })
      await apiClient.getPerformanceTrends({ days: 30, job_name: 'Gateway Tests' })

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        '/api/v1/performance/slowest?days=30&job_name=Gateway+Tests',
        undefined
      )
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        '/api/v1/performance/trends?days=30&job_name=Gateway+Tests',
        undefined
      )
    })
  })

  describe('uploadTestResults', () => {
    it('should upload XML file successfully', async () => {
      const mockData = {
        success: true,
        data: {
          run_id: '123',
          message: 'Upload successful',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const file = new File(['<xml></xml>'], 'test.xml', { type: 'text/xml' })
      const result = await apiClient.uploadTestResults(file)

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/upload', {
        method: 'POST',
        body: expect.any(FormData),
      })

      expect(result).toEqual(mockData.data)
    })

    it('should handle upload errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      const file = new File(['invalid'], 'test.xml', { type: 'text/xml' })

      await expect(apiClient.uploadTestResults(file)).rejects.toThrow(
        'Failed to upload test results: 400'
      )
    })
  })

  describe('buildQueryString', () => {
    it('should build query string from params object', () => {
      const params = {
        page: 1,
        limit: 50,
        job_name: 'CI Pipeline',
        branch: 'main',
      }

      // Access the private method via testing
      const queryString = new URLSearchParams(params as Record<string, string>).toString()

      expect(queryString).toBe('page=1&limit=50&job_name=CI+Pipeline&branch=main')
    })

    it('should handle empty params', () => {
      const queryString = new URLSearchParams({}).toString()
      expect(queryString).toBe('')
    })

    it('should skip undefined values', () => {
      const params = {
        page: '1',
        limit: '50',
        job_name: undefined,
      }

      const filtered = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined))
      const queryString = new URLSearchParams(filtered as Record<string, string>).toString()

      expect(queryString).toBe('page=1&limit=50')
    })
  })
})
