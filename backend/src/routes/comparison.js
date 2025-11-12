const express = require('express');
const router = express.Router();
const TestRun = require('../models/TestRun');
const TestCase = require('../models/TestCase');

/**
 * GET /api/v1/comparison/runs
 * Compare two test runs side by side
 * Query params: run1, run2
 */
router.get('/runs', async (req, res) => {
    try {
        const { run1, run2 } = req.query;

        if (!run1 || !run2) {
            return res.status(400).json({
                error: 'Both run1 and run2 parameters are required'
            });
        }

        // Fetch both test runs
        const [testRun1, testRun2] = await Promise.all([
            TestRun.findById(run1).lean(),
            TestRun.findById(run2).lean()
        ]);

        if (!testRun1 || !testRun2) {
            return res.status(404).json({
                error: 'One or both test runs not found'
            });
        }

        // Fetch all test cases for both runs
        const [cases1, cases2] = await Promise.all([
            TestCase.find({ test_run_id: run1 }).lean(),
            TestCase.find({ test_run_id: run2 }).lean()
        ]);

        // Create maps for quick lookup
        const cases1Map = new Map(cases1.map(c => [`${c.class_name}.${c.test_name}`, c]));
        const cases2Map = new Map(cases2.map(c => [`${c.class_name}.${c.test_name}`, c]));

        // Get all unique test identifiers
        const allTestIds = new Set([...cases1Map.keys(), ...cases2Map.keys()]);

        // Categorize tests
        const newFailures = [];
        const fixedTests = [];
        const stillFailing = [];
        const statusChanges = [];
        const performanceChanges = [];
        const newTests = [];
        const removedTests = [];

        allTestIds.forEach(testId => {
            const case1 = cases1Map.get(testId);
            const case2 = cases2Map.get(testId);

            // New test (only in run2)
            if (!case1 && case2) {
                newTests.push({
                    test_id: testId,
                    test_name: case2.test_name,
                    class_name: case2.class_name,
                    status: case2.status,
                    time: case2.time
                });
                return;
            }

            // Removed test (only in run1)
            if (case1 && !case2) {
                removedTests.push({
                    test_id: testId,
                    test_name: case1.test_name,
                    class_name: case1.class_name,
                    status: case1.status,
                    time: case1.time
                });
                return;
            }

            // Both exists - compare
            const status1 = case1.status;
            const status2 = case2.status;

            const testInfo = {
                test_id: testId,
                test_name: case2.test_name,
                class_name: case2.class_name,
                status_before: status1,
                status_after: status2,
                time_before: case1.time || 0,
                time_after: case2.time || 0,
                time_diff: (case2.time || 0) - (case1.time || 0),
                time_diff_percent:
                    case1.time > 0
                        ? (((case2.time || 0) - (case1.time || 0)) / case1.time) * 100
                        : 0
            };

            // New failure (passed -> failed)
            if (status1 === 'passed' && (status2 === 'failure' || status2 === 'error')) {
                newFailures.push({
                    ...testInfo,
                    error_message: case2.error_message,
                    error_type: case2.error_type
                });
            }
            // Fixed test (failed -> passed)
            else if ((status1 === 'failure' || status1 === 'error') && status2 === 'passed') {
                fixedTests.push(testInfo);
            }
            // Still failing
            else if (
                (status1 === 'failure' || status1 === 'error') &&
                (status2 === 'failure' || status2 === 'error')
            ) {
                stillFailing.push({
                    ...testInfo,
                    error_message: case2.error_message,
                    error_type: case2.error_type
                });
            }
            // Status changed (but not pass/fail)
            else if (status1 !== status2) {
                statusChanges.push(testInfo);
            }

            // Check for significant performance change (>20%)
            if (Math.abs(testInfo.time_diff_percent) > 20 && case1.time > 0.1) {
                performanceChanges.push(testInfo);
            }
        });

        // Build comparison result
        const comparison = {
            run1: {
                id: testRun1._id,
                timestamp: testRun1.timestamp,
                tests: testRun1.tests,
                failures: testRun1.failures,
                errors: testRun1.errors,
                skipped: testRun1.skipped,
                time: testRun1.time,
                pass_rate:
                    testRun1.tests > 0
                        ? ((testRun1.tests -
                              testRun1.failures -
                              testRun1.errors -
                              testRun1.skipped) /
                              testRun1.tests) *
                          100
                        : 0,
                release_tag: testRun1.release_tag,
                release_version: testRun1.release_version
            },
            run2: {
                id: testRun2._id,
                timestamp: testRun2.timestamp,
                tests: testRun2.tests,
                failures: testRun2.failures,
                errors: testRun2.errors,
                skipped: testRun2.skipped,
                time: testRun2.time,
                pass_rate:
                    testRun2.tests > 0
                        ? ((testRun2.tests -
                              testRun2.failures -
                              testRun2.errors -
                              testRun2.skipped) /
                              testRun2.tests) *
                          100
                        : 0,
                release_tag: testRun2.release_tag,
                release_version: testRun2.release_version
            },
            summary: {
                total_tests_compared: allTestIds.size,
                new_failures_count: newFailures.length,
                fixed_tests_count: fixedTests.length,
                still_failing_count: stillFailing.length,
                status_changes_count: statusChanges.length,
                performance_changes_count: performanceChanges.length,
                new_tests_count: newTests.length,
                removed_tests_count: removedTests.length
            },
            details: {
                new_failures: newFailures.slice(0, 100), // Limit to first 100
                fixed_tests: fixedTests.slice(0, 100),
                still_failing: stillFailing.slice(0, 100),
                status_changes: statusChanges.slice(0, 100),
                performance_changes: performanceChanges.slice(0, 50),
                new_tests: newTests.slice(0, 50),
                removed_tests: removedTests.slice(0, 50)
            }
        };

        res.json({ success: true, data: comparison });
    } catch (error) {
        console.error('Error comparing test runs:', error);
        res.status(500).json({ error: 'Failed to compare test runs' });
    }
});

/**
 * GET /api/v1/comparison/test/:testId
 * Get comparison history for a specific test across multiple runs
 * Query params: limit, days
 */
router.get('/test/:testId', async (req, res) => {
    try {
        const { testId } = req.params;
        const { limit = 50, days = 30 } = req.query;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

        // Find all test cases for this test
        const testCases = await TestCase.find({
            $or: [{ _id: testId }, { test_name: testId }],
            timestamp: { $gte: cutoffDate }
        })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .lean();

        if (testCases.length === 0) {
            return res.status(404).json({ error: 'Test not found' });
        }

        // Get test run details for each test case
        const runIds = testCases.map(tc => tc.test_run_id);
        const testRuns = await TestRun.find({
            _id: { $in: runIds }
        }).lean();

        const runMap = new Map(testRuns.map(r => [r._id.toString(), r]));

        // Build history
        const history = testCases.map(tc => ({
            test_case_id: tc._id,
            test_run_id: tc.test_run_id,
            timestamp: tc.timestamp,
            status: tc.status,
            time: tc.time,
            error_type: tc.error_type,
            error_message: tc.error_message,
            test_run: {
                release_tag: runMap.get(tc.test_run_id.toString())?.release_tag,
                release_version: runMap.get(tc.test_run_id.toString())?.release_version
            }
        }));

        // Calculate statistics
        const totalRuns = history.length;
        const passedCount = history.filter(h => h.status === 'passed').length;
        const failedCount = history.filter(
            h => h.status === 'failure' || h.status === 'error'
        ).length;
        const avgTime = history.reduce((sum, h) => sum + (h.time || 0), 0) / totalRuns;

        res.json({
            success: true,
            data: {
                test_id: testId,
                test_name: testCases[0].test_name,
                class_name: testCases[0].class_name,
                statistics: {
                    total_runs: totalRuns,
                    passed_count: passedCount,
                    failed_count: failedCount,
                    pass_rate: (passedCount / totalRuns) * 100,
                    avg_time: avgTime
                },
                history
            }
        });
    } catch (error) {
        console.error('Error fetching test comparison history:', error);
        res.status(500).json({ error: 'Failed to fetch test comparison history' });
    }
});

module.exports = router;
