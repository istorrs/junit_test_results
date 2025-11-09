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

module.exports = router;
