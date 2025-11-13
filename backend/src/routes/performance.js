const express = require('express');
const router = express.Router();
const TestCase = require('../models/TestCase');
const TestRun = require('../models/TestRun');
const _ = require('lodash');

/**
 * GET /api/v1/performance/trends
 * Get performance trends for tests or test suites
 * Query params: testId, classNamecontains, days, granularity
 */
router.get('/trends', async (req, res) => {
    try {
        const { testId, className, days = 30, granularity = 'daily' } = req.query;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

        let matchCondition = {
            created_at: { $gte: cutoffDate },
            time: { $exists: true, $ne: null }
        };

        if (testId) {
            matchCondition._id = testId;
        }

        if (className) {
            matchCondition.class_name = new RegExp(_.escapeRegExp(className), 'i');
        }

        // Group by time period based on granularity
        let dateFormat;
        switch (granularity) {
            case 'hourly':
                dateFormat = '%Y-%m-%d-%H';
                break;
            case 'daily':
                dateFormat = '%Y-%m-%d';
                break;
            case 'weekly':
                dateFormat = '%Y-%U'; // Year-Week
                break;
            default:
                dateFormat = '%Y-%m-%d';
        }

        const trends = await TestCase.aggregate([
            { $match: matchCondition },
            {
                $group: {
                    _id: {
                        period: { $dateToString: { format: dateFormat, date: '$created_at' } },
                        test_name: testId ? '$name' : null,
                        class_name: className ? '$class_name' : null
                    },
                    avg_time: { $avg: '$time' },
                    min_time: { $min: '$time' },
                    max_time: { $max: '$time' },
                    total_runs: { $sum: 1 },
                    passed: {
                        $sum: { $cond: [{ $eq: ['$status', 'passed'] }, 1, 0] }
                    },
                    failed: {
                        $sum: { $cond: [{ $in: ['$status', ['failed', 'error']] }, 1, 0] }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    period: '$_id.period',
                    test_name: '$_id.test_name',
                    class_name: '$_id.class_name',
                    avg_time: { $round: ['$avg_time', 3] },
                    min_time: { $round: ['$min_time', 3] },
                    max_time: { $round: ['$max_time', 3] },
                    total_runs: 1,
                    passed: 1,
                    failed: 1,
                    pass_rate: {
                        $multiply: [{ $divide: ['$passed', '$total_runs'] }, 100]
                    }
                }
            },
            { $sort: { period: 1 } }
        ]);

        res.json({ success: true, data: { trends } });
    } catch (error) {
        console.error('Error fetching performance trends:', error);
        res.status(500).json({ error: 'Failed to fetch performance trends' });
    }
});

/**
 * GET /api/v1/performance/slowest
 * Get slowest tests
 * Query params: limit, days, threshold
 */
router.get('/slowest', async (req, res) => {
    try {
        const { limit = 100, days = 7, threshold = 0 } = req.query;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

        const slowestTests = await TestCase.aggregate([
            {
                $match: {
                    created_at: { $gte: cutoffDate },
                    time: { $gt: parseFloat(threshold) }
                }
            },
            {
                $group: {
                    _id: {
                        test_name: '$name',
                        class_name: '$class_name'
                    },
                    avg_time: { $avg: '$time' },
                    max_time: { $max: '$time' },
                    min_time: { $min: '$time' },
                    total_runs: { $sum: 1 },
                    latest_run: { $max: '$created_at' }
                }
            },
            {
                $project: {
                    _id: 0,
                    test_name: '$_id.test_name',
                    class_name: '$_id.class_name',
                    avg_time: { $round: ['$avg_time', 3] },
                    max_time: { $round: ['$max_time', 3] },
                    min_time: { $round: ['$min_time', 3] },
                    total_runs: 1,
                    latest_run: 1
                }
            },
            { $sort: { avg_time: -1 } },
            { $limit: parseInt(limit) }
        ]);

        res.json({ success: true, data: { slowest_tests: slowestTests } });
    } catch (error) {
        console.error('Error fetching slowest tests:', error);
        res.status(500).json({ error: 'Failed to fetch slowest tests' });
    }
});

/**
 * GET /api/v1/performance/regressions
 * Detect performance regressions using statistical analysis
 * Query params: days, threshold_percent, min_baseline_runs
 */
router.get('/regressions', async (req, res) => {
    try {
        const {
            days = 7,
            threshold_percent = 50, // 50% slower
            min_baseline_runs = 5
        } = req.query;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

        const baselineDate = new Date();
        baselineDate.setDate(baselineDate.getDate() - parseInt(days) * 2);

        // Get all test cases in the period
        const allTests = await TestCase.aggregate([
            {
                $match: {
                    created_at: { $gte: baselineDate },
                    time: { $exists: true, $ne: null, $gt: 0.1 } // Only tests > 0.1s
                }
            },
            {
                $group: {
                    _id: {
                        test_name: '$name',
                        class_name: '$class_name'
                    },
                    recent_times: {
                        $push: {
                            $cond: [{ $gte: ['$created_at', cutoffDate] }, '$time', '$$REMOVE']
                        }
                    },
                    baseline_times: {
                        $push: {
                            $cond: [{ $lt: ['$created_at', cutoffDate] }, '$time', '$$REMOVE']
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    test_name: '$_id.test_name',
                    class_name: '$_id.class_name',
                    recent_avg: { $avg: '$recent_times' },
                    baseline_avg: { $avg: '$baseline_times' },
                    recent_count: { $size: '$recent_times' },
                    baseline_count: { $size: '$baseline_times' }
                }
            },
            {
                $match: {
                    baseline_count: { $gte: parseInt(min_baseline_runs) },
                    recent_count: { $gte: 1 },
                    baseline_avg: { $gt: 0 }
                }
            },
            {
                $project: {
                    test_name: 1,
                    class_name: 1,
                    recent_avg: { $round: ['$recent_avg', 3] },
                    baseline_avg: { $round: ['$baseline_avg', 3] },
                    time_increase: {
                        $round: [{ $subtract: ['$recent_avg', '$baseline_avg'] }, 3]
                    },
                    percent_increase: {
                        $round: [
                            {
                                $multiply: [
                                    {
                                        $divide: [
                                            { $subtract: ['$recent_avg', '$baseline_avg'] },
                                            '$baseline_avg'
                                        ]
                                    },
                                    100
                                ]
                            },
                            1
                        ]
                    },
                    recent_count: 1,
                    baseline_count: 1
                }
            },
            {
                $match: {
                    percent_increase: { $gte: parseFloat(threshold_percent) }
                }
            },
            { $sort: { percent_increase: -1 } },
            { $limit: 50 }
        ]);

        res.json({
            success: true,
            data: {
                regressions: allTests,
                summary: {
                    total_regressions: allTests.length,
                    threshold_percent: parseFloat(threshold_percent),
                    days_analyzed: parseInt(days)
                }
            }
        });
    } catch (error) {
        console.error('Error detecting performance regressions:', error);
        res.status(500).json({ error: 'Failed to detect performance regressions' });
    }
});

/**
 * GET /api/v1/performance/test/:testId
 * Get detailed performance history for a specific test
 */
router.get('/test/:testId', async (req, res) => {
    try {
        const { testId } = req.params;
        const { days = 90 } = req.query;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

        const testHistory = await TestCase.find({
            $or: [{ _id: testId }, { name: testId }],
            created_at: { $gte: cutoffDate },
            time: { $exists: true }
        })
            .sort({ created_at: 1 })
            .select('name class_name created_at time status run_id')
            .lean();

        if (testHistory.length === 0) {
            return res
                .status(404)
                .json({ error: 'Test not found or no performance data available' });
        }

        // Calculate statistics
        const times = testHistory.map(t => t.time || 0);
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        // Calculate trend (simple linear regression slope)
        const n = times.length;
        const xMean = (n - 1) / 2;
        const yMean = avgTime;
        let numerator = 0;
        let denominator = 0;

        times.forEach((time, i) => {
            numerator += (i - xMean) * (time - yMean);
            denominator += (i - xMean) ** 2;
        });

        const trend = denominator !== 0 ? numerator / denominator : 0;

        res.json({
            success: true,
            data: {
                test_name: testHistory[0].name,
                class_name: testHistory[0].class_name,
                statistics: {
                    avg_time: Math.round(avgTime * 1000) / 1000,
                    min_time: Math.round(minTime * 1000) / 1000,
                    max_time: Math.round(maxTime * 1000) / 1000,
                    total_runs: testHistory.length,
                    trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
                    trend_value: Math.round(trend * 1000000) / 1000000
                },
                history: testHistory
            }
        });
    } catch (error) {
        console.error('Error fetching test performance history:', error);
        res.status(500).json({ error: 'Failed to fetch test performance history' });
    }
});

module.exports = router;
