// Actionable Insights Component
class InsightsPanel {
    constructor(db) {
        this.db = db;
        this.insights = [];
    }

    async loadInsights() {
        try {
            const insights = [];

            // Get recent test runs to compare
            const recentRuns = await this.db.getTestRuns(5);

            if (recentRuns.length >= 2) {
                // Detect new failures
                const newFailures = await this.detectNewFailures(recentRuns[0], recentRuns[1]);
                if (newFailures.length > 0) {
                    insights.push({
                        type: 'new_failures',
                        severity: 'high',
                        title: `${newFailures.length} New Failure${newFailures.length > 1 ? 's' : ''} in Latest Run`,
                        description: newFailures.map(f => f.name).join(', '),
                        action: 'View Details',
                        actionUrl: `details.html?run=${recentRuns[0].id}`,
                        tests: newFailures
                    });
                }
            }

            // Detect flaky tests
            const flakyTests = await this.detectFlakyTests();
            if (flakyTests.length > 0) {
                const topFlaky = flakyTests[0];
                insights.push({
                    type: 'flaky_test',
                    severity: 'medium',
                    title: `${topFlaky.name} is Flaky`,
                    description: `Failed ${topFlaky.failureCount} out of last ${topFlaky.totalRuns} runs`,
                    action: 'View History',
                    actionUrl: `test-case-history.html?name=${encodeURIComponent(topFlaky.name)}&classname=${encodeURIComponent(topFlaky.classname)}`,
                    test: topFlaky
                });
            }

            // Detect performance regressions
            const perfRegressions = await this.detectPerformanceRegressions();
            if (perfRegressions.length > 0) {
                const topRegression = perfRegressions[0];
                insights.push({
                    type: 'performance_regression',
                    severity: 'medium',
                    title: `${topRegression.name} is ${topRegression.percentageChange}% Slower`,
                    description: `Average: ${topRegression.oldAvg}s → Now: ${topRegression.newAvg}s`,
                    action: 'View Performance Trend',
                    actionUrl: `test-case-history.html?name=${encodeURIComponent(topRegression.name)}&classname=${encodeURIComponent(topRegression.classname)}`,
                    test: topRegression
                });
            }

            // Check suite health
            const unhealthySuites = await this.detectUnhealthySuites(recentRuns[0]);
            if (unhealthySuites.length > 0) {
                const worstSuite = unhealthySuites[0];
                insights.push({
                    type: 'suite_health',
                    severity: 'medium',
                    title: `${worstSuite.name} Suite at ${worstSuite.successRate}% Success Rate`,
                    description: `Below threshold (80%). ${worstSuite.failureCount} tests failing.`,
                    action: 'Analyze Suite',
                    actionUrl: `details.html?run=${recentRuns[0].id}`,
                    suite: worstSuite
                });
            }

            this.insights = insights;
            return insights;
        } catch (error) {
            console.error('Error loading insights:', error);
            return [];
        }
    }

    async detectNewFailures(latestRun, previousRun) {
        try {
            const latestCases = await this.db.getTestCases({ run_id: latestRun.id });
            const previousCases = await this.db.getTestCases({ run_id: previousRun.id });

            const latestFailed = latestCases.filter(
                c => c.status === 'failed' || c.status === 'error'
            );
            const previousFailed = new Set(
                previousCases
                    .filter(c => c.status === 'failed' || c.status === 'error')
                    .map(c => `${c.name}:${c.classname}`)
            );

            const newFailures = latestFailed.filter(c => {
                const key = `${c.name}:${c.classname}`;
                return !previousFailed.has(key);
            });

            return newFailures.slice(0, 5); // Return top 5
        } catch (error) {
            console.error('Error detecting new failures:', error);
            return [];
        }
    }

    async detectFlakyTests() {
        try {
            const flakyTests = await this.db.getFlakyTests();

            // Enrich with recent history to calculate failure rate
            const enrichedTests = await Promise.all(
                flakyTests.slice(0, 5).map(async test => {
                    const history = await this.db.getTestCaseHistory(test.name, test.classname);
                    const recentHistory = history.slice(0, 10);
                    const failureCount = recentHistory.filter(
                        h => h.status === 'failed' || h.status === 'error'
                    ).length;

                    return {
                        ...test,
                        failureCount,
                        totalRuns: recentHistory.length,
                        failureRate: ((failureCount / recentHistory.length) * 100).toFixed(1)
                    };
                })
            );

            return enrichedTests
                .filter(t => t.failureCount > 0)
                .sort((a, b) => b.failureRate - a.failureRate);
        } catch (error) {
            console.error('Error detecting flaky tests:', error);
            return [];
        }
    }

    async detectPerformanceRegressions() {
        try {
            // Get recent test runs
            const recentRuns = await this.db.getTestRuns(10);

            if (recentRuns.length < 5) {
                return [];
            }

            // Get test cases from recent runs
            const recentCases = await this.db.getTestCases({ run_id: recentRuns[0].id });

            const regressions = [];

            for (const testCase of recentCases) {
                try {
                    const history = await this.db.getTestCaseHistory(
                        testCase.name,
                        testCase.classname
                    );

                    if (history.length < 5) {
                        continue;
                    }

                    // Compare recent 3 runs vs previous 5 runs
                    const recent = history.slice(0, 3);
                    const previous = history.slice(3, 8);

                    const recentAvg =
                        recent.reduce((sum, h) => sum + (h.time || 0), 0) / recent.length;
                    const previousAvg =
                        previous.reduce((sum, h) => sum + (h.time || 0), 0) / previous.length;

                    if (previousAvg === 0) {
                        continue;
                    }

                    const percentageChange = ((recentAvg - previousAvg) / previousAvg) * 100;

                    // Flag if more than 20% slower
                    if (percentageChange > 20) {
                        regressions.push({
                            ...testCase,
                            oldAvg: previousAvg.toFixed(3),
                            newAvg: recentAvg.toFixed(3),
                            percentageChange: percentageChange.toFixed(1)
                        });
                    }
                } catch {
                    // Skip this test if history fails
                    continue;
                }
            }

            return regressions
                .sort((a, b) => parseFloat(b.percentageChange) - parseFloat(a.percentageChange))
                .slice(0, 3);
        } catch (error) {
            console.error('Error detecting performance regressions:', error);
            return [];
        }
    }

    async detectUnhealthySuites(latestRun) {
        try {
            if (!latestRun) {
                return [];
            }

            const suites = await this.db.getTestSuites(latestRun.id);

            const unhealthySuites = suites
                .map(suite => {
                    const successRate =
                        suite.tests > 0
                            ? ((suite.tests - suite.failures - suite.errors) / suite.tests) * 100
                            : 0;

                    return {
                        ...suite,
                        successRate: successRate.toFixed(1),
                        failureCount: suite.failures + suite.errors
                    };
                })
                .filter(suite => parseFloat(suite.successRate) < 80)
                .sort((a, b) => parseFloat(a.successRate) - parseFloat(b.successRate));

            return unhealthySuites.slice(0, 3);
        } catch (error) {
            console.error('Error detecting unhealthy suites:', error);
            return [];
        }
    }

    render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            return;
        }

        if (this.insights.length === 0) {
            container.innerHTML = `
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <svg class="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <div class="ml-4">
                            <h3 class="text-lg font-semibold text-gray-900">All Good!</h3>
                            <p class="text-gray-600">No issues detected in recent test runs.</p>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        const severityIcons = {
            high: `<svg class="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>`,
            medium: `<svg class="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>`,
            low: `<svg class="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>`
        };

        const severityColors = {
            high: 'border-red-200 bg-red-50',
            medium: 'border-yellow-200 bg-yellow-50',
            low: 'border-blue-200 bg-blue-50'
        };

        container.innerHTML = `
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg class="h-6 w-6 text-orange-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                    </svg>
                    Requires Attention (${this.insights.length})
                </h3>
                <div class="space-y-4">
                    ${this.insights
                        .map(
                            insight => `
                        <div class="border ${severityColors[insight.severity]} rounded-lg p-4">
                            <div class="flex items-start">
                                <div class="flex-shrink-0">
                                    ${severityIcons[insight.severity]}
                                </div>
                                <div class="ml-3 flex-1">
                                    <h4 class="text-sm font-semibold text-gray-900 mb-1">
                                        ${insight.title}
                                    </h4>
                                    <p class="text-sm text-gray-700 mb-2">
                                        ${insight.description}
                                    </p>
                                    <div class="flex gap-2">
                                        <a href="${insight.actionUrl}" class="text-sm font-medium text-blue-600 hover:text-blue-800">
                                            ${insight.action} →
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `
                        )
                        .join('')}
                </div>
            </div>
        `;
    }
}

// Export for use in main dashboard
window.InsightsPanel = InsightsPanel;
