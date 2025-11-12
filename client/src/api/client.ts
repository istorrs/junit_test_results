export interface PaginationParams {
  page?: number
  limit?: number
}

export interface RunFilters extends PaginationParams {
  job_name?: string
  branch?: string
  from_date?: string
  to_date?: string
}

export interface StatsFilters {
  run_id?: string
  from_date?: string
  to_date?: string
}

export interface TestCaseFilters extends PaginationParams {
  run_id?: string
  status?: string
  suite_name?: string
  class_name?: string
}

export interface TestRun {
  id: string
  name: string
  timestamp: string
  ci_metadata?: {
    job_name?: string
    branch?: string
    build_number?: string
  }
  summary?: {
    total: number
    passed: number
    failed: number
    errors: number
    skipped: number
  }
}

export interface TestCase {
  id: string
  name: string
  status: 'passed' | 'failed' | 'error' | 'skipped'
  time: number
  classname?: string
  suite_name?: string
  error_message?: string
  error_type?: string
}

export interface Stats {
  total_runs: number
  total_tests: number
  total_passed: number
  total_failed: number
  total_errors: number
  total_skipped: number
  success_rate: string
  average_duration?: number
  flaky_tests_count?: number
}

export interface Pagination {
  page: number
  limit: number
  total: number
}

export interface RunsResponse {
  runs: TestRun[]
  pagination: Pagination
}

export interface TestCasesResponse {
  cases: TestCase[]
  pagination: Pagination
}

export interface UploadResponse {
  run_id: string
  message: string
}

class ApiClient {
  private baseUrl = '/api/v1'

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, options)

    if (!response.ok) {
      throw new Error(`Failed to ${options?.method || 'GET'} ${endpoint}: ${response.status}`)
    }

    const data = await response.json()
    return data.data
  }

  private buildQueryString(params: Record<string, any>): string {
    const filtered = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null)
    )

    if (Object.keys(filtered).length === 0) {
      return ''
    }

    const queryString = new URLSearchParams(
      filtered as Record<string, string>
    ).toString()

    return `?${queryString}`
  }

  async getRuns(filters: RunFilters = {}): Promise<RunsResponse> {
    const params = {
      page: filters.page || 1,
      limit: filters.limit || 50,
      ...filters,
    }

    const queryString = this.buildQueryString(params)
    const response = await this.request<any>(`/runs${queryString}`)

    // Transform backend response to match frontend expectations
    const transformedRuns = response.runs.map((run: any) => ({
      ...run,
      id: run._id || run.id,
      summary: {
        total: run.total_tests || 0,
        passed: (run.total_tests || 0) - (run.total_failures || 0) - (run.total_errors || 0) - (run.total_skipped || 0),
        failed: run.total_failures || 0,
        errors: run.total_errors || 0,
        skipped: run.total_skipped || 0,
      }
    }))

    return {
      runs: transformedRuns,
      pagination: response.pagination
    }
  }

  async getProjects(): Promise<string[]> {
    const response = await this.request<{ projects: string[] }>('/runs/projects')
    return response.projects
  }

  async getStats(filters: StatsFilters = {}): Promise<Stats> {
    const queryString = this.buildQueryString(filters)
    return this.request<Stats>(`/stats/overview${queryString}`)
  }

  async getTestCases(filters: TestCaseFilters = {}): Promise<TestCasesResponse> {
    const params = {
      page: filters.page || 1,
      limit: filters.limit || 50,
      ...filters,
    }

    const queryString = this.buildQueryString(params)
    const response = await this.request<any>(`/cases${queryString}`)

    // Transform backend response to match frontend expectations
    const transformedCases = response.cases.map((testCase: any) => ({
      ...testCase,
      id: testCase._id || testCase.id,
      suite_name: testCase.classname || testCase.suite_name,
      error_message: testCase.result?.error_message || testCase.result?.failure_message || testCase.error_message,
      error_type: testCase.result?.error_type || testCase.result?.failure_type || testCase.error_type,
    }))

    return {
      cases: transformedCases,
      pagination: response.pagination
    }
  }

  async uploadTestResults(file: File): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Failed to upload test results: ${response.status}`)
    }

    const data = await response.json()
    return data.data
  }
}

export const apiClient = new ApiClient()
