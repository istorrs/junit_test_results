const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const TestCase = require('../models/TestCase');
const TestResult = require('../models/TestResult');

// GET /api/v1/cases - Get test cases with filtering
router.get('/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const matchQuery = {};

        // Filters
        if (req.query.run_id) {
            matchQuery.run_id = new mongoose.Types.ObjectId(req.query.run_id);
        }
        if (req.query.suite_id) {
            matchQuery.suite_id = new mongoose.Types.ObjectId(req.query.suite_id);
        }
        if (req.query.classname) {
            matchQuery.classname = req.query.classname;
        }
        if (req.query.name) {
            matchQuery.name = req.query.name;
        }
        if (req.query.status) {
            matchQuery.status = req.query.status;
        }
        if (req.query.is_flaky) {
            matchQuery.is_flaky = req.query.is_flaky === 'true';
        }

        // Text search
        if (req.query.search) {
            matchQuery.$text = { $search: req.query.search };
        }

        const total = await TestCase.countDocuments(matchQuery);

        // Use aggregation to join with TestResult and TestRun
        const cases = await TestCase.aggregate([
            { $match: matchQuery },
            {
                $lookup: {
                    from: 'testresults',
                    localField: '_id',
                    foreignField: 'case_id',
                    as: 'result'
                }
            },
            {
                $unwind: {
                    path: '$result',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'testruns',
                    localField: 'run_id',
                    foreignField: '_id',
                    as: 'run'
                }
            },
            {
                $unwind: {
                    path: '$run',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    // Add run's timestamp as the test execution time
                    timestamp: '$run.timestamp',
                    run_name: '$run.name',
                    run_source: '$run.source',
                    run_ci_metadata: '$run.ci_metadata'
                }
            },
            {
                $project: {
                    // Exclude the full run object to reduce payload size
                    run: 0
                }
            },
            { $sort: { timestamp: -1 } },
            { $skip: skip },
            { $limit: limit }
        ]);

        res.json({
            success: true,
            data: {
                cases,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/cases/:id - Get specific test case with result
router.get('/:id', async (req, res, next) => {
    try {
        const testCase = await TestCase.findById(req.params.id).lean();

        if (!testCase) {
            return res.status(404).json({
                success: false,
                error: 'Test case not found'
            });
        }

        const result = await TestResult.findOne({ case_id: req.params.id }).lean();

        res.json({
            success: true,
            data: {
                ...testCase,
                result
            }
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/cases/:id/history - Get test case execution history
router.get('/:id/history', async (req, res, next) => {
    try {
        const testCase = await TestCase.findById(req.params.id);

        if (!testCase) {
            return res.status(404).json({
                success: false,
                error: 'Test case not found'
            });
        }

        // Find all test cases with same name and classname across runs
        const history = await TestCase.aggregate([
            {
                $match: {
                    name: testCase.name,
                    classname: testCase.classname
                }
            },
            {
                $lookup: {
                    from: 'testresults',
                    localField: '_id',
                    foreignField: 'case_id',
                    as: 'result'
                }
            },
            {
                $unwind: {
                    path: '$result',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'testruns',
                    localField: 'run_id',
                    foreignField: '_id',
                    as: 'run'
                }
            },
            {
                $unwind: {
                    path: '$run',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    run_id: { $toString: '$run_id' },
                    status: 1,
                    duration: '$time',
                    timestamp: '$run.timestamp',
                    error_message: '$result.error_message'
                }
            },
            { $sort: { timestamp: -1 } },
            { $limit: 30 }
        ]);

        res.json({
            success: true,
            data: {
                runs: history
            }
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/cases/:id/flakiness - Get test case flakiness metrics
router.get('/:id/flakiness', async (req, res, next) => {
    try {
        const testCase = await TestCase.findById(req.params.id);

        if (!testCase) {
            return res.status(404).json({
                success: false,
                error: 'Test case not found'
            });
        }

        // Find all executions of this test (same name + classname)
        const executions = await TestCase.aggregate([
            {
                $match: {
                    name: testCase.name,
                    classname: testCase.classname
                }
            },
            {
                $lookup: {
                    from: 'testruns',
                    localField: 'run_id',
                    foreignField: '_id',
                    as: 'run'
                }
            },
            {
                $unwind: {
                    path: '$run',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $sort: { 'run.timestamp': -1 }
            },
            {
                $limit: 50 // Look at last 50 runs
            },
            {
                $group: {
                    _id: null,
                    total_runs: { $sum: 1 },
                    passed_runs: {
                        $sum: { $cond: [{ $eq: ['$status', 'passed'] }, 1, 0] }
                    },
                    failed_runs: {
                        $sum: { $cond: [{ $in: ['$status', ['failed', 'error']] }, 1, 0] }
                    },
                    recent_runs: { $push: '$$ROOT' }
                }
            }
        ]);

        if (!executions || executions.length === 0) {
            return res.json({
                success: true,
                data: {
                    pass_rate: 100,
                    total_runs: 1,
                    recent_failures: 0,
                    last_status_change: testCase.created_at,
                    flakiness_score: 0
                }
            });
        }

        const stats = executions[0];
        const passRate = (stats.passed_runs / stats.total_runs) * 100;
        const flakinessScore = 100 - passRate;

        // Calculate recent failures (last 10 runs)
        const recentRuns = stats.recent_runs.slice(0, 10);
        const recentFailures = recentRuns.filter(r =>
            r.status === 'failed' || r.status === 'error'
        ).length;

        // Find last status change
        let lastStatusChange = testCase.created_at;
        for (let i = 0; i < stats.recent_runs.length - 1; i++) {
            if (stats.recent_runs[i].status !== stats.recent_runs[i + 1].status) {
                lastStatusChange = stats.recent_runs[i].run.timestamp;
                break;
            }
        }

        res.json({
            success: true,
            data: {
                pass_rate: Math.round(passRate * 100) / 100,
                total_runs: stats.total_runs,
                recent_failures: recentFailures,
                last_status_change: lastStatusChange,
                flakiness_score: Math.round(flakinessScore * 100) / 100
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
