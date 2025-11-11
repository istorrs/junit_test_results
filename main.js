// JUnit Test Results Dashboard - Main Application Logic
class JUnitDashboard {
    constructor() {
        this.db = new JUnitDatabase();
        this.currentFilters = {
            status: 'all',
            search: '',
            dateRange: null,
            run_id: null,
            classname: null
        };
        this.charts = {};
        this.isLoading = false;
        this.init();
    }

    async init() {
        try {
            await this.db.initializeDatabase();
            this.setupEventListeners();
            this.loadDashboard();
            this.initializeAnimations();
        } catch (error) {
            logError('Failed to initialize dashboard', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    setupEventListeners() {
        // File upload handlers
        const uploadZone = document.getElementById('upload-zone');
        const fileInput = document.getElementById('file-input');

        if (uploadZone && fileInput) {
            uploadZone.addEventListener('dragover', this.handleDragOver.bind(this));
            uploadZone.addEventListener('drop', this.handleDrop.bind(this));
            uploadZone.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        }

        // Filter handlers
        const runFilter = document.getElementById('run-filter');
        const suiteFilter = document.getElementById('suite-filter');
        const statusFilter = document.getElementById('status-filter');
        const searchInput = document.getElementById('search-input');
        const dateFilter = document.getElementById('date-filter');
        const clearFilters = document.getElementById('clear-filters');

        if (runFilter) {
            runFilter.addEventListener('change', this.handleRunFilter.bind(this));
        }
        if (suiteFilter) {
            suiteFilter.addEventListener('change', this.handleSuiteFilter.bind(this));
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', this.handleStatusFilter.bind(this));
        }
        if (searchInput) {
            searchInput.addEventListener('input', this.handleSearchInput.bind(this));
        }
        if (dateFilter) {
            dateFilter.addEventListener('change', this.handleDateFilter.bind(this));
        }
        if (clearFilters) {
            clearFilters.addEventListener('click', this.clearAllFilters.bind(this));
        }

        // Sort handlers
        const sortOptions = document.querySelectorAll('[data-sort]');
        sortOptions.forEach(option => {
            option.addEventListener('click', this.handleSort.bind(this));
        });

        // Listen for project filter changes
        window.addEventListener('projectFilterChanged', () => {
            this.loadDashboard();
        });

        // Handle page visibility changes to reload data
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.loadDashboard();
            }
        });

        // Handle navigation to reload data
        window.addEventListener('focus', () => {
            this.loadDashboard();
        });

        // Limits settings modal
        this.setupLimitsSettings();

        // Listen for limits changes to reload dashboard
        window.addEventListener('limitsChanged', () => {
            this.loadDashboard();
        });
    }

    setupLimitsSettings() {
        const settingsBtn = document.getElementById('limits-settings-btn');
        const settingsModal = document.getElementById('limits-settings-modal');
        const closeBtn = document.getElementById('close-limits-modal');
        const contentDiv = document.getElementById('limits-settings-content');

        if (!settingsBtn || !settingsModal || !contentDiv) return;

        // Create settings panels
        const dashboardPanel = window.limitsConfig.createSettingsPanel([
            { key: 'dashboardRecentRuns', label: 'Recent Test Runs', description: 'Number of recent test runs to display' },
            { key: 'dashboardTestCases', label: 'Test Cases', description: 'Maximum test cases to fetch' },
            { key: 'dashboardTrends', label: 'Trend Data Points', description: 'Number of historical data points for trends' }
        ], 'Dashboard Limits');

        const insightsPanel = window.limitsConfig.createSettingsPanel([
            { key: 'insightsNewFailures', label: 'New Failures', description: 'Number of new failures to show' },
            { key: 'insightsFlakyTests', label: 'Flaky Tests', description: 'Number of flaky tests to analyze' },
            { key: 'insightsFlakyHistory', label: 'Flaky History Window', description: 'Number of runs to check for flakiness' },
            { key: 'insightsSlowTests', label: 'Slow Tests', description: 'Number of slowest tests to analyze' },
            { key: 'insightsRecentRuns', label: 'Recent Runs Comparison', description: 'Number of recent runs to compare' },
            { key: 'insightsUnhealthySuites', label: 'Unhealthy Suites', description: 'Number of unhealthy suites to show' }
        ], 'Insights Limits');

        contentDiv.innerHTML = '';
        contentDiv.appendChild(dashboardPanel);
        contentDiv.appendChild(document.createElement('div')).className = 'my-4';
        contentDiv.appendChild(insightsPanel);

        // Open modal
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
        });

        // Close modal
        closeBtn.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });

        // Close on backdrop click
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.add('hidden');
            }
        });
    }

    handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('drag-over');
    }

    handleDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');
        const files = Array.from(event.dataTransfer.files);
        this.processFiles(files);
    }

    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        this.processFiles(files);
    }

    async processFiles(files) {
        const xmlFiles = files.filter(file => file.name.endsWith('.xml'));

        if (xmlFiles.length === 0) {
            this.showError('Please select JUnit XML files (.xml)');
            return;
        }

        this.showUploadProgress();

        try {
            for (const file of xmlFiles) {
                const content = await this.readFileContent(file);
                const result = await this.db.parseAndStoreJUnitXML(content, file.name);

                if (result.success) {
                    this.showSuccess(`Successfully processed ${file.name}`);
                }
            }

            this.hideUploadProgress();
            await this.loadDashboard();
        } catch (error) {
            logError('Error processing files', error);
            this.showError('Error processing files: ' + error.message);
            this.hideUploadProgress();
        }
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = event => resolve(event.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    showUploadProgress() {
        const progressContainer = document.getElementById('upload-progress');
        if (progressContainer) {
            progressContainer.innerHTML = `
                <div class="flex items-center justify-center p-4">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span class="ml-3 text-gray-700">Processing files...</span>
                </div>
            `;
            progressContainer.classList.remove('hidden');
        }
    }

    hideUploadProgress() {
        const progressContainer = document.getElementById('upload-progress');
        if (progressContainer) {
            progressContainer.classList.add('hidden');
        }
    }

    async loadDashboard() {
        // Prevent concurrent loads
        if (this.isLoading) {
            console.log('[JUnitDashboard] loadDashboard skipped - already loading');
            return;
        }

        this.isLoading = true;
        try {
            // Get selected project from navigation
            const selectedProject = window.navigationManager?.getSelectedProject();
            const filters = { limit: window.limitsConfig.get('dashboardRecentRuns') };

            // Filter by project if one is selected
            if (selectedProject && selectedProject !== 'all') {
                filters.job_name = selectedProject;
            }

            const [testRuns, statistics] = await Promise.all([
                this.db.getTestRuns(filters),
                this.db.getTestStatistics()
            ]);

            this.updateDashboardStats(statistics);
            this.renderTestRuns(testRuns);
            this.populateRunFilter(testRuns);
            await this.populateSuiteFilter();
            this.initializeCharts(statistics);
            await this.loadInsights();
        } catch (error) {
            logError('Error loading dashboard', error);
            this.showError('Failed to load dashboard data: ' + error.message);

            // Log detailed error for debugging
            if (window.dashboardDebugger) {
                window.dashboardDebugger.logError('Dashboard Load Error', {
                    message: error.message,
                    stack: error.stack
                });
            }
        } finally {
            this.isLoading = false;
        }
    }

    async loadInsights() {
        try {
            if (typeof InsightsPanel === 'undefined') {
                console.warn('InsightsPanel not loaded');
                return;
            }

            const insightsPanel = new InsightsPanel(this.db);
            await insightsPanel.loadInsights();
            insightsPanel.render('insights-panel');
        } catch (error) {
            logError('Error loading insights', error);
            // Don't show error to user, just log it
        }
    }

    populateRunFilter(testRuns) {
        const runFilter = document.getElementById('run-filter');
        if (!runFilter) {
            return;
        }

        // Clear existing options except "All"
        runFilter.innerHTML = '<option value="all">All Test Runs</option>';

        testRuns.forEach(run => {
            const option = document.createElement('option');
            option.value = run.id;

            // Display format: "JOB_NAME #BUILD_NUMBER" or just run name
            const displayName = run.ci_metadata?.job_name && run.ci_metadata?.build_number
                ? `${run.ci_metadata.job_name} #${run.ci_metadata.build_number}`
                : run.name;

            option.textContent = `${displayName} (${new Date(run.timestamp).toLocaleDateString()})`;
            runFilter.appendChild(option);
        });
    }

    async populateSuiteFilter() {
        const suiteFilter = document.getElementById('suite-filter');
        if (!suiteFilter) {
            return;
        }

        try {
            // Build filters for fetching test cases
            const filters = { limit: window.limitsConfig.get('dashboardTestCases') };

            // If a run is selected, only show suites from that run
            if (this.currentFilters.run_id) {
                filters.run_id = this.currentFilters.run_id;
            }

            // Fetch test cases to extract unique suites
            const testCases = await this.db.getTestCases(filters);

            // Extract unique suite names (classnames)
            const uniqueSuites = [...new Set(testCases.map(tc => tc.classname))]
                .filter(Boolean)
                .sort();

            // Save current selection
            const currentSelection = suiteFilter.value;

            // Clear existing options except "All"
            suiteFilter.innerHTML = '<option value="all">All Test Suites</option>';

            uniqueSuites.forEach(suite => {
                const option = document.createElement('option');
                option.value = suite;
                option.textContent = suite;
                suiteFilter.appendChild(option);
            });

            // Restore selection if it still exists
            if (currentSelection && currentSelection !== 'all') {
                const optionExists = Array.from(suiteFilter.options).some(
                    opt => opt.value === currentSelection
                );
                if (optionExists) {
                    suiteFilter.value = currentSelection;
                } else {
                    // Selection no longer valid, reset to 'all'
                    suiteFilter.value = 'all';
                    this.currentFilters.classname = null;
                }
            }
        } catch (error) {
            logError('Error populating suite filter', error);
        }
    }

    updateDashboardStats(stats) {
        const elements = {
            total: document.getElementById('total-tests'),
            passed: document.getElementById('passed-tests'),
            failed: document.getElementById('failed-tests'),
            error: document.getElementById('error-tests'),
            skipped: document.getElementById('skipped-tests'),
            totalTime: document.getElementById('total-time')
        };

        if (elements.total) {
            elements.total.textContent = stats.total;
        }
        if (elements.passed) {
            elements.passed.textContent = stats.passed;
        }
        if (elements.failed) {
            elements.failed.textContent = stats.failed;
        }
        if (elements.error) {
            elements.error.textContent = stats.error;
        }
        if (elements.skipped) {
            elements.skipped.textContent = stats.skipped;
        }
        if (elements.totalTime) {
            elements.totalTime.textContent = `${stats.total_time.toFixed(2)}s`;
        }

        // Animate counters
        this.animateCounters();
    }

    animateCounters() {
        const counters = document.querySelectorAll('[data-counter]');
        counters.forEach(counter => {
            const target = parseInt(counter.textContent);
            let current = 0;
            const increment = target / 50;
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                counter.textContent = Math.floor(current);
            }, 20);
        });
    }

    renderTestRuns(testRuns) {
        const container = document.getElementById('test-runs-container');
        if (!container) {
            return;
        }

        if (testRuns.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-gray-400 mb-4">
                        <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">No test results yet</h3>
                    <p class="text-gray-600">Upload JUnit XML files to see your test results here</p>
                </div>
            `;
            return;
        }

        container.innerHTML = testRuns
            .map(
                run => {
                    // Display format: "JOB_NAME #BUILD_NUMBER" or just run name
                    const displayName = run.ci_metadata?.job_name && run.ci_metadata?.build_number
                        ? `${run.ci_metadata.job_name} #${run.ci_metadata.build_number}`
                        : run.name;

                    return `
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200" data-run-id="${run.id}">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold text-gray-900 mb-1">${displayName}</h3>
                        <p class="text-sm text-gray-600">${new Date(run.timestamp).toLocaleString()}</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="px-2 py-1 text-xs font-medium rounded-full ${this.getStatusColorClass('passed')}">
                            ${run.total_tests - run.total_failures - run.total_errors - run.total_skipped} passed
                        </span>
                        ${run.total_failures > 0 ? `<span class="px-2 py-1 text-xs font-medium rounded-full ${this.getStatusColorClass('failed')}">${run.total_failures} failed</span>` : ''}
                        ${run.total_errors > 0 ? `<span class="px-2 py-1 text-xs font-medium rounded-full ${this.getStatusColorClass('error')}">${run.total_errors} errors</span>` : ''}
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <div class="text-2xl font-bold text-gray-900">${run.total_tests}</div>
                        <div class="text-sm text-gray-600">Total Tests</div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-gray-900">${run.time.toFixed(2)}s</div>
                        <div class="text-sm text-gray-600">Execution Time</div>
                    </div>
                </div>
                
                <div class="flex items-center justify-between">
                    <div class="text-sm text-gray-600">
                        Success Rate: ${run.total_tests > 0 ? Math.round(((run.total_tests - run.total_failures - run.total_errors) / run.total_tests) * 100) : 0}%
                    </div>
                    <button class="text-blue-600 hover:text-blue-800 text-sm font-medium" onclick="dashboard.viewDetails('${run.id}')">
                        View Details →
                    </button>
                </div>
            </div>
        `;
                }
            )
            .join('');
    }

    renderRecentUploads(uploads) {
        const container = document.getElementById('recent-uploads');
        if (!container || uploads.length === 0) {
            return;
        }

        container.innerHTML = uploads
            .map(
                upload => `
            <div class="flex items-center justify-between py-3 px-4 hover:bg-gray-50 rounded-lg">
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">${upload.filename}</p>
                    <p class="text-xs text-gray-600">${new Date(upload.upload_timestamp).toLocaleString()}</p>
                </div>
                <div class="ml-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${upload.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                        ${upload.status}
                    </span>
                </div>
            </div>
        `
            )
            .join('');
    }

    async getRecentUploads() {
        // For API client, we'll get recent uploads from test runs data
        // This is a simplified version - you could add a dedicated API endpoint for uploads
        try {
            const testRuns = await this.db.getTestRuns(5);
            return testRuns.map(run => ({
                filename: run.name || `Test Run ${run.id}`,
                upload_timestamp: run.timestamp || run.created_at,
                status: 'completed'
            }));
        } catch (error) {
            logError('Error fetching recent uploads', error);
            return [];
        }
    }

    initializeCharts(stats) {
        this.initializeStatusChart(stats);
        this.initializeTrendChart();
        this.setupChartThemeListener();
    }

    setupChartThemeListener() {
        // Listen for theme changes and re-render charts
        if (this.chartThemeObserver) {
            return; // Already set up
        }

        this.chartThemeObserver = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    // Theme changed, re-render charts
                    if (this.charts.status) {
                        // Re-initialize status chart with current stats
                        const stats = {
                            passed: parseInt(
                                document.getElementById('passed-tests')?.textContent || 0
                            ),
                            failed: parseInt(
                                document.getElementById('failed-tests')?.textContent || 0
                            ),
                            error: parseInt(
                                document.getElementById('error-tests')?.textContent || 0
                            ),
                            skipped: parseInt(
                                document.getElementById('skipped-tests')?.textContent || 0
                            )
                        };
                        this.initializeStatusChart(stats);
                    }
                    if (this.charts.trend) {
                        // Re-initialize trend chart
                        this.initializeTrendChart();
                    }
                }
            });
        });

        this.chartThemeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });
    }

    initializeStatusChart(stats) {
        const chartContainer = document.getElementById('status-chart');
        if (!chartContainer) {
            return;
        }

        // Get current theme
        const isDark = document.documentElement.classList.contains('dark');

        // Dispose existing chart if exists
        if (this.charts.status) {
            this.charts.status.dispose();
        }

        const chart = echarts.init(chartContainer);

        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)',
                backgroundColor: isDark ? '#374151' : '#ffffff',
                borderColor: isDark ? '#4b5563' : '#e5e7eb',
                textStyle: {
                    color: isDark ? '#f3f4f6' : '#1f2937'
                }
            },
            legend: {
                orient: 'vertical',
                left: 'left',
                textStyle: {
                    fontSize: 12,
                    color: isDark ? '#d1d5db' : '#4b5563'
                }
            },
            series: [
                {
                    name: 'Test Results',
                    type: 'pie',
                    radius: ['40%', '70%'],
                    center: ['60%', '50%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 4,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: false,
                        position: 'center'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: '18',
                            fontWeight: 'bold'
                        }
                    },
                    labelLine: {
                        show: false
                    },
                    data: [
                        { value: stats.passed, name: 'Passed', itemStyle: { color: '#10b981' } },
                        { value: stats.failed, name: 'Failed', itemStyle: { color: '#f59e0b' } },
                        { value: stats.error, name: 'Error', itemStyle: { color: '#ef4444' } },
                        { value: stats.skipped, name: 'Skipped', itemStyle: { color: '#6b7280' } }
                    ]
                }
            ]
        };

        chart.setOption(option);
        this.charts.status = chart;

        // Resize chart on window resize
        window.addEventListener('resize', () => {
            chart.resize();
        });
    }

    async initializeTrendChart() {
        const chartContainer = document.getElementById('trend-chart');
        if (!chartContainer) {
            return;
        }

        // Get current theme
        const isDark = document.documentElement.classList.contains('dark');

        // Dispose existing chart if exists
        if (this.charts.trend) {
            this.charts.trend.dispose();
        }

        const chart = echarts.init(chartContainer);

        try {
            // Fetch real trend data from API
            const trends = await this.db.getTrends({ limit: window.limitsConfig.get('dashboardTrends') });

            // If no data, show empty state
            if (!trends || trends.length === 0) {
                chartContainer.innerHTML =
                    '<div class="flex items-center justify-center h-full text-gray-500">No historical data available yet. Upload more test results to see trends.</div>';
                return;
            }

            // Prepare data from API response
            const dates = trends.map(t => new Date(t.date).toLocaleDateString());
            const passedData = trends.map(t => t.passed || 0);
            const failedData = trends.map(t => (t.failed || 0) + (t.errors || 0));
            const totalTests = trends.map(t => t.total_tests || 0);

            const option = {
                backgroundColor: 'transparent',
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'cross',
                        label: {
                            backgroundColor: isDark ? '#4b5563' : '#6a7985'
                        }
                    },
                    formatter: function (params) {
                        const dataIndex = params[0].dataIndex;
                        const total = totalTests[dataIndex];
                        const passed = passedData[dataIndex];
                        const failed = failedData[dataIndex];
                        const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

                        return `
                        <div style="font-size: 12px;">
                            <strong>${params[0].axisValue}</strong><br/>
                            Total Tests: ${total}<br/>
                            <span style="color: #10b981;">● Passed: ${passed}</span><br/>
                            <span style="color: #f59e0b;">● Failed: ${failed}</span><br/>
                            <strong>Success Rate: ${successRate}%</strong>
                        </div>
                    `;
                    },
                    backgroundColor: isDark ? '#374151' : '#ffffff',
                    borderColor: isDark ? '#4b5563' : '#e5e7eb',
                    textStyle: {
                        color: isDark ? '#f3f4f6' : '#1f2937'
                    }
                },
                legend: {
                    data: ['Passed', 'Failed'],
                    textStyle: {
                        fontSize: 12,
                        color: isDark ? '#d1d5db' : '#4b5563'
                    }
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: [
                    {
                        type: 'category',
                        boundaryGap: false,
                        data: dates,
                        axisLabel: {
                            fontSize: 10,
                            color: isDark ? '#d1d5db' : '#4b5563'
                        },
                        axisLine: {
                            lineStyle: {
                                color: isDark ? '#4b5563' : '#e5e7eb'
                            }
                        }
                    }
                ],
                yAxis: [
                    {
                        type: 'value',
                        axisLabel: {
                            fontSize: 10,
                            color: isDark ? '#d1d5db' : '#4b5563'
                        },
                        axisLine: {
                            lineStyle: {
                                color: isDark ? '#4b5563' : '#e5e7eb'
                            }
                        },
                        splitLine: {
                            lineStyle: {
                                color: isDark ? '#374151' : '#f3f4f6'
                            }
                        }
                    }
                ],
                series: [
                    {
                        name: 'Passed',
                        type: 'line',
                        stack: 'Total',
                        smooth: true,
                        lineStyle: {
                            width: 3
                        },
                        areaStyle: {
                            opacity: 0.3
                        },
                        emphasis: {
                            focus: 'series'
                        },
                        data: passedData,
                        itemStyle: {
                            color: '#10b981'
                        }
                    },
                    {
                        name: 'Failed',
                        type: 'line',
                        stack: 'Total',
                        smooth: true,
                        lineStyle: {
                            width: 3
                        },
                        areaStyle: {
                            opacity: 0.3
                        },
                        emphasis: {
                            focus: 'series'
                        },
                        data: failedData,
                        itemStyle: {
                            color: '#f59e0b'
                        }
                    }
                ]
            };

            chart.setOption(option);
            this.charts.trend = chart;

            // Resize chart on window resize
            window.addEventListener('resize', () => {
                chart.resize();
            });
        } catch (error) {
            logError('Error loading trend data', error);
            // Fallback to empty chart
            chartContainer.innerHTML =
                '<div class="flex items-center justify-center h-full text-gray-500">Unable to load trend data</div>';
            return;
        }
    }

    async handleRunFilter(event) {
        this.currentFilters.run_id = event.target.value === 'all' ? null : event.target.value;
        // Update suite filter to show only suites from selected run
        await this.populateSuiteFilter();
        this.applyFilters();
    }

    handleSuiteFilter(event) {
        this.currentFilters.classname = event.target.value === 'all' ? null : event.target.value;
        this.applyFilters();
    }

    handleStatusFilter(event) {
        this.currentFilters.status = event.target.value;
        this.applyFilters();
    }

    handleSearchInput(event) {
        this.currentFilters.search = event.target.value;
        this.applyFilters();
    }

    handleDateFilter(event) {
        this.currentFilters.dateRange = event.target.value;
        this.applyFilters();
    }

    handleSort(event) {
        const sortBy = event.target.dataset.sort;
        console.log('Sorting by:', sortBy);
        // TODO: Implement sorting logic
        // For now, just log the sort option
        this.currentFilters.sortBy = sortBy;
        this.applyFilters();
    }

    async applyFilters() {
        try {
            const testCases = await this.db.getTestCases(this.currentFilters);
            this.renderFilteredResults(testCases);
        } catch (error) {
            logError('Error applying filters', error);
        }
    }

    renderFilteredResults(testCases) {
        const container = document.getElementById('filtered-results');
        if (!container) {
            return;
        }

        if (testCases.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-gray-600">No test cases match your filters</p>
                </div>
            `;
            return;
        }

        container.innerHTML = testCases
            .map(
                testCase => `
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="text-sm font-medium text-gray-900 truncate">
                        ${testCase.name}
                        ${testCase.is_flaky ? '<span class="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">⚠️ FLAKY</span>' : ''}
                    </h4>
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${this.getStatusColorClass(testCase.status)}">
                        ${testCase.status}
                    </span>
                </div>
                <div class="text-xs text-gray-600 mb-2">${testCase.classname}</div>
                <div class="flex items-center justify-between text-xs text-gray-500">
                    <span>${testCase.time.toFixed(3)}s</span>
                    <span>${testCase.assertions} assertions</span>
                    <div class="flex gap-2">
                        <button class="text-green-600 hover:text-green-800 font-medium" onclick="dashboard.viewTestHistory('${testCase.name.replace(/'/g, "\\'")}', '${testCase.classname.replace(/'/g, "\\'")}')">
                            📊 History
                        </button>
                        <button class="text-blue-600 hover:text-blue-800 font-medium" onclick="dashboard.viewTestDetails('${testCase.id}')">
                            Details →
                        </button>
                    </div>
                </div>
            </div>
        `
            )
            .join('');
    }

    clearAllFilters() {
        this.currentFilters = {
            status: 'all',
            search: '',
            dateRange: null,
            run_id: null,
            classname: null
        };

        const runFilter = document.getElementById('run-filter');
        const suiteFilter = document.getElementById('suite-filter');
        const statusFilter = document.getElementById('status-filter');
        const searchInput = document.getElementById('search-input');
        const dateFilter = document.getElementById('date-filter');

        if (runFilter) {
            runFilter.value = 'all';
        }
        if (suiteFilter) {
            suiteFilter.value = 'all';
        }
        if (statusFilter) {
            statusFilter.value = 'all';
        }
        if (searchInput) {
            searchInput.value = '';
        }
        if (dateFilter) {
            dateFilter.value = 'all';
        }

        this.applyFilters();
    }

    getStatusColorClass(status) {
        const colors = {
            passed: 'bg-green-100 text-green-800',
            failed: 'bg-red-100 text-red-800',
            error: 'bg-orange-100 text-orange-800',
            skipped: 'bg-gray-100 text-gray-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    }

    viewDetails(runId) {
        console.log('viewDetails called with runId:', runId);
        console.log('Navigating to:', `details.html?run=${runId}`);
        window.location.href = `details.html?run=${runId}`;
    }

    viewTestDetails(testCaseId) {
        if (window.testDetailsModal) {
            window.testDetailsModal.show(testCaseId, this.db);
        } else {
            alert('Test details modal not initialized');
        }
    }

    viewTestHistory(testName, testClass) {
        // Navigate to test case history page
        const params = new URLSearchParams({
            name: testName,
            classname: testClass
        });
        window.location.href = `test-case-history.html?${params.toString()}`;
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    initializeAnimations() {
        // Initialize text animations
        if (typeof Splitting !== 'undefined') {
            Splitting();
        }

        // Initialize typed text effects
        const typedElements = document.querySelectorAll('[data-typed]');
        typedElements.forEach(element => {
            if (typeof Typed !== 'undefined') {
                new Typed(element, {
                    strings: [element.dataset.typed],
                    typeSpeed: 50,
                    showCursor: false
                });
            }
        });

        // Animate cards on scroll
        this.setupScrollAnimations();
    }

    setupScrollAnimations() {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        });

        const cards = document.querySelectorAll('.animate-card');
        cards.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            observer.observe(card);
        });
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new JUnitDashboard();
});
