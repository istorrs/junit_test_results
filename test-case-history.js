// Test Case History Page Logic
class TestCaseHistoryPage {
    constructor() {
        this.db = new JUnitAPIClient();
        this.testName = null;
        this.testClassname = null;
        this.historyData = [];
        this.runsCache = {}; // Cache for run details
        this.charts = {};
        this.init();
    }

    async init() {
        try {
            // Get test name and classname from URL
            const params = new URLSearchParams(window.location.search);
            this.testName = params.get('name');
            this.testClassname = params.get('classname');

            if (!this.testName || !this.testClassname) {
                this.showError('Missing test name or classname in URL');
                return;
            }

            // Update header
            document.getElementById('test-name').textContent = this.testName;
            document.getElementById('test-classname').textContent = this.testClassname;

            // Load test history
            await this.loadTestHistory();
            this.setupEventListeners();
        } catch (error) {
            logError('Failed to initialize history page', error);
            this.showError('Failed to load test history');
        }
    }

    async loadTestHistory() {
        try {
            // Fetch history data from API with limit
            const HISTORY_LIMIT = 100;
            this.historyData = await this.db.getTestCaseHistory(
                this.testName,
                this.testClassname,
                HISTORY_LIMIT
            );

            if (!this.historyData || this.historyData.length === 0) {
                this.showError('No history found for this test case');
                return;
            }

            // Warn if we hit the limit
            if (this.historyData.length >= HISTORY_LIMIT) {
                const warningMsg = `⚠️ WARNING: History limit (${HISTORY_LIMIT}) reached. Only showing the last ${this.historyData.length} executions. There may be more historical data not displayed.`;
                console.warn(warningMsg);
                logError(warningMsg, {
                    testName: this.testName,
                    classname: this.testClassname,
                    loadedCount: this.historyData.length,
                    limit: HISTORY_LIMIT
                });

                // Show a banner or notification
                this.showWarning(
                    `Showing last ${HISTORY_LIMIT} executions. Additional history may exist but is not displayed due to system limits.`
                );
            }

            // Load run details for all unique run_ids
            await this.loadRunDetails();

            // Render all components
            this.updateSummaryCards();
            this.renderTimelineChart();
            this.renderPerformanceChart();
            this.renderFailureAnalysis();
            this.renderHistoryTable();
        } catch (error) {
            logError('Error loading test history', error);
            this.showError('Failed to load test history: ' + error.message);
        }
    }

    async loadRunDetails() {
        // Get unique run_ids from history
        const runIds = [...new Set(this.historyData.map(h => h.run_id).filter(Boolean))];

        // Fetch run details for each unique run_id
        const runPromises = runIds.map(async runId => {
            try {
                const response = await this.db.request(`/runs/${runId}`);
                this.runsCache[runId] = response.data;
            } catch (error) {
                console.error(`Failed to load run ${runId}:`, error);
                this.runsCache[runId] = null;
            }
        });

        await Promise.all(runPromises);
    }

    getRunDisplayName(runId) {
        const run = this.runsCache[runId];
        if (!run) return `Run #${runId}`;

        // Display format: "JOB_NAME #BUILD_NUMBER" or just run name
        if (run.ci_metadata?.job_name && run.ci_metadata?.build_number) {
            return `${run.ci_metadata.job_name} #${run.ci_metadata.build_number}`;
        }

        return run.name || `Run #${runId}`;
    }

    updateSummaryCards() {
        const totalRuns = this.historyData.length;
        const passedRuns = this.historyData.filter(h => h.status === 'passed').length;
        const failedRuns = this.historyData.filter(
            h => h.status === 'failed' || h.status === 'error'
        ).length;
        const successRate = totalRuns > 0 ? ((passedRuns / totalRuns) * 100).toFixed(1) : 0;

        const avgDuration =
            totalRuns > 0
                ? (this.historyData.reduce((sum, h) => sum + (h.time || 0), 0) / totalRuns).toFixed(
                      2
                  )
                : 0;

        // Check if test is flaky (has both passes and failures)
        const isFlaky = passedRuns > 0 && failedRuns > 0;
        const flakyStatus = this.historyData.some(h => h.is_flaky);

        // Update DOM
        document.getElementById('total-runs').textContent = totalRuns;
        document.getElementById('success-rate').textContent = `${successRate}%`;
        document.getElementById('avg-duration').textContent = `${avgDuration}s`;
        document.getElementById('failure-count').textContent = failedRuns;

        const flakyIndicator = document.getElementById('flaky-indicator');
        if (isFlaky || flakyStatus) {
            flakyIndicator.textContent = '⚠️';
            flakyIndicator.title = 'This test is flaky';
        } else if (failedRuns === 0) {
            flakyIndicator.textContent = '✓';
            flakyIndicator.title = 'Stable - No failures';
            flakyIndicator.classList.remove('text-yellow-600');
            flakyIndicator.classList.add('text-green-600');
        } else {
            flakyIndicator.textContent = '✗';
            flakyIndicator.title = 'Unstable - Has failures';
            flakyIndicator.classList.remove('text-yellow-600');
            flakyIndicator.classList.add('text-red-600');
        }

        // Update status badge
        const statusBadge = document.getElementById('test-status-badge');
        const latestStatus = this.historyData[0]?.status || 'unknown';
        const statusColors = {
            passed: 'bg-green-100 text-green-800',
            failed: 'bg-red-100 text-red-800',
            error: 'bg-orange-100 text-orange-800',
            skipped: 'bg-gray-100 text-gray-800'
        };

        statusBadge.innerHTML = `
            <span class="px-3 py-1 text-sm font-medium rounded-full ${statusColors[latestStatus] || 'bg-gray-100 text-gray-800'}">
                Latest: ${latestStatus.toUpperCase()}
            </span>
            ${isFlaky || flakyStatus ? '<span class="px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800">⚠️ FLAKY</span>' : ''}
        `;
    }

    renderTimelineChart() {
        const chartContainer = document.getElementById('timeline-chart');
        if (!chartContainer) {
            return;
        }

        const chart = echarts.init(chartContainer);

        // Prepare data - take recent runs
        const recentData = this.historyData.slice(0, window.limitsConfig.get('historyRecentData')).reverse();
        const dates = recentData.map(h => new Date(h.timestamp).toLocaleDateString());

        // Create series data with colors based on status
        const seriesData = recentData.map(h => {
            const statusValues = {
                passed: 1,
                failed: 0.33,
                error: 0.66,
                skipped: 0
            };

            const colors = {
                passed: '#10b981',
                failed: '#ef4444',
                error: '#f59e0b',
                skipped: '#6b7280'
            };

            return {
                value: statusValues[h.status] || 0,
                itemStyle: {
                    color: colors[h.status] || '#6b7280'
                },
                status: h.status,
                time: h.time,
                date: new Date(h.timestamp).toLocaleString()
            };
        });

        const option = {
            tooltip: {
                trigger: 'axis',
                formatter: function (params) {
                    const data = params[0].data;
                    return `
                        <div style="font-size: 12px;">
                            <strong>${data.date}</strong><br/>
                            Status: <span style="color: ${params[0].color};">${data.status.toUpperCase()}</span><br/>
                            Duration: ${data.time.toFixed(3)}s
                        </div>
                    `;
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: dates,
                axisLabel: {
                    fontSize: 10,
                    rotate: 45
                }
            },
            yAxis: {
                type: 'value',
                show: false,
                min: 0,
                max: 1
            },
            series: [
                {
                    type: 'scatter',
                    data: seriesData,
                    symbolSize: 12,
                    label: {
                        show: false
                    }
                }
            ]
        };

        chart.setOption(option);
        this.charts.timeline = chart;

        window.addEventListener('resize', () => chart.resize());
    }

    renderPerformanceChart() {
        const chartContainer = document.getElementById('performance-chart');
        if (!chartContainer) {
            return;
        }

        const chart = echarts.init(chartContainer);

        // Prepare data - take recent runs
        const recentData = this.historyData.slice(0, window.limitsConfig.get('historyRecentData')).reverse();
        const dates = recentData.map(h => new Date(h.timestamp).toLocaleDateString());
        const durations = recentData.map(h => (h.time || 0).toFixed(3));

        // Calculate average and standard deviation for regression detection
        const avgDuration = durations.reduce((sum, d) => sum + parseFloat(d), 0) / durations.length;
        const variance =
            durations.reduce((sum, d) => sum + Math.pow(parseFloat(d) - avgDuration, 2), 0) /
            durations.length;
        const stdDev = Math.sqrt(variance);

        // Detect performance trend
        const comparisonWindow = window.limitsConfig.get('historyComparisonWindow');
        const recentAvg = durations.slice(-comparisonWindow).reduce((sum, d) => sum + parseFloat(d), 0) / comparisonWindow;
        const oldAvg = durations.slice(0, comparisonWindow).reduce((sum, d) => sum + parseFloat(d), 0) / comparisonWindow;
        const trendPercentage = oldAvg > 0 ? (((recentAvg - oldAvg) / oldAvg) * 100).toFixed(1) : 0;

        // Update trend indicator
        const trendIndicator = document.getElementById('performance-trend-indicator');
        if (Math.abs(trendPercentage) < 5) {
            trendIndicator.innerHTML = '<span class="trend-indicator neutral">→ Stable</span>';
        } else if (trendPercentage > 0) {
            trendIndicator.innerHTML = `<span class="trend-indicator up">↑ ${trendPercentage}% slower</span>`;
        } else {
            trendIndicator.innerHTML = `<span class="trend-indicator down">↓ ${Math.abs(trendPercentage)}% faster</span>`;
        }

        const option = {
            tooltip: {
                trigger: 'axis',
                formatter: function (params) {
                    return `
                        <div style="font-size: 12px;">
                            <strong>${params[0].axisValue}</strong><br/>
                            Duration: ${params[0].value}s<br/>
                            Average: ${avgDuration.toFixed(3)}s
                        </div>
                    `;
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: dates,
                axisLabel: {
                    fontSize: 10,
                    rotate: 45
                }
            },
            yAxis: {
                type: 'value',
                name: 'Duration (s)',
                axisLabel: {
                    fontSize: 10
                }
            },
            series: [
                {
                    name: 'Duration',
                    type: 'line',
                    data: durations,
                    smooth: true,
                    lineStyle: {
                        width: 2,
                        color: '#3b82f6'
                    },
                    itemStyle: {
                        color: '#3b82f6'
                    },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                                { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
                            ]
                        }
                    }
                },
                {
                    name: 'Average',
                    type: 'line',
                    data: new Array(dates.length).fill(avgDuration.toFixed(3)),
                    lineStyle: {
                        type: 'dashed',
                        color: '#6b7280',
                        width: 1
                    },
                    itemStyle: {
                        color: '#6b7280'
                    },
                    symbol: 'none'
                },
                {
                    name: 'Upper Bound',
                    type: 'line',
                    data: new Array(dates.length).fill((avgDuration + 2 * stdDev).toFixed(3)),
                    lineStyle: {
                        type: 'dotted',
                        color: '#ef4444',
                        width: 1
                    },
                    itemStyle: {
                        color: '#ef4444'
                    },
                    symbol: 'none'
                }
            ]
        };

        chart.setOption(option);
        this.charts.performance = chart;

        window.addEventListener('resize', () => chart.resize());
    }

    renderFailureAnalysis() {
        const failures = this.historyData.filter(
            h => h.status === 'failed' || h.status === 'error'
        );

        if (failures.length === 0) {
            document.getElementById('failure-analysis-section').style.display = 'none';
            return;
        }

        document.getElementById('failure-analysis-section').style.display = 'block';

        // Group failures by message
        const failureGroups = {};
        failures.forEach(f => {
            const message = f.failure_message || 'Unknown error';
            if (!failureGroups[message]) {
                failureGroups[message] = {
                    count: 0,
                    lastOccurrence: f.timestamp,
                    dates: []
                };
            }
            failureGroups[message].count++;
            failureGroups[message].dates.push(new Date(f.timestamp).toLocaleDateString());
        });

        // Sort by count
        const sortedFailures = Object.entries(failureGroups)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, window.limitsConfig.get('historyComparisonWindow'));

        const content = document.getElementById('failure-analysis-content');
        content.innerHTML = `
            <div class="space-y-4">
                <div class="text-sm text-gray-600 mb-4">
                    Total Failures: ${failures.length} / ${this.historyData.length} runs (${((failures.length / this.historyData.length) * 100).toFixed(1)}%)
                </div>
                <h4 class="font-semibold text-gray-900 mb-2">Most Common Failure Messages:</h4>
                ${sortedFailures
                    .map(
                        ([message, data]) => `
                    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div class="flex items-start justify-between mb-2">
                            <div class="flex-1">
                                <p class="text-sm font-medium text-red-900">${this.escapeHtml(message)}</p>
                            </div>
                            <span class="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                ${data.count} time${data.count > 1 ? 's' : ''}
                            </span>
                        </div>
                        <p class="text-xs text-red-700">
                            Last occurred: ${new Date(data.lastOccurrence).toLocaleDateString()}
                        </p>
                    </div>
                `
                    )
                    .join('')}
            </div>
        `;
    }

    renderHistoryTable() {
        const tableBody = document.getElementById('history-table-body');
        if (!tableBody) {
            return;
        }

        const statusColors = {
            passed: 'text-green-800 bg-green-100',
            failed: 'text-red-800 bg-red-100',
            error: 'text-orange-800 bg-orange-100',
            skipped: 'text-gray-800 bg-gray-100'
        };

        tableBody.innerHTML = this.historyData
            .map(
                item => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${new Date(item.timestamp).toLocaleString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[item.status] || 'text-gray-800 bg-gray-100'}">
                        ${item.status.toUpperCase()}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 code-font">
                    ${item.time.toFixed(3)}s
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <a href="details.html?run=${item.run_id}" class="text-blue-600 hover:text-blue-800">
                        ${this.getRunDisplayName(item.run_id) || 'Unknown'}
                    </a>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button onclick="historyPage.viewTestDetails('${item.id}')" class="text-blue-600 hover:text-blue-800 font-medium">
                        View Details
                    </button>
                </td>
            </tr>
        `
            )
            .join('');
    }

    setupEventListeners() {
        const statusFilter = document.getElementById('status-filter');
        const exportBtn = document.getElementById('export-btn');

        if (statusFilter) {
            statusFilter.addEventListener('change', this.filterHistory.bind(this));
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', this.exportToCSV.bind(this));
        }
    }

    filterHistory(event) {
        const status = event.target.value;

        let filteredData = this.historyData;
        if (status !== 'all') {
            filteredData = this.historyData.filter(h => h.status === status);
        }

        // Re-render table with filtered data
        const tableBody = document.getElementById('history-table-body');
        const statusColors = {
            passed: 'text-green-800 bg-green-100',
            failed: 'text-red-800 bg-red-100',
            error: 'text-orange-800 bg-orange-100',
            skipped: 'text-gray-800 bg-gray-100'
        };

        tableBody.innerHTML = filteredData
            .map(
                item => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${new Date(item.timestamp).toLocaleString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[item.status] || 'text-gray-800 bg-gray-100'}">
                        ${item.status.toUpperCase()}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 code-font">
                    ${item.time.toFixed(3)}s
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <a href="details.html?run=${item.run_id}" class="text-blue-600 hover:text-blue-800">
                        ${this.getRunDisplayName(item.run_id) || 'Unknown'}
                    </a>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button onclick="historyPage.viewTestDetails('${item.id}')" class="text-blue-600 hover:text-blue-800 font-medium">
                        View Details
                    </button>
                </td>
            </tr>
        `
            )
            .join('');
    }

    viewTestDetails(testCaseId) {
        if (window.testDetailsModal) {
            window.testDetailsModal.show(testCaseId, this.db);
        } else {
            alert('Test details modal not initialized');
        }
    }

    exportToCSV() {
        const headers = ['Date', 'Status', 'Duration (s)', 'Run ID'];
        const rows = this.historyData.map(item => [
            new Date(item.timestamp).toISOString(),
            item.status,
            item.time.toFixed(3),
            item.run_id || 'Unknown'
        ]);

        let csv = headers.join(',') + '\n';
        csv += rows.map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.testName}-history.csv`;
        a.click();
        URL.revokeObjectURL(url);

        this.showSuccess('History exported successfully');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        const bgColor =
            type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : 'bg-green-500';
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${bgColor} text-white`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize history page
document.addEventListener('DOMContentLoaded', () => {
    window.historyPage = new TestCaseHistoryPage();
});
