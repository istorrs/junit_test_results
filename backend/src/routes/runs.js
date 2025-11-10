const express = require('express');
const router = express.Router();
const TestRun = require('../models/TestRun');
const TestSuite = require('../models/TestSuite');
const TestCase = require('../models/TestCase');
const TestResult = require('../models/TestResult');

// GET /api/v1/runs - Get all test runs with pagination
router.get('/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const query = {};

        // Filters
        if (req.query.branch) {
            query['ci_metadata.branch'] = req.query.branch;
        }
        if (req.query.from_date) {
            query.timestamp = { $gte: new Date(req.query.from_date) };
        }
        if (req.query.to_date) {
            query.timestamp = { ...query.timestamp, $lte: new Date(req.query.to_date) };
        }

        const total = await TestRun.countDocuments(query);
        const runs = await TestRun.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        res.json({
            success: true,
            data: {
                runs,
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

// GET /api/v1/runs/:id - Get specific test run with suites
router.get('/:id', async (req, res, next) => {
    try {
        const run = await TestRun.findById(req.params.id).lean();

        if (!run) {
            return res.status(404).json({
                success: false,
                error: 'Test run not found'
            });
        }

        const suites = await TestSuite.find({ run_id: req.params.id }).lean();

        res.json({
            success: true,
            data: {
                ...run,
                suites
            }
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/runs/:id - Delete test run and all related data
router.delete('/:id', async (req, res, next) => {
    try {
        // Verify the test run exists
        const run = await TestRun.findById(req.params.id);
        if (!run) {
            return res.status(404).json({
                success: false,
                error: 'Test run not found'
            });
        }

        // Delete all related data (no transaction needed for standalone MongoDB)
        await TestResult.deleteMany({ run_id: req.params.id });
        await TestCase.deleteMany({ run_id: req.params.id });
        await TestSuite.deleteMany({ run_id: req.params.id });
        await TestRun.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Test run deleted successfully'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
