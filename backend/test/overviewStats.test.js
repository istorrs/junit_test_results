const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCaseSummaryPipeline, formatOverviewStats } = require('../src/services/overviewStats');

test('buildCaseSummaryPipeline applies filters and counts cases in MongoDB', () => {
    const caseQuery = { run_id: { $in: ['run-id'] } };
    const pipeline = buildCaseSummaryPipeline(caseQuery);

    assert.deepEqual(pipeline[0], { $match: caseQuery });
    assert.equal(pipeline[1].$group.total_tests.$sum, 1);
    assert.equal(pipeline[1].$group.average_duration.$avg, '$time');
});

test('formatOverviewStats preserves the API contract', () => {
    const stats = formatOverviewStats(
        {
            total_tests: 8,
            total_passed: 6,
            total_failed: 1,
            total_errors: 1,
            total_skipped: 0,
            flaky_tests_count: 3,
            average_duration: 2.5
        },
        2
    );

    assert.deepEqual(stats, {
        total_runs: 2,
        total_tests: 8,
        total_passed: 6,
        total_failed: 1,
        total_errors: 1,
        total_skipped: 0,
        flaky_tests_count: 3,
        average_duration: 2.5,
        success_rate: '75.00'
    });
});

test('formatOverviewStats returns stable zero values for an empty database', () => {
    assert.deepEqual(formatOverviewStats(undefined), {
        total_runs: 0,
        total_tests: 0,
        total_passed: 0,
        total_failed: 0,
        total_errors: 0,
        total_skipped: 0,
        flaky_tests_count: 0,
        average_duration: 0,
        success_rate: '0.00'
    });
});
