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
  job_name?: string
}

export interface TestCaseFilters extends PaginationParams {
  run_id?: string
  status?: string
  class_name?: string
  job_name?: string
}

export interface TestRun {
  id: string
  name: string
  timestamp: string
  total_tests: number
  passed: number
  failed: number
  errors: number
  skipped: number
  time: number
  pass_rate?: number
  ci_metadata?: {
    job_name?: string
    branch?: string
    build_number?: string
    build_url?: string
    provider?: string
    commit_sha?: string
    repository?: string
  }
  release_tag?: string
  release_version?: string
  baseline?: boolean
  comparison_tags?: string[]
  file_upload_id?: string
  created_at?: string
  updated_at?: string
}

export interface TestCase {
  id: string
  suite_id?: string
  run_id?: string
  name: string
  class_name?: string
  time: number
  status: 'passed' | 'failed' | 'error' | 'skipped'
  error_message?: string
  error_type?: string
  stack_trace?: string
  assertions?: number
  file?: string
  line?: number
  system_out?: string
  system_err?: string
  is_flaky?: boolean
  flaky_detected_at?: string
  file_upload_id?: string
  timestamp?: string
  run_name?: string
  run_source?: string
  run_ci_metadata?: {
    job_name?: string
    branch?: string
    build_number?: string
  }
  suite_properties?: Record<string, any>
  created_at?: string
  updated_at?: string
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

// Tier 1 feature interfaces

export interface TestHistoryRun {
  run_id: string
  status: 'passed' | 'failed' | 'error' | 'skipped'
  time: number
  timestamp: string
  error_message?: string
}

export interface TestHistoryResponse {
  runs: TestHistoryRun[]
}

export interface FlakinessData {
  pass_rate: number // 0-100
  total_runs: number
  recent_failures: number
  last_status_change: string
  flakiness_score: number // 0-100
}

export interface FailurePattern {
  error_type: string
  error_message: string
  count: number
  affected_tests: Array<{ test_id: string; test_name: string }>
  trend: 'increasing' | 'decreasing' | 'stable'
  first_seen: string
}

export interface FailurePatternsResponse {
  patterns: FailurePattern[]
}

export interface FlakyTest {
  test_id: string
  test_name: string
  class_name: string
  pass_rate: number
  flakiness_score: number
  recent_runs: number
  recent_failures: number
}

export interface FlakyTestsResponse {
  flaky_tests: FlakyTest[]
}

// Tier 2: Release Comparison Interfaces

export interface Release {
  release_tag: string
  release_version?: string
  first_run: string
  last_run: string
  total_runs: number
  total_tests: number
  passed: number
  failed: number
  errors: number
  skipped: number
  pass_rate: number
}

export interface ReleasesResponse {
  releases: Release[]
  pagination: Pagination
}

export interface ReleaseMetrics {
  total_runs: number
  total_tests: number
  passed: number
  failed: number
  errors: number
  skipped: number
  pass_rate: number
  total_time: number
  avg_time_per_run: number
  first_run: string
  last_run: string
}

export interface ReleaseInfo {
  tag: string
  version?: string
}

export interface ReleaseComparisonResponse {
  release1: ReleaseInfo & ReleaseMetrics
  release2: ReleaseInfo & ReleaseMetrics
  diff: {
    test_count_change: number
    pass_rate_change: number
    failure_change: number
    time_change: number
    time_change_percent: number
  }
}

// Tier 2: Test Run Comparison Interfaces

export interface RunSummary {
  id: string
  timestamp: string
  total_tests: number
  passed: number
  failed: number
  errors: number
  skipped: number
  time: number
  pass_rate: number
  release_tag?: string
  release_version?: string
}

export interface TestDiff {
  test_id: string
  test_name: string
  class_name: string
  status_before?: string
  status_after?: string
  time_before?: number
  time_after?: number
  time_diff?: number
  time_diff_percent?: number
  error_message?: string
  error_type?: string
}

export interface RunComparisonSummary {
  total_tests_compared: number
  new_failures_count: number
  fixed_tests_count: number
  still_failing_count: number
  status_changes_count: number
  performance_changes_count: number
  new_tests_count: number
  removed_tests_count: number
}

export interface RunComparisonDetails {
  new_failures: TestDiff[]
  fixed_tests: TestDiff[]
  still_failing: TestDiff[]
  status_changes: TestDiff[]
  performance_changes: TestDiff[]
  new_tests: TestDiff[]
  removed_tests: TestDiff[]
}

export interface RunComparisonResponse {
  run1: RunSummary
  run2: RunSummary
  summary: RunComparisonSummary
  details: RunComparisonDetails
}

export interface TestComparisonHistoryItem {
  test_case_id: string
  test_run_id: string
  timestamp: string
  status: string
  time: number
  error_type?: string
  error_message?: string
  test_run: {
    release_tag?: string
    release_version?: string
  }
}

export interface TestComparisonHistoryResponse {
  test_id: string
  test_name: string
  class_name: string
  statistics: {
    total_runs: number
    passed_count: number
    failed_count: number
    pass_rate: number
    avg_time: number
  }
  history: TestComparisonHistoryItem[]
}

// Tier 2: Performance Trends Interfaces

export interface PerformanceTrendsParams {
  testId?: string
  className?: string
  days?: number
  granularity?: 'hourly' | 'daily' | 'weekly'
}

export interface PerformanceTrend {
  period: string
  test_name?: string
  class_name?: string
  avg_time: number
  min_time: number
  max_time: number
  p50_time: number
  p95_time: number
  total_runs: number
  passed: number
  failed: number
  pass_rate: number
}

export interface PerformanceTrendsResponse {
  trends: PerformanceTrend[]
}

export interface SlowestTest {
  test_name: string
  class_name: string
  avg_time: number
  max_time: number
  min_time: number
  p95_time: number
  total_runs: number
  latest_run: string
}

export interface SlowestTestsResponse {
  slowest_tests: SlowestTest[]
}

export interface PerformanceRegression {
  test_name: string
  class_name: string
  recent_avg: number
  baseline_avg: number
  time_increase: number
  percent_increase: number
  recent_count: number
  baseline_count: number
}

export interface PerformanceRegressionsResponse {
  regressions: PerformanceRegression[]
  summary: {
    total_regressions: number
    threshold_percent: number
    days_analyzed: number
  }
}

// Import global constants
import { DEFAULT_QUERY_LIMIT } from '../config/constants'

export interface TestPerformanceHistoryResponse {
  test_name: string
  class_name: string
  statistics: {
    avg_time: number
    min_time: number
    max_time: number
    total_runs: number
    trend: 'increasing' | 'decreasing' | 'stable'
    trend_value: number
  }
  history: Array<{
    test_name: string
    class_name: string
    timestamp: string
    time: number
    status: string
    test_run_id: string
  }>
}

class ApiClient {
  private baseUrl = '/api/v1'

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, options)

    if (!response.ok) {
      // Try to extract error message from response body
      try {
        const errorData = await response.json()
        const errorMessage = errorData.error || errorData.message || `Request failed with status ${response.status}`
        throw new Error(errorMessage)
      } catch (e) {
        // If JSON parsing fails, throw generic error
        throw new Error(`Failed to ${options?.method || 'GET'} ${endpoint}: ${response.status}`)
      }
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
      limit: filters.limit || DEFAULT_QUERY_LIMIT,
      ...filters,
    }

    const queryString = this.buildQueryString(params)
    const response = await this.request<any>(`/runs${queryString}`)

    return {
      runs: response.runs,
      pagination: response.pagination
    }
  }

  async getProjects(): Promise<string[]> {
    const response = await this.request<{ projects: string[] }>('/runs/projects')
    return response.projects
  }

  async batchUpdateRuns(runIds: string[], updates: { release_tag: string | null; release_version: string | null }): Promise<{ matched_count: number; modified_count: number }> {
    const response = await this.request<any>('/runs/batch', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        run_ids: runIds,
        release_tag: updates.release_tag,
        release_version: updates.release_version
      })
    })
    return response
  }

  async getStats(filters: StatsFilters = {}): Promise<Stats> {
    const queryString = this.buildQueryString(filters)
    return this.request<Stats>(`/stats/overview${queryString}`)
  }

  async getTestCases(filters: TestCaseFilters = {}): Promise<TestCasesResponse> {
    const params = {
      page: filters.page || 1,
      limit: filters.limit || DEFAULT_QUERY_LIMIT,
      ...filters,
    }

    const queryString = this.buildQueryString(params)
    const response = await this.request<any>(`/cases${queryString}`)

    // Transform backend response to match frontend expectations
    // Backend now returns standardized field names via toJSON transforms
    const transformedCases = response.cases.map((testCase: any) => ({
      ...testCase,
      // Backend provides standard names
      error_message: testCase.error_message,
      error_type: testCase.error_type,
    }))

    return {
      cases: transformedCases,
      pagination: response.pagination
    }
  }

  async getTestCase(testId: string): Promise<TestCase> {
    return this.request<TestCase>(`/cases/${testId}`)
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

  // New methods for Tier 1 features

  async getTestHistory(testId: string): Promise<TestHistoryResponse> {
    return this.request<TestHistoryResponse>(`/cases/${testId}/history`)
  }

  async getTestFlakiness(testId: string): Promise<FlakinessData> {
    return this.request<FlakinessData>(`/cases/${testId}/flakiness`)
  }

  async getFailurePatterns(params?: { days?: number; limit?: number; job_name?: string }): Promise<FailurePatternsResponse> {
    const queryString = this.buildQueryString(params || {})
    return this.request<FailurePatternsResponse>(`/analytics/failure-patterns${queryString}`)
  }

  async getFlakyTests(params?: { limit?: number; job_name?: string }): Promise<FlakyTestsResponse> {
    const queryString = this.buildQueryString(params || {})
    return this.request<FlakyTestsResponse>(`/analytics/flaky-tests${queryString}`)
  }

  // Tier 2: Release Comparison
  async getReleases(params?: { limit?: number; skip?: number; job_name?: string }): Promise<ReleasesResponse> {
    const queryString = this.buildQueryString(params || {})
    return this.request<ReleasesResponse>(`/releases${queryString}`)
  }

  async compareReleases(release1: string, release2: string): Promise<ReleaseComparisonResponse> {
    return this.request<ReleaseComparisonResponse>(`/releases/compare?release1=${release1}&release2=${release2}`)
  }

  async getReleaseRuns(tag: string, params?: { limit?: number; skip?: number }): Promise<RunsResponse> {
    const queryString = this.buildQueryString(params || {})
    return this.request<RunsResponse>(`/releases/${tag}/runs${queryString}`)
  }

  // Tier 2: Test Run Comparison
  async compareRuns(run1: string, run2: string): Promise<RunComparisonResponse> {
    return this.request<RunComparisonResponse>(`/comparison/runs?run1=${run1}&run2=${run2}`)
  }

  async getTestComparisonHistory(testId: string, params?: { limit?: number; days?: number }): Promise<TestComparisonHistoryResponse> {
    const queryString = this.buildQueryString(params || {})
    return this.request<TestComparisonHistoryResponse>(`/comparison/test/${testId}${queryString}`)
  }

  // Tier 2: Performance Trends
  async getPerformanceTrends(params?: PerformanceTrendsParams): Promise<PerformanceTrendsResponse> {
    const queryString = this.buildQueryString(params || {})
    return this.request<PerformanceTrendsResponse>(`/performance/trends${queryString}`)
  }

  async getSlowestTests(params?: { limit?: number; days?: number; threshold?: number }): Promise<SlowestTestsResponse> {
    const queryString = this.buildQueryString(params || {})
    return this.request<SlowestTestsResponse>(`/performance/slowest${queryString}`)
  }

  async getPerformanceRegressions(params?: { days?: number; threshold_percent?: number; min_baseline_runs?: number }): Promise<PerformanceRegressionsResponse> {
    const queryString = this.buildQueryString(params || {})
    return this.request<PerformanceRegressionsResponse>(`/performance/regressions${queryString}`)
  }

  async getTestPerformanceHistory(testId: string, params?: { days?: number }): Promise<TestPerformanceHistoryResponse> {
    const queryString = this.buildQueryString(params || {})
    return this.request<TestPerformanceHistoryResponse>(`/performance/test/${testId}${queryString}`)
  }
}

export const apiClient = new ApiClient()
