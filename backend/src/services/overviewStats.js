const buildCaseSummaryPipeline = caseQuery => [
    { $match: caseQuery },
    {
        $group: {
            _id: null,
            total_tests: { $sum: 1 },
            total_passed: { $sum: { $cond: [{ $eq: ['$status', 'passed'] }, 1, 0] } },
            total_failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            total_errors: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
            total_skipped: { $sum: { $cond: [{ $eq: ['$status', 'skipped'] }, 1, 0] } },
            flaky_tests_count: { $sum: { $cond: ['$is_flaky', 1, 0] } },
            average_duration: { $avg: '$time' }
        }
    }
];

const formatOverviewStats = (summary, totalRuns = 0) => {
    const totals = summary || {
        total_tests: 0,
        total_passed: 0,
        total_failed: 0,
        total_errors: 0,
        total_skipped: 0,
        flaky_tests_count: 0,
        average_duration: 0
    };
    const totalTests = totals.total_tests || 0;
    const totalPassed = totals.total_passed || 0;

    return {
        total_runs: totalRuns,
        total_tests: totalTests,
        total_passed: totalPassed,
        total_failed: totals.total_failed || 0,
        total_errors: totals.total_errors || 0,
        total_skipped: totals.total_skipped || 0,
        flaky_tests_count: totals.flaky_tests_count || 0,
        average_duration: totals.average_duration || 0,
        success_rate: totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : '0.00'
    };
};

module.exports = { buildCaseSummaryPipeline, formatOverviewStats };
