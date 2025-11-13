const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const TestRun = require('../models/TestRun');
const TestSuite = require('../models/TestSuite');
const TestCase = require('../models/TestCase');
const TestResult = require('../models/TestResult');
const logger = require('../utils/logger');

// GET /api/v1/runs/projects - Get all unique job names (projects)
router.get('/projects', async (req, res, next) => {
    try {
        const projects = await TestRun.distinct('ci_metadata.job_name');
        const projectsFiltered = projects.filter(p => p != null && p !== '');

        res.json({
            success: true,
            data: {
                projects: projectsFiltered.sort()
            }
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/runs - Get all test runs with pagination
router.get('/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 500;
        const skip = (page - 1) * limit;

        const query = {};

        // Filters
        if (req.query.job_name) {
            query['ci_metadata.job_name'] = req.query.job_name;
        }
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

        const suites = await TestSuite.find({
            run_id: new mongoose.Types.ObjectId(req.params.id)
        }).lean();

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
        const runObjectId = new mongoose.Types.ObjectId(req.params.id);
        await TestResult.deleteMany({ run_id: runObjectId });
        await TestCase.deleteMany({ run_id: runObjectId });
        await TestSuite.deleteMany({ run_id: runObjectId });
        await TestRun.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Test run deleted successfully'
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/runs/:id1/compare/:id2 - Compare two test runs
router.get('/:id1/compare/:id2', async (req, res, next) => {
    try {
        const [run1, run2] = await Promise.all([
            TestRun.findById(req.params.id1).lean(),
            TestRun.findById(req.params.id2).lean()
        ]);

        if (!run1 || !run2) {
            return res.status(404).json({
                success: false,
                error: 'One or both test runs not found'
            });
        }

        const [cases1, cases2] = await Promise.all([
            TestCase.find({ run_id: new mongoose.Types.ObjectId(req.params.id1) }).lean(),
            TestCase.find({ run_id: new mongoose.Types.ObjectId(req.params.id2) }).lean()
        ]);

        // Create maps for easier lookup
        const cases1Map = new Map();
        cases1.forEach(c => cases1Map.set(`${c.name}|${c.classname}`, c));

        const cases2Map = new Map();
        cases2.forEach(c => cases2Map.set(`${c.name}|${c.classname}`, c));

        // Analysis
        const newFailures = [];
        const newPasses = [];
        const regressions = [];
        const newTests = [];
        const removedTests = [];

        // Check tests in run2
        for (const [key, test2] of cases2Map) {
            const test1 = cases1Map.get(key);

            if (!test1) {
                newTests.push(test2);
            } else {
                // Test exists in both runs
                if (
                    test1.status === 'passed' &&
                    (test2.status === 'failed' || test2.status === 'error')
                ) {
                    newFailures.push({
                        name: test2.name,
                        classname: test2.classname,
                        status: test2.status,
                        message: test2.failure_message
                    });
                } else if (
                    (test1.status === 'failed' || test1.status === 'error') &&
                    test2.status === 'passed'
                ) {
                    newPasses.push({
                        name: test2.name,
                        classname: test2.classname
                    });
                }

                // Check for performance regression (>20% slower)
                if (test1.status === 'passed' && test2.status === 'passed' && test1.time > 0) {
                    const percentChange = ((test2.time - test1.time) / test1.time) * 100;
                    if (percentChange > 20) {
                        regressions.push({
                            name: test2.name,
                            classname: test2.classname,
                            old_time: test1.time,
                            new_time: test2.time,
                            percent_change: percentChange.toFixed(1)
                        });
                    }
                }
            }
        }

        // Check for removed tests
        for (const [key, test1] of cases1Map) {
            if (!cases2Map.has(key)) {
                removedTests.push({
                    name: test1.name,
                    classname: test1.classname
                });
            }
        }

        // Summary stats
        const summary = {
            run1: {
                id: run1._id,
                timestamp: run1.timestamp,
                tests: cases1.length,
                passed: cases1.filter(c => c.status === 'passed').length,
                failures: cases1.filter(c => c.status === 'failed').length,
                errors: cases1.filter(c => c.status === 'error').length,
                skipped: cases1.filter(c => c.status === 'skipped').length
            },
            run2: {
                id: run2._id,
                timestamp: run2.timestamp,
                tests: cases2.length,
                passed: cases2.filter(c => c.status === 'passed').length,
                failures: cases2.filter(c => c.status === 'failed').length,
                errors: cases2.filter(c => c.status === 'error').length,
                skipped: cases2.filter(c => c.status === 'skipped').length
            }
        };

        res.json({
            success: true,
            data: {
                summary,
                new_failures: newFailures,
                new_passes: newPasses,
                performance_regressions: regressions,
                new_tests: newTests,
                removed_tests: removedTests
            }
        });
    } catch (error) {
        next(error);
    }
});

// PATCH /api/v1/runs/batch - Bulk update test runs (for release tagging)
router.patch('/batch', async (req, res, next) => {
    try {
        const { run_ids, release_tag, release_version } = req.body;

        logger.info('Batch update request received', {
            run_ids,
            release_tag,
            release_version,
            body: req.body
        });

        // Validation
        if (!run_ids || !Array.isArray(run_ids) || run_ids.length === 0) {
            logger.warn('Invalid run_ids', { run_ids, type: typeof run_ids });
            return res.status(400).json({
                success: false,
                error: 'run_ids array is required and must not be empty'
            });
        }

        if (!release_tag && !release_version) {
            logger.warn('No release metadata provided', { release_tag, release_version });
            return res.status(400).json({
                success: false,
                error: 'At least one of release_tag or release_version must be provided'
            });
        }

        // Build update object
        const updateFields = {};
        if (release_tag !== undefined) {
            updateFields.release_tag = release_tag;
        }
        if (release_version !== undefined) {
            updateFields.release_version = release_version;
        }

        // Convert string IDs to ObjectIds
        const objectIds = run_ids.map(id => new mongoose.Types.ObjectId(id));

        // Update all runs
        const result = await TestRun.updateMany(
            { _id: { $in: objectIds } },
            { $set: updateFields }
        );

        res.json({
            success: true,
            data: {
                matched_count: result.matchedCount,
                modified_count: result.modifiedCount,
                updated_fields: updateFields
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
