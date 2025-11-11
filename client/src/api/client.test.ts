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
          runs: [{ id: '1', name: 'Test Run 1' }],
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

    it('should throw error when API returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(apiClient.getRuns()).rejects.toThrow('Failed to GET /runs')
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
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/cases?page=1&limit=50&run_id=123&status=failed',
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

      const filtered = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined)
      )
      const queryString = new URLSearchParams(filtered as Record<string, string>).toString()

      expect(queryString).toBe('page=1&limit=50')
    })
  })
})
