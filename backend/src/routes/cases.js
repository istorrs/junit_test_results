const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const TestCase = require('../models/TestCase');
const { MAX_QUERY_LIMIT, DEFAULT_QUERY_LIMIT } = require('../config/constants');

// GET /api/v1/cases - Get test cases with filtering
router.get('/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT);
        const skip = (page - 1) * limit;

        console.log('[Cases API] Query params:', { page, limit, skip, run_id: req.query.run_id });

        const matchQuery = {};

        // Filters
        if (req.query.run_id && req.query.run_id !== 'undefined') {
            matchQuery.run_id = new mongoose.Types.ObjectId(req.query.run_id);
        }
        if (req.query.suite_id && req.query.suite_id !== 'undefined') {
            matchQuery.suite_id = new mongoose.Types.ObjectId(req.query.suite_id);
        }
        if (req.query.class_name) {
            matchQuery.class_name = req.query.class_name;
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

        // Build aggregation pipeline
        const pipeline = [
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
                    run_ci_metadata: '$run.ci_metadata',
                    run_properties: '$run.properties'
                }
            }
        ];

        // Add job_name filter after joining with runs
        if (req.query.job_name) {
            pipeline.push({
                $match: {
                    'run_ci_metadata.job_name': req.query.job_name
                }
            });
        }

        pipeline.push(
            {
                $project: {
                    // Exclude the full run object and large output fields to reduce payload size
                    // and avoid MongoDB 16MB document size limit
                    run: 0,
                    system_out: 0,
                    system_err: 0
                }
            },
            { $sort: { timestamp: -1 } },
            { $skip: skip },
            { $limit: limit }
        );

        // Get total count with same filters
        const countPipeline = [...pipeline];
        // Remove skip, limit, and project stages for count
        const skipIndex = countPipeline.findIndex(stage => stage.$skip !== undefined);
        if (skipIndex !== -1) {
            countPipeline.splice(skipIndex);
        }
        countPipeline.push({ $count: 'total' });

        const countResult = await TestCase.aggregate(countPipeline);
        const total = countResult.length > 0 ? countResult[0].total : 0;

        const cases = await TestCase.aggregate(pipeline);

        console.log('[Cases API] Found cases:', cases.length);

        // Transform _id to id for each case
        const transformedCases = cases.map(testCase => ({
            ...testCase,
            id: testCase._id.toString(),
            _id: undefined
        }));

        res.json({
            success: true,
            data: {
                cases: transformedCases,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('[Cases API] Error:', error);
        next(error);
    }
});

// GET /api/v1/cases/:id - Get specific test case with result
router.get('/:id', async (req, res, next) => {
    try {
        console.log('[Cases API] GET /:id - Request ID:', req.params.id);

        // Use aggregation to join with TestRun to get ci_metadata and properties
        const pipeline = [
            { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
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
                    timestamp: '$run.timestamp',
                    run_name: '$run.name',
                    run_source: '$run.source',
                    run_ci_metadata: '$run.ci_metadata',
                    run_properties: '$run.properties'
                }
            },
            {
                $project: {
                    run: 0 // Exclude the full run object
                }
            }
        ];

        const cases = await TestCase.aggregate(pipeline);

        console.log('[Cases API] GET /:id - Found cases:', cases.length);
        if (cases.length > 0) {
            console.log('[Cases API] GET /:id - Requested ID:', req.params.id);
            console.log('[Cases API] GET /:id - Returned case ID:', cases[0]._id.toString());
            console.log('[Cases API] GET /:id - Test case name:', cases[0].name);
            console.log('[Cases API] GET /:id - Test case class:', cases[0].class_name);
            console.log('[Cases API] GET /:id - Run ID:', cases[0].run_id?.toString());
            console.log('[Cases API] GET /:id - Run name:', cases[0].run_name);
            console.log(
                '[Cases API] GET /:id - Run properties:',
                cases[0].run_properties ? JSON.stringify(cases[0].run_properties, null, 2) : 'null'
            );
        }

        if (!cases || cases.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Test case not found'
            });
        }

        const testCase = cases[0];

        // Transform _id to id
        const transformedCase = {
            ...testCase,
            id: testCase._id.toString(),
            _id: undefined
        };

        // Transform result if it exists
        if (transformedCase.result) {
            transformedCase.result = {
                ...transformedCase.result,
                id: transformedCase.result._id?.toString(),
                _id: undefined
            };
        }

        res.json({
            success: true,
            data: transformedCase
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

        // Find all test cases with same name and class_name across runs
        const history = await TestCase.aggregate([
            {
                $match: {
                    name: testCase.name,
                    class_name: testCase.class_name
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
                    time: '$time',
                    timestamp: '$run.timestamp',
                    error_message: '$result.error_message'
                }
            },
            { $sort: { timestamp: -1 } },
            { $limit: 30 }
        ]);

        // Transform _id to id for each history item
        const transformedHistory = history.map(item => ({
            ...item,
            id: item._id ? item._id.toString() : undefined,
            _id: undefined
        }));

        res.json({
            success: true,
            data: {
                runs: transformedHistory
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

        // Find all executions of this test (same name + class_name)
        const executions = await TestCase.aggregate([
            {
                $match: {
                    name: testCase.name,
                    class_name: testCase.class_name
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
                $limit: MAX_QUERY_LIMIT // Look at all available runs
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
        const recentFailures = recentRuns.filter(
            r => r.status === 'failed' || r.status === 'error'
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
