const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const TestRun = require('../models/TestRun');
const TestCase = require('../models/TestCase');
const logger = require('../utils/logger');

// GET /api/v1/stats/overview - Get overall statistics
router.get('/overview', async (req, res, next) => {
    try {
        const query = {};
        const runQuery = {};

        if (req.query.run_id) {
            query.run_id = new mongoose.Types.ObjectId(req.query.run_id);
            logger.info(`Filtering by run_id: ${req.query.run_id}, ObjectId: ${query.run_id}`);
        }
        if (req.query.from_date) {
            query.created_at = { $gte: new Date(req.query.from_date) };
            runQuery.created_at = { $gte: new Date(req.query.from_date) };
        }
        if (req.query.to_date) {
            query.created_at = { ...query.created_at, $lte: new Date(req.query.to_date) };
            runQuery.created_at = { ...runQuery.created_at, $lte: new Date(req.query.to_date) };
        }

        logger.info(`Query for test cases: ${JSON.stringify(query)}`);
        const totalRuns = await TestRun.countDocuments(runQuery);
        const cases = await TestCase.find(query);
        logger.info(`Found cases: ${cases.length}`);

        const stats = {
            total_runs: totalRuns,
            total_tests: cases.length,
            total_passed: cases.filter(c => c.status === 'passed').length,
            total_failed: cases.filter(c => c.status === 'failed').length,
            total_errors: cases.filter(c => c.status === 'error').length,
            total_skipped: cases.filter(c => c.status === 'skipped').length,
            flaky_tests_count: cases.filter(c => c.is_flaky).length,
            average_duration: cases.reduce((sum, c) => sum + c.time, 0) / cases.length || 0
        };

        stats.success_rate = stats.total_tests > 0
            ? ((stats.total_passed / stats.total_tests) * 100).toFixed(2)
            : 0;

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/v1/stats/trends - Get test execution trends
router.get('/trends', async (req, res, next) => {
    try {
        const runs = await TestRun.find()
            .sort({ timestamp: 1 })
            .limit(30)
            .lean();

        const trends = [];

        for (const run of runs) {
            const cases = await TestCase.find({ run_id: run._id });

            trends.push({
                date: run.timestamp,
                run_id: run._id,
                total_tests: cases.length,
                passed: cases.filter(c => c.status === 'passed').length,
                failed: cases.filter(c => c.status === 'failed').length,
                errors: cases.filter(c => c.status === 'error').length,
                skipped: cases.filter(c => c.status === 'skipped').length,
                success_rate: cases.length > 0
                    ? ((cases.filter(c => c.status === 'passed').length / cases.length) * 100).toFixed(2)
                    : 0
            });
        }

        res.json({
            success: true,
            data: trends
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/v1/stats/flaky-tests - Get flaky tests
router.get('/flaky-tests', async (req, res, next) => {
    try {
        const flakyTests = await TestCase.aggregate([
            { $match: { is_flaky: true } },
            {
                $group: {
                    _id: { name: '$name', classname: '$classname' },
                    failure_count: {
                        $sum: {
                            $cond: [
                                { $in: ['$status', ['failed', 'error']] },
                                1,
                                0
                            ]
                        }
                    },
                    total_runs: { $sum: 1 },
                    last_failed: { $max: '$created_at' }
                }
            },
            {
                $project: {
                    name: '$_id.name',
                    classname: '$_id.classname',
                    failure_count: 1,
                    total_runs: 1,
                    failure_rate: {
                        $multiply: [
                            { $divide: ['$failure_count', '$total_runs'] },
                            100
                        ]
                    },
                    last_failed: 1
                }
            },
            { $sort: { failure_rate: -1 } }
        ]);

        res.json({
            success: true,
            data: flakyTests
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/v1/stats/performance-regressions - Get performance regressions
router.get('/performance-regressions', async (req, res, next) => {
    try {
        const threshold = parseFloat(req.query.threshold) || 20; // 20% slower by default

        // Get unique test names
        const uniqueTests = await TestCase.aggregate([
            {
                $group: {
                    _id: { name: '$name', classname: '$classname' }
                }
            }
        ]);

        const regressions = [];

        for (const test of uniqueTests) {
            const cases = await TestCase.find({
                name: test._id.name,
                classname: test._id.classname,
                status: 'passed'
            }).sort({ created_at: -1 }).limit(8).lean();

            if (cases.length >= 8) {
                const recent = cases.slice(0, 3);
                const baseline = cases.slice(3, 8);

                const recentAvg = recent.reduce((sum, c) => sum + c.time, 0) / recent.length;
                const baselineAvg = baseline.reduce((sum, c) => sum + c.time, 0) / baseline.length;

                if (baselineAvg > 0) {
                    const percentChange = ((recentAvg - baselineAvg) / baselineAvg) * 100;

                    if (percentChange > threshold) {
                        regressions.push({
                            name: test._id.name,
                            classname: test._id.classname,
                            baseline_avg: baselineAvg.toFixed(3),
                            recent_avg: recentAvg.toFixed(3),
                            percent_change: percentChange.toFixed(1)
                        });
                    }
                }
            }
        }

        res.json({
            success: true,
            data: regressions.sort((a, b) => parseFloat(b.percent_change) - parseFloat(a.percent_change))
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/v1/stats/slowest-tests - Get slowest tests
router.get('/slowest-tests', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 20;

        const slowestTests = await TestCase.aggregate([
            {
                $group: {
                    _id: { name: '$name', classname: '$classname' },
                    avg_time: { $avg: '$time' },
                    max_time: { $max: '$time' },
                    min_time: { $min: '$time' },
                    total_runs: { $sum: 1 }
                }
            },
            {
                $project: {
                    name: '$_id.name',
                    classname: '$_id.classname',
                    avg_time: { $round: ['$avg_time', 3] },
                    max_time: { $round: ['$max_time', 3] },
                    min_time: { $round: ['$min_time', 3] },
                    total_runs: 1
                }
            },
            { $sort: { avg_time: -1 } },
            { $limit: limit }
        ]);

        res.json({
            success: true,
            data: slowestTests
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/v1/stats/suite-performance - Get suite-level performance
router.get('/suite-performance', async (req, res, next) => {
    try {
        const suites = await TestCase.aggregate([
            {
                $group: {
                    _id: '$classname',
                    total_tests: { $sum: 1 },
                    passed: {
                        $sum: { $cond: [{ $eq: ['$status', 'passed'] }, 1, 0] }
                    },
                    failed: {
                        $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                    },
                    errors: {
                        $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] }
                    },
                    total_time: { $sum: '$time' },
                    avg_time: { $avg: '$time' }
                }
            },
            {
                $project: {
                    suite_name: '$_id',
                    total_tests: 1,
                    passed: 1,
                    failed: 1,
                    errors: 1,
                    total_time: { $round: ['$total_time', 2] },
                    avg_time: { $round: ['$avg_time', 3] },
                    success_rate: {
                        $multiply: [
                            { $divide: ['$passed', '$total_tests'] },
                            100
                        ]
                    }
                }
            },
            { $sort: { total_time: -1 } }
        ]);

        res.json({
            success: true,
            data: suites
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
