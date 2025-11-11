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

        // Find all test cases with same name and classname, join with TestResult for timestamps
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
            { $sort: { 'result.timestamp': -1 } },
            { $limit: 20 }
        ]);

        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
