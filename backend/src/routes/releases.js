const express = require('express');
const router = express.Router();
const TestRun = require('../models/TestRun');

/**
 * GET /api/v1/releases
 * Get all unique releases/versions with summary statistics
 */
router.get('/', async (req, res) => {
    try {
        const { limit = 50, skip = 0 } = req.query;

        // Aggregate to get unique releases with stats
        const releases = await TestRun.aggregate([
            {
                $match: {
                    release_tag: { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: '$release_tag',
                    release_version: { $first: '$release_version' },
                    first_run: { $min: '$timestamp' },
                    last_run: { $max: '$timestamp' },
                    total_runs: { $sum: 1 },
                    tests_sum: { $sum: '$tests' },
                    failures_sum: { $sum: '$failures' },
                    errors_sum: { $sum: '$errors' },
                    skipped_sum: { $sum: '$skipped' }
                }
            },
            {
                $project: {
                    _id: 0,
                    release_tag: '$_id',
                    release_version: 1,
                    first_run: 1,
                    last_run: 1,
                    total_runs: 1,
                    total_tests: '$tests_sum',
                    total_failures: '$failures_sum',
                    total_errors: '$errors_sum',
                    total_skipped: '$skipped_sum',
                    pass_rate: {
                        $multiply: [
                            {
                                $divide: [
                                    {
                                        $subtract: [
                                            '$tests_sum',
                                            { $add: ['$failures_sum', '$errors_sum'] }
                                        ]
                                    },
                                    '$tests_sum'
                                ]
                            },
                            100
                        ]
                    }
                }
            },
            { $sort: { last_run: -1 } },
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit) }
        ]);

        // Get total count
        const totalCount = await TestRun.distinct('release_tag').then(
            tags => tags.filter(tag => tag != null).length
        );

        res.json({
            releases,
            pagination: {
                total: totalCount,
                limit: parseInt(limit),
                skip: parseInt(skip),
                has_more: parseInt(skip) + releases.length < totalCount
            }
        });
    } catch (error) {
        console.error('Error fetching releases:', error);
        res.status(500).json({ error: 'Failed to fetch releases' });
    }
});

/**
 * GET /api/v1/releases/compare
 * Compare two releases in detail
 * Query params: release1, release2
 */
router.get('/compare', async (req, res) => {
    try {
        const { release1, release2 } = req.query;

        if (!release1 || !release2) {
            return res.status(400).json({
                error: 'Both release1 and release2 parameters are required'
            });
        }

        // Get all test runs for both releases
        const [runs1, runs2] = await Promise.all([
            TestRun.find({ release_tag: release1 }).sort({ timestamp: -1 }).lean(),
            TestRun.find({ release_tag: release2 }).sort({ timestamp: -1 }).lean()
        ]);

        if (runs1.length === 0 || runs2.length === 0) {
            return res.status(404).json({
                error: 'One or both releases not found'
            });
        }

        // Calculate aggregate metrics for each release
        const calculateMetrics = runs => {
            const totalTests = runs.reduce((sum, run) => sum + run.tests, 0);
            const totalFailures = runs.reduce((sum, run) => sum + run.failures, 0);
            const totalErrors = runs.reduce((sum, run) => sum + run.errors, 0);
            const totalSkipped = runs.reduce((sum, run) => sum + run.skipped, 0);
            const totalPassed = totalTests - totalFailures - totalErrors - totalSkipped;
            const totalTime = runs.reduce((sum, run) => sum + (run.time || 0), 0);

            return {
                total_runs: runs.length,
                total_tests: totalTests,
                total_passed: totalPassed,
                total_failures: totalFailures,
                total_errors: totalErrors,
                total_skipped: totalSkipped,
                pass_rate: totalTests > 0 ? (totalPassed / totalTests) * 100 : 0,
                total_time: totalTime,
                avg_time_per_run: runs.length > 0 ? totalTime / runs.length : 0,
                first_run: runs[runs.length - 1]?.timestamp,
                last_run: runs[0]?.timestamp
            };
        };

        const metrics1 = calculateMetrics(runs1);
        const metrics2 = calculateMetrics(runs2);

        // Calculate differences
        const comparison = {
            release1: {
                tag: release1,
                version: runs1[0]?.release_version,
                ...metrics1
            },
            release2: {
                tag: release2,
                version: runs2[0]?.release_version,
                ...metrics2
            },
            diff: {
                test_count_change: metrics2.total_tests - metrics1.total_tests,
                pass_rate_change: metrics2.pass_rate - metrics1.pass_rate,
                failure_change: metrics2.total_failures - metrics1.total_failures,
                time_change: metrics2.avg_time_per_run - metrics1.avg_time_per_run,
                time_change_percent:
                    metrics1.avg_time_per_run > 0
                        ? ((metrics2.avg_time_per_run - metrics1.avg_time_per_run) /
                              metrics1.avg_time_per_run) *
                          100
                        : 0
            }
        };

        res.json(comparison);
    } catch (error) {
        console.error('Error comparing releases:', error);
        res.status(500).json({ error: 'Failed to compare releases' });
    }
});

/**
 * GET /api/v1/releases/:tag/runs
 * Get all test runs for a specific release
 */
router.get('/:tag/runs', async (req, res) => {
    try {
        const { tag } = req.params;
        const { limit = 50, skip = 0 } = req.query;

        const runs = await TestRun.find({ release_tag: tag })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .lean();

        const totalCount = await TestRun.countDocuments({ release_tag: tag });

        res.json({
            runs,
            pagination: {
                total: totalCount,
                limit: parseInt(limit),
                skip: parseInt(skip),
                has_more: parseInt(skip) + runs.length < totalCount
            }
        });
    } catch (error) {
        console.error('Error fetching release runs:', error);
        res.status(500).json({ error: 'Failed to fetch release runs' });
    }
});

module.exports = router;
