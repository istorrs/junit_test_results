const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const TestCase = require('../models/TestCase');
const TestResult = require('../models/TestResult');
const TestRun = require('../models/TestRun');

// GET /api/v1/analytics/failure-patterns - Get common failure patterns across recent runs
router.get('/failure-patterns', async (req, res, next) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const limit = parseInt(req.query.limit) || 100;
        const job_name = req.query.job_name;

        // Calculate date threshold
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - days);

        // Build match filter
        const matchFilter = {
            status: { $in: ['failed', 'error'] },
            timestamp: { $gte: dateThreshold }
        };

        // If job_name is specified, find matching run_ids
        if (job_name) {
            const runs = await TestRun.find({ 'ci_metadata.job_name': job_name }).select('_id');
            const runIds = runs.map(r => r._id);

            // Find case_ids from those runs
            const cases = await TestCase.find({ run_id: { $in: runIds } }).select('_id');
            const caseIds = cases.map(c => c._id);

            matchFilter.case_id = { $in: caseIds };
        }

        // Aggregate failure patterns by error type and message
        const patterns = await TestResult.aggregate([
            {
                $match: matchFilter
            },
            {
                $group: {
                    _id: {
                        error_type: {
                            $ifNull: ['$error_type', '$failure_type']
                        },
                        error_message_prefix: {
                            $substr: [{ $ifNull: ['$error_message', '$failure_message'] }, 0, 100]
                        }
                    },
                    count: { $sum: 1 },
                    test_cases: { $addToSet: '$case_id' },
                    first_seen: { $min: '$timestamp' },
                    last_seen: { $max: '$timestamp' }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: limit
            },
            {
                $lookup: {
                    from: 'testcases',
                    localField: 'test_cases',
                    foreignField: '_id',
                    as: 'affected_tests'
                }
            },
            {
                $project: {
                    error_type: '$_id.error_type',
                    error_message: '$_id.error_message_prefix',
                    count: 1,
                    affected_tests: {
                        $map: {
                            input: { $slice: ['$affected_tests', 5] }, // Limit to 5 examples
                            as: 'test',
                            in: {
                                test_id: { $toString: '$$test._id' },
                                test_name: '$$test.name'
                            }
                        }
                    },
                    first_seen: 1,
                    last_seen: 1,
                    trend: {
                        $cond: {
                            if: {
                                $gte: [
                                    { $subtract: ['$last_seen', '$first_seen'] },
                                    24 * 60 * 60 * 1000 * 2 // 2 days
                                ]
                            },
                            then: 'increasing',
                            else: 'stable'
                        }
                    }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                patterns
            }
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/analytics/flaky-tests - Get top flaky tests
router.get('/flaky-tests', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const minRuns = parseInt(req.query.min_runs) || 5; // Minimum runs to be considered
        const job_name = req.query.job_name;

        // Build initial match filter
        const initialMatch = {};

        // If job_name is specified, filter by run_ids
        if (job_name) {
            const runs = await TestRun.find({ 'ci_metadata.job_name': job_name }).select('_id');
            const runIds = runs.map(r => r._id);
            initialMatch.run_id = { $in: runIds };
        }

        // Find all unique test names and their execution history
        const aggregatePipeline = [];

        // Add initial match if filtering by job
        if (Object.keys(initialMatch).length > 0) {
            aggregatePipeline.push({ $match: initialMatch });
        }

        aggregatePipeline.push(
            {
                $group: {
                    _id: {
                        name: '$name',
                        classname: '$classname'
                    },
                    test_id: { $first: '$_id' },
                    total_runs: { $sum: 1 },
                    passed_runs: {
                        $sum: { $cond: [{ $eq: ['$status', 'passed'] }, 1, 0] }
                    },
                    failed_runs: {
                        $sum: { $cond: [{ $in: ['$status', ['failed', 'error']] }, 1, 0] }
                    },
                    statuses: { $push: '$status' }
                }
            });

        aggregatePipeline.push(
            {
                $match: {
                    total_runs: { $gte: minRuns },
                    passed_runs: { $gt: 0 },
                    failed_runs: { $gt: 0 }
                }
            },
            {
                $addFields: {
                    pass_rate: {
                        $multiply: [{ $divide: ['$passed_runs', '$total_runs'] }, 100]
                    },
                    flakiness_score: {
                        $multiply: [
                            {
                                $subtract: [1, { $divide: ['$passed_runs', '$total_runs'] }]
                            },
                            100
                        ]
                    },
                    // Calculate how many times status changed
                    status_changes: {
                        $size: {
                            $filter: {
                                input: { $range: [0, { $subtract: [{ $size: '$statuses' }, 1] }] },
                                as: 'idx',
                                cond: {
                                    $ne: [
                                        { $arrayElemAt: ['$statuses', '$$idx'] },
                                        { $arrayElemAt: ['$statuses', { $add: ['$$idx', 1] }] }
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            {
                $match: {
                    pass_rate: { $gt: 0, $lt: 100 }, // Not always passing or always failing
                    status_changes: { $gte: 2 } // Has changed status at least twice
                }
            },
            {
                $sort: { flakiness_score: -1 }
            },
            {
                $limit: limit
            },
            {
                $project: {
                    test_id: { $toString: '$test_id' },
                    test_name: '$_id.name',
                    class_name: '$_id.classname',
                    pass_rate: { $round: ['$pass_rate', 2] },
                    flakiness_score: { $round: ['$flakiness_score', 2] },
                    recent_runs: '$total_runs',
                    recent_failures: '$failed_runs'
                }
            });

        const flakyTests = await TestCase.aggregate(aggregatePipeline);

        res.json({
            success: true,
            data: {
                flaky_tests: flakyTests
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
