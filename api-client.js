// JUnit Test Results Dashboard - API Client
// MongoDB backend client

/* eslint-disable no-redeclare */
class JUnitAPIClient {
    constructor() {
        // Auto-detect API URL based on environment
        this.baseURL = this.detectAPIURL();
        console.log('API Base URL:', this.baseURL);
        this.healthCheckInterval = null;
        this.isOnline = false;
    }

    detectAPIURL() {
        // Check if environment variable is set (for build-time configuration)
        if (typeof JUNIT_API_URL !== 'undefined') {
            return JUNIT_API_URL;
        }

        // Docker deployment: API is behind Nginx on same host
        // This works for both localhost and remote servers
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port;

        // If accessing through standard ports (80/443), don't include port
        const portPart = port && port !== '80' && port !== '443' ? `:${port}` : '';

        // API is proxied through Nginx at /api/
        return `${protocol}//${hostname}${portPart}/api/v1`;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                let errorObj;
                try {
                    errorObj = JSON.parse(errorText);
                } catch {
                    errorObj = { error: errorText };
                }
                throw new Error(
                    errorObj.error || `HTTP ${response.status}: ${response.statusText}`
                );
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', {
                url,
                endpoint,
                message: error.message,
                name: error.name,
                stack: error.stack
            });
            throw error;
        }
    }

    // Initialize API client
    async initializeDatabase() {
        const healthy = await this.healthCheck();
        if (!healthy) {
            throw new Error('Cannot connect to API server');
        }
        console.log('API client initialized successfully');
        return true;
    }

    // Upload file (replaces parseAndStoreJUnitXML)
    async parseAndStoreJUnitXML(xmlContent, filename, ciMetadata = null) {
        const formData = new FormData();
        const blob = new Blob([xmlContent], { type: 'application/xml' });
        formData.append('file', blob, filename);

        if (ciMetadata) {
            formData.append('ci_metadata', JSON.stringify(ciMetadata));
        }

        return this.request('/upload', {
            method: 'POST',
            body: formData
        });
    }

    // Get test runs (replaces getTestRuns)
    async getTestRuns(limit = 50, offset = 0) {
        const page = Math.floor(offset / limit) + 1;
        const response = await this.request(`/runs?limit=${limit}&page=${page}`);

        // Transform API response to match frontend expectations
        return response.data.runs.map(run => ({
            id: run._id,
            name: run.name,
            timestamp: run.timestamp,
            created_at: run.created_at,
            time: run.time || 0,
            total_tests: run.total_tests || 0,
            total_failures: run.total_failures || 0,
            total_errors: run.total_errors || 0,
            total_skipped: run.total_skipped || 0,
            source: run.source,
            ci_metadata: run.ci_metadata
            // Note: Filtered out - __v, content_hash, file_upload_id, updated_at
        }));
    }

    // Get test suites (replaces getTestSuites)
    async getTestSuites(runId) {
        const response = await this.request(`/runs/${runId}`);
        const suites = response.data.suites || [];

        // Transform API response to match frontend expectations
        return suites.map(suite => ({
            id: suite._id,
            run_id: suite.run_id,
            name: suite.name,
            classname: suite.classname,
            tests: suite.tests || 0,
            failures: suite.failures || 0,
            errors: suite.errors || 0,
            skipped: suite.skipped || 0,
            time: suite.time || 0,
            timestamp: suite.timestamp,
            hostname: suite.hostname
            // Note: Filtered out - __v, file_upload_id, created_at, updated_at
        }));
    }

    // Get test cases (replaces getTestCases)
    async getTestCases(filters = {}) {
        console.log('[JUnitAPIClient.getTestCases] Called with filters:', filters);

        const params = new URLSearchParams();

        if (filters.status) {
            params.append('status', filters.status);
        }
        if (filters.suite_id) {
            params.append('suite_id', filters.suite_id);
        }
        if (filters.run_id) {
            params.append('run_id', filters.run_id);
        }
        if (filters.search) {
            params.append('search', filters.search);
        }

        const queryString = params.toString();
        const endpoint = `/cases?${queryString}`;
        console.log('[JUnitAPIClient.getTestCases] API endpoint:', endpoint);
        console.log('[JUnitAPIClient.getTestCases] Full URL:', `${this.baseURL}${endpoint}`);

        const response = await this.request(endpoint);
        console.log('[JUnitAPIClient.getTestCases] Raw API response:', response);
        console.log('[JUnitAPIClient.getTestCases] response.data:', response.data);
        console.log('[JUnitAPIClient.getTestCases] response.data.cases:', response.data?.cases);
        console.log('[JUnitAPIClient.getTestCases] Cases count:', response.data?.cases?.length || 0);

        // Check if response has the expected structure
        if (!response.data || !response.data.cases) {
            console.error('[JUnitAPIClient.getTestCases] Unexpected response structure!');
            console.error('[JUnitAPIClient.getTestCases] Expected: { data: { cases: [...] } }');
            console.error('[JUnitAPIClient.getTestCases] Got:', response);
            return [];
        }

        // Transform API response to match frontend expectations
        const transformedCases = response.data.cases.map(testCase => ({
            id: testCase._id,
            suite_id: testCase.suite_id,
            run_id: testCase.run_id,
            name: testCase.name,
            classname: testCase.classname,
            status: testCase.status,
            time: testCase.time || 0,
            assertions: testCase.assertions || 0,
            file: testCase.file,
            line: testCase.line,
            is_flaky: testCase.is_flaky || false,
            flaky_detected_at: testCase.flaky_detected_at,
            timestamp: testCase.timestamp,
            system_out: testCase.system_out,
            system_err: testCase.system_err
            // Note: Filtered out - __v, file_upload_id, created_at, updated_at
        }));

        console.log('[JUnitAPIClient.getTestCases] Transformed cases count:', transformedCases.length);
        if (transformedCases.length > 0) {
            console.log('[JUnitAPIClient.getTestCases] Sample transformed case:', transformedCases[0]);
        }

        return transformedCases;
    }

    // Get test statistics (replaces getTestStatistics)
    async getTestStatistics(runId = null) {
        const params = runId ? `?run_id=${runId}` : '';
        const response = await this.request(`/stats/overview${params}`);
        const data = response.data;

        // Transform API response to match frontend expectations
        return {
            total: data.total_tests || 0,
            passed: data.total_passed || 0,
            failed: data.total_failed || 0,
            error: data.total_errors || 0,
            skipped: data.total_skipped || 0,
            total_time: data.average_duration || 0
        };
    }

    // Get test case history (for flaky test detection)
    async getTestCaseHistory(testName, className) {
        // Search for test cases with matching name and classname
        const response = await this.request(`/cases?search=${encodeURIComponent(testName)}`);
        const cases = response.data.cases.filter(
            c => c.name === testName && c.classname === className
        );

        // Transform and sort by date
        return cases
            .map(c => ({
                id: c._id,
                name: c.name,
                classname: c.classname,
                status: c.status,
                time: c.time || 0,
                timestamp: c.created_at,
                is_flaky: c.is_flaky || false,
                run_id: c.run_id,
                suite_id: c.suite_id,
                failure_message: c.result?.failure_message || '',
                failure_type: c.result?.failure_type || '',
                stack_trace: c.result?.stack_trace || ''
            }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // Delete test run (replaces deleteTestRun)
    async deleteTestRun(runId) {
        return this.request(`/runs/${runId}`, {
            method: 'DELETE'
        });
    }

    // Get trends data
    async getTrends(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const response = await this.request(`/stats/trends?${queryString}`);

        // Transform API response - trends data structure is already frontend-compatible
        return response.data.map(trend => ({
            date: trend.date,
            run_id: trend.run_id,
            total_tests: trend.total_tests || 0,
            passed: trend.passed || 0,
            failed: trend.failed || 0,
            errors: trend.errors || 0,
            skipped: trend.skipped || 0,
            success_rate: parseFloat(trend.success_rate) || 0
        }));
    }

    // Get flaky tests
    async getFlakyTests() {
        const response = await this.request('/stats/flaky-tests');

        // Transform API response
        return response.data.map(test => ({
            id: test._id,
            name: test.name,
            classname: test.classname,
            flaky_count: test.flaky_count || 0,
            total_runs: test.total_runs || 0,
            last_seen: test.last_seen
        }));
    }

    // Get specific test case with details
    async getTestCase(caseId) {
        const response = await this.request(`/cases/${caseId}`);
        const rawData = response.data;

        // Transform API response - backend returns case data directly in 'data', not wrapped in 'data.case'
        const transformedCase = {
            id: rawData._id,
            suite_id: rawData.suite_id,
            run_id: rawData.run_id,
            name: rawData.name,
            classname: rawData.classname,
            status: rawData.status,
            time: rawData.time || 0,
            assertions: rawData.assertions || 0,
            file: rawData.file,
            line: rawData.line,
            is_flaky: rawData.is_flaky || false,
            timestamp: rawData.timestamp || rawData.created_at,
            system_out: rawData.system_out,
            system_err: rawData.system_err,
            flaky_detected_at: rawData.flaky_detected_at,
            failure_message: rawData.result?.failure_message || '',
            failure_type: rawData.result?.failure_type || '',
            stack_trace: rawData.result?.stack_trace || ''
        };

        return {
            case: transformedCase,
            result: rawData.result
        };
    }

    // Get specific test run
    async getTestRun(runId) {
        const response = await this.request(`/runs/${runId}`);
        const data = response.data;

        // API returns {...run, suites}, not {run, suites}
        // Transform the run properties and suites separately
        const transformedRun = {
            id: data._id,
            name: data.name,
            timestamp: data.timestamp || data.created_at,
            time: data.time || 0,
            total_tests: data.total_tests || 0,
            total_failures: data.total_failures || 0,
            total_errors: data.total_errors || 0,
            total_skipped: data.total_skipped || 0,
            source: data.source,
            ci_metadata: data.ci_metadata
        };

        // Transform suites if present
        const transformedSuites = data.suites
            ? data.suites.map(suite => ({
                  id: suite._id,
                  name: suite.name,
                  tests: suite.tests || 0,
                  failures: suite.failures || 0,
                  errors: suite.errors || 0,
                  skipped: suite.skipped || 0,
                  time: suite.time || 0,
                  timestamp: suite.timestamp || suite.created_at
              }))
            : [];

        return {
            run: transformedRun,
            suites: transformedSuites
        };
    }

    // Health check
    async healthCheck() {
        try {
            const healthUrl = `${this.baseURL.replace('/api/v1', '')}/health`;
            console.log('Health check URL:', healthUrl);
            const response = await fetch(healthUrl);
            console.log('Health check response:', response.status, response.ok);
            this.isOnline = response.ok;
            return response.ok;
        } catch (error) {
            console.error('Health check failed:', error);
            this.isOnline = false;
            return false;
        }
    }

    // Start periodic health checks
    startHealthCheck(interval = 30000) {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        this.healthCheckInterval = setInterval(async () => {
            const wasOnline = this.isOnline;
            await this.healthCheck();

            if (wasOnline && !this.isOnline) {
                console.warn('API server connection lost');
                this.showConnectionError();
            } else if (!wasOnline && this.isOnline) {
                console.log('API server connection restored');
                this.hideConnectionError();
            }
        }, interval);
    }

    showConnectionError() {
        const existingError = document.getElementById('api-connection-error');
        if (existingError) {
            return;
        }

        const errorDiv = document.createElement('div');
        errorDiv.id = 'api-connection-error';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        errorDiv.innerHTML = '⚠️ Cannot connect to API server';
        document.body.appendChild(errorDiv);
    }

    hideConnectionError() {
        const errorDiv = document.getElementById('api-connection-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    // Stop health checks
    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    // Get failure patterns analysis for a test run
    async getFailurePatterns(runId) {
        const response = await this.request(`/analysis/failure-patterns/${runId}`);
        return response.data;
    }
}

// Export for use in other modules
window.JUnitDatabase = JUnitAPIClient;
window.JUnitAPIClient = JUnitAPIClient;
/* eslint-enable no-redeclare */
