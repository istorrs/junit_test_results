// Release Test Reports - Generate professional test reports for product releases
class ReleaseReportsPage {
    constructor() {
        this.db = new JUnitAPIClient();
        this.selectedTemplate = 'executive';
        this.selectedFormat = 'markdown';
        this.selectedRun = null;
        this.selectedSuites = new Set();
        this.allRuns = [];
        this.runTestCases = [];
        this.suiteStats = {};
        this.init();
    }

    async init() {
        try {
            await this.loadTestRuns();
            this.setupEventListeners();
            this.setDefaultDate();
        } catch (error) {
            console.error('Failed to initialize reports page:', error);
            this.showNotification('Failed to initialize page', 'error');
        }
    }

    setDefaultDate() {
        const dateInput = document.getElementById('report-date');
        if (dateInput) {
            dateInput.valueAsDate = new Date();
        }
    }

    async loadTestRuns() {
        try {
            const runsResponse = await this.db.request('/runs?limit=50');
            this.allRuns = runsResponse.data.runs;

            const runSelector = document.getElementById('run-selector');
            if (runSelector) {
                runSelector.innerHTML = '<option value="">Select test run for this release...</option>';
                this.allRuns.forEach(run => {
                    const option = document.createElement('option');
                    option.value = run._id;
                    option.textContent = `${run.name} - ${new Date(run.timestamp).toLocaleString()}`;
                    runSelector.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading test runs:', error);
            this.showNotification('Failed to load test runs', 'error');
        }
    }

    async loadTestCasesForRun(runId) {
        try {
            const casesResponse = await this.db.request(`/cases?run_id=${runId}&limit=2000`);
            this.runTestCases = casesResponse.data.cases;

            // Calculate stats for each suite
            this.suiteStats = {};
            this.runTestCases.forEach(testCase => {
                const suite = testCase.classname || 'Unknown';
                if (!this.suiteStats[suite]) {
                    this.suiteStats[suite] = {
                        total: 0,
                        passed: 0,
                        failed: 0,
                        error: 0,
                        skipped: 0,
                        time: 0
                    };
                }

                this.suiteStats[suite].total++;
                this.suiteStats[suite][testCase.status] = (this.suiteStats[suite][testCase.status] || 0) + 1;
                this.suiteStats[suite].time += testCase.time || 0;
            });

            this.renderSuiteCheckboxes();
        } catch (error) {
            console.error('Error loading test cases:', error);
            this.showNotification('Failed to load test cases', 'error');
        }
    }

    renderSuiteCheckboxes() {
        const container = document.getElementById('suite-checkboxes');
        if (!container) return;

        const suites = Object.keys(this.suiteStats).sort();

        if (suites.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm">No test suites found in this run</p>';
            return;
        }

        container.innerHTML = suites.map(suite => {
            const stats = this.suiteStats[suite];
            const passRate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 0;
            const passRateClass = passRate >= 95 ? 'text-green-600' : passRate >= 80 ? 'text-yellow-600' : 'text-red-600';

            return `
                <label class="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-100">
                    <input
                        type="checkbox"
                        class="suite-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        data-suite="${suite}"
                        checked
                    />
                    <div class="ml-3 flex-1">
                        <div class="flex items-center justify-between">
                            <span class="text-sm font-medium text-gray-900 code-font">${suite}</span>
                            <span class="text-sm ${passRateClass} font-semibold">${passRate}% pass</span>
                        </div>
                        <div class="text-xs text-gray-600 mt-1">
                            ${stats.total} tests • ${stats.passed} passed • ${stats.failed + stats.error} failed • ${stats.time.toFixed(1)}s
                        </div>
                    </div>
                </label>
            `;
        }).join('');

        // Auto-select all suites
        this.selectedSuites = new Set(suites);
    }

    setupEventListeners() {
        // Run selector
        const runSelector = document.getElementById('run-selector');
        if (runSelector) {
            runSelector.addEventListener('change', this.handleRunChange.bind(this));
        }

        // Template selection
        document.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', this.handleTemplateSelect.bind(this));
        });

        // Format selection
        document.querySelectorAll('.export-format').forEach(format => {
            format.addEventListener('click', this.handleFormatSelect.bind(this));
        });

        // Generate report button
        document.getElementById('generate-report')?.addEventListener('click', this.generateReport.bind(this));

        // Download button
        document.getElementById('download-report')?.addEventListener('click', this.downloadReport.bind(this));

        // Suite checkboxes (using event delegation)
        document.getElementById('suite-checkboxes')?.addEventListener('change', this.handleSuiteToggle.bind(this));
    }

    async handleRunChange(event) {
        this.selectedRun = event.target.value;
        if (this.selectedRun) {
            await this.loadTestCasesForRun(this.selectedRun);
        } else {
            this.runTestCases = [];
            this.suiteStats = {};
            this.selectedSuites.clear();
            document.getElementById('suite-checkboxes').innerHTML = '<p class="text-gray-500 text-sm">Select a test run first to see available test suites</p>';
        }
    }

    handleSuiteToggle(event) {
        if (event.target.classList.contains('suite-checkbox')) {
            const suite = event.target.dataset.suite;
            if (event.target.checked) {
                this.selectedSuites.add(suite);
            } else {
                this.selectedSuites.delete(suite);
            }
        }
    }

    handleTemplateSelect(event) {
        document.querySelectorAll('.template-card').forEach(card => {
            card.classList.remove('selected');
        });
        event.currentTarget.classList.add('selected');
        this.selectedTemplate = event.currentTarget.dataset.template;
    }

    handleFormatSelect(event) {
        document.querySelectorAll('.export-format').forEach(format => {
            format.classList.remove('selected');
        });
        event.currentTarget.classList.add('selected');
        this.selectedFormat = event.currentTarget.dataset.format;
    }

    async generateReport() {
        // Validation
        if (!this.selectedRun) {
            this.showNotification('Please select a test run', 'error');
            return;
        }

        if (this.selectedSuites.size === 0) {
            this.showNotification('Please select at least one test suite', 'error');
            return;
        }

        const releaseVersion = document.getElementById('release-version')?.value || 'Unspecified';
        const buildNumber = document.getElementById('build-number')?.value || 'Unspecified';
        const reportDate = document.getElementById('report-date')?.value || new Date().toISOString().split('T')[0];

        // Filter test cases to selected suites
        const selectedCases = this.runTestCases.filter(tc => this.selectedSuites.has(tc.classname));

        // Generate report based on format
        let reportContent = '';
        if (this.selectedFormat === 'markdown') {
            reportContent = this.generateMarkdownReport(releaseVersion, buildNumber, reportDate, selectedCases);
        } else if (this.selectedFormat === 'html') {
            reportContent = this.generateHTMLReport(releaseVersion, buildNumber, reportDate, selectedCases);
        } else if (this.selectedFormat === 'json') {
            reportContent = this.generateJSONReport(releaseVersion, buildNumber, reportDate, selectedCases);
        }

        // Show preview
        const preview = document.getElementById('report-preview');
        if (preview) {
            preview.textContent = reportContent;
            preview.scrollTop = 0;
        }

        this.currentReportContent = reportContent;
        this.showNotification('Report generated successfully!', 'success');
    }

    generateMarkdownReport(version, build, date, cases) {
        const totalTests = cases.length;
        const passed = cases.filter(c => c.status === 'passed').length;
        const failed = cases.filter(c => c.status === 'failed').length;
        const errors = cases.filter(c => c.status === 'error').length;
        const skipped = cases.filter(c => c.status === 'skipped').length;
        const totalTime = cases.reduce((sum, c) => sum + (c.time || 0), 0);
        const passRate = totalTests > 0 ? ((passed / totalTests) * 100).toFixed(1) : 0;

        // Release status verdict
        const releaseStatus = passRate >= 95 ? '✅ **APPROVED FOR RELEASE**' :
                             passRate >= 90 ? '⚠️ **CONDITIONAL APPROVAL**' :
                             '❌ **NOT RECOMMENDED FOR RELEASE**';

        let report = `# Release Test Report: ${version}\n\n`;
        report += `**Build:** ${build}  \n`;
        report += `**Date:** ${date}  \n`;
        report += `**Test Engineer:** Auto-generated from JUnit Dashboard\n\n`;
        report += `---\n\n`;
        report += `## Executive Summary\n\n`;
        report += `${releaseStatus}\n\n`;
        report += `- **Total Tests:** ${totalTests} tests across ${this.selectedSuites.size} suites\n`;
        report += `- **Pass Rate:** ${passRate}% (${passed} passed, ${failed + errors} failed)\n`;
        report += `- **Total Duration:** ${totalTime.toFixed(1)} seconds\n\n`;
        report += `---\n\n`;

        // Suite breakdown
        report += `## Test Suite Breakdown\n\n`;
        Array.from(this.selectedSuites).sort().forEach(suite => {
            const suiteCases = cases.filter(c => c.classname === suite);
            const suiteStats = this.suiteStats[suite];
            const suitePassRate = suiteStats.total > 0 ? ((suiteStats.passed / suiteStats.total) * 100).toFixed(1) : 0;
            const statusIcon = suitePassRate >= 95 ? '✅' : suitePassRate >= 80 ? '⚠️' : '❌';

            report += `### ${statusIcon} ${suite}\n`;
            report += `- **Pass Rate:** ${suitePassRate}% (${suiteStats.passed}/${suiteStats.total} passed)\n`;
            report += `- **Duration:** ${suiteStats.time.toFixed(1)}s\n`;
            report += `- **Status:** ${suitePassRate >= 95 ? 'Excellent' : suitePassRate >= 80 ? 'Acceptable' : 'Requires Attention'}\n\n`;

            // Failed tests for this suite
            const failedTests = suiteCases.filter(c => c.status === 'failed' || c.status === 'error');
            if (failedTests.length > 0 && this.selectedTemplate === 'detailed') {
                report += `**Failed Tests:**\n`;
                failedTests.forEach(test => {
                    report += `- \`${test.name}\` - ${test.status}\n`;
                    if (test.failure_message) {
                        report += `  - Error: ${test.failure_message.substring(0, 100)}...\n`;
                    }
                });
                report += `\n`;
            }
        });

        report += `---\n\n`;
        report += `## Release Recommendation\n\n`;
        report += `${releaseStatus}\n\n`;

        if (passRate >= 95) {
            report += `**Justification:**\n`;
            report += `- ${passRate}% pass rate exceeds 95% threshold\n`;
            report += `- All critical paths passing\n`;
            report += `- Quality metrics meet release standards\n\n`;
            report += `**Conditions:** None - safe to ship\n`;
        } else if (passRate >= 90) {
            report += `**Justification:**\n`;
            report += `- ${passRate}% pass rate is acceptable but below target\n`;
            report += `- ${failed + errors} failing tests require review\n\n`;
            report += `**Conditions:** Review and document all failures before release\n`;
        } else {
            report += `**Justification:**\n`;
            report += `- ${passRate}% pass rate is below acceptable threshold (90%)\n`;
            report += `- ${failed + errors} failing tests indicate quality issues\n\n`;
            report += `**Action Required:** Fix critical failures before reconsidering release\n`;
        }

        return report;
    }

    generateHTMLReport(version, build, date, cases) {
        const totalTests = cases.length;
        const passed = cases.filter(c => c.status === 'passed').length;
        const failed = cases.filter(c => c.status === 'failed').length;
        const errors = cases.filter(c => c.status === 'error').length;
        const passRate = totalTests > 0 ? ((passed / totalTests) * 100).toFixed(1) : 0;

        const releaseStatus = passRate >= 95 ? 'APPROVED FOR RELEASE' :
                             passRate >= 90 ? 'CONDITIONAL APPROVAL' :
                             'NOT RECOMMENDED FOR RELEASE';
        const statusColor = passRate >= 95 ? '#10b981' : passRate >= 90 ? '#f59e0b' : '#ef4444';

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Release Test Report: ${version}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #1f2937;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 10px;
        }
        .metadata {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .status {
            background: ${statusColor};
            color: white;
            padding: 15px;
            border-radius: 5px;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
        }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .metric {
            background: #f9fafb;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #3b82f6;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
        }
        .metric-label {
            color: #6b7280;
            font-size: 14px;
        }
        .suite {
            background: #f9fafb;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            border-left: 4px solid #3b82f6;
        }
        .suite-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .suite-name {
            font-weight: bold;
            font-family: monospace;
        }
        .pass-rate {
            font-weight: bold;
            padding: 4px 12px;
            border-radius: 12px;
            background: #dcfce7;
            color: #166534;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        th {
            background: #f3f4f6;
            font-weight: 600;
        }
        @media print {
            body { background: white; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Release Test Report: ${version}</h1>

        <div class="metadata">
            <strong>Build:</strong> ${build}<br>
            <strong>Date:</strong> ${date}<br>
            <strong>Test Engineer:</strong> Auto-generated from JUnit Dashboard
        </div>

        <div class="status">
            ${releaseStatus}
        </div>

        <h2>Executive Summary</h2>
        <div class="metrics">
            <div class="metric">
                <div class="metric-value">${totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value">${passRate}%</div>
                <div class="metric-label">Pass Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${passed}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${failed + errors}</div>
                <div class="metric-label">Failed</div>
            </div>
        </div>

        <h2>Test Suite Breakdown</h2>`;

        Array.from(this.selectedSuites).sort().forEach(suite => {
            const suiteStats = this.suiteStats[suite];
            const suitePassRate = suiteStats.total > 0 ? ((suiteStats.passed / suiteStats.total) * 100).toFixed(1) : 0;

            html += `
        <div class="suite">
            <div class="suite-header">
                <span class="suite-name">${suite}</span>
                <span class="pass-rate">${suitePassRate}% Pass</span>
            </div>
            <div>
                ${suiteStats.total} tests • ${suiteStats.passed} passed • ${suiteStats.failed + suiteStats.error} failed • ${suiteStats.time.toFixed(1)}s
            </div>
        </div>`;
        });

        html += `
    </div>
</body>
</html>`;

        return html;
    }

    generateJSONReport(version, build, date, cases) {
        const totalTests = cases.length;
        const passed = cases.filter(c => c.status === 'passed').length;
        const failed = cases.filter(c => c.status === 'failed').length;
        const errors = cases.filter(c => c.status === 'error').length;
        const skipped = cases.filter(c => c.status === 'skipped').length;
        const totalTime = cases.reduce((sum, c) => sum + (c.time || 0), 0);
        const passRate = totalTests > 0 ? ((passed / totalTests) * 100).toFixed(2) : 0;

        const report = {
            releaseVersion: version,
            buildNumber: build,
            reportDate: date,
            generatedAt: new Date().toISOString(),
            template: this.selectedTemplate,
            releaseStatus: passRate >= 95 ? 'APPROVED' : passRate >= 90 ? 'CONDITIONAL' : 'NOT_RECOMMENDED',
            summary: {
                totalTests,
                passed,
                failed,
                errors,
                skipped,
                passRate: parseFloat(passRate),
                totalTime,
                suitesIncluded: this.selectedSuites.size
            },
            suites: []
        };

        Array.from(this.selectedSuites).sort().forEach(suite => {
            const suiteCases = cases.filter(c => c.classname === suite);
            const suiteStats = this.suiteStats[suite];
            const suitePassRate = suiteStats.total > 0 ? ((suiteStats.passed / suiteStats.total) * 100).toFixed(2) : 0;

            const suiteData = {
                name: suite,
                stats: {
                    total: suiteStats.total,
                    passed: suiteStats.passed,
                    failed: suiteStats.failed,
                    errors: suiteStats.error,
                    skipped: suiteStats.skipped,
                    passRate: parseFloat(suitePassRate),
                    totalTime: suiteStats.time
                }
            };

            if (this.selectedTemplate === 'detailed') {
                suiteData.failedTests = suiteCases
                    .filter(c => c.status === 'failed' || c.status === 'error')
                    .map(c => ({
                        name: c.name,
                        status: c.status,
                        time: c.time,
                        message: c.failure_message
                    }));
            }

            report.suites.push(suiteData);
        });

        return JSON.stringify(report, null, 2);
    }

    downloadReport() {
        if (!this.currentReportContent) {
            this.showNotification('Please generate a report first', 'error');
            return;
        }

        const version = document.getElementById('release-version')?.value || 'unknown';
        const sanitizedVersion = version.replace(/[^a-z0-9]/gi, '_');

        let mimeType, extension;
        if (this.selectedFormat === 'markdown') {
            mimeType = 'text/markdown';
            extension = 'md';
        } else if (this.selectedFormat === 'html') {
            mimeType = 'text/html';
            extension = 'html';
        } else {
            mimeType = 'application/json';
            extension = 'json';
        }

        const blob = new Blob([this.currentReportContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `release-test-report-${sanitizedVersion}.${extension}`;
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('Report downloaded successfully!', 'success');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }
}

// Initialize reports page
document.addEventListener('DOMContentLoaded', () => {
    window.releaseReportsPage = new ReleaseReportsPage();
});
