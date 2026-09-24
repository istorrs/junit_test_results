const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const TestRun = require('../models/TestRun');
const TestSuite = require('../models/TestSuite');
const TestCase = require('../models/TestCase');
const TestResult = require('../models/TestResult');
const FileUpload = require('../models/FileUpload');
const AllureAttachment = require('../models/AllureAttachment');
const logger = require('../utils/logger');
const { MAX_QUERY_LIMIT, DEFAULT_QUERY_LIMIT } = require('../config/constants');
const { getRunSort, buildPassRateSortPipeline } = require('../services/runSorting');
const { apiRateLimiter } = require('../middleware/rateLimiter');

// GET /api/v1/runs/projects - Get all unique job names (projects)
router.get('/projects', async (req, res, next) => {
    try {
        const projects = await TestRun.distinct('ci_metadata.job_name');
        const projectsFiltered = projects.filter(p => p !== null && p !== '');

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
        const limit = Math.min(parseInt(req.query.limit) || DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT);
        const skip = (page - 1) * limit;
        const sort = getRunSort(req.query.sort_by, req.query.sort_order);

        const query = {};

        // Filters
        if (req.query.job_name) {
            query['ci_metadata.job_name'] = { $eq: req.query.job_name };
        }
        if (req.query.branch) {
            query['ci_metadata.branch'] = { $eq: req.query.branch };
        }
        if (req.query.from_date) {
            query.timestamp = { $gte: new Date(req.query.from_date) };
        }
        if (req.query.to_date) {
            const toDate = new Date(req.query.to_date);
            if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.to_date)) {
                toDate.setUTCHours(23, 59, 59, 999);
            }
            query.timestamp = { ...query.timestamp, $lte: toDate };
        }

        const additionalFilters = [];
        if (req.query.search) {
            const escapedSearch = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const searchPattern = new RegExp(escapedSearch, 'i');
            const searchFilters = [
                { name: searchPattern },
                { 'ci_metadata.job_name': searchPattern },
                { 'ci_metadata.branch': searchPattern }
            ];
            if (mongoose.isValidObjectId(req.query.search)) {
                searchFilters.push({ _id: new mongoose.Types.ObjectId(req.query.search) });
            }
            additionalFilters.push({ $or: searchFilters });
        }
        if (req.query.status === 'passed') {
            additionalFilters.push({ $expr: { $eq: ['$passed', '$total_tests'] } });
        } else if (req.query.status === 'failed') {
            additionalFilters.push({ $or: [{ failed: { $gt: 0 } }, { errors: { $gt: 0 } }] });
        } else if (req.query.status === 'mixed') {
            additionalFilters.push({
                $expr: {
                    $and: [{ $gt: ['$passed', 0] }, { $lt: ['$passed', '$total_tests'] }]
                }
            });
        }
        if (additionalFilters.length > 0) {
            query.$and = additionalFilters;
        }

        const [total, runs] = await Promise.all([
            TestRun.countDocuments(query),
            sort.field === 'pass_rate'
                ? TestRun.aggregate(buildPassRateSortPipeline(query, sort.direction, skip, limit))
                : TestRun.find(query)
                // Keep pagination stable when multiple runs share the selected value.
                    .sort({ [sort.field]: sort.direction, _id: sort.direction })
                    .skip(skip)
                    .limit(limit)
                    .lean()
        ]);

        // Transform _id to id for each run
        const transformedRuns = runs.map(run => ({
            ...run,
            id: run._id.toString(),
            _id: undefined
        }));

        res.json({
            success: true,
            data: {
                runs: transformedRuns,
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

        // Transform _id to id for the run
        const transformedRun = {
            ...run,
            id: run._id.toString(),
            _id: undefined
        };

        // Transform _id to id for each suite
        const transformedSuites = suites.map(suite => ({
            ...suite,
            id: suite._id.toString(),
            _id: undefined
        }));

        res.json({
            success: true,
            data: {
                ...transformedRun,
                suites: transformedSuites
            }
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/runs/:id - Delete test run and all related data
router.delete('/:id', apiRateLimiter, async (req, res, next) => {
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
        await AllureAttachment.deleteMany({ run_id: runObjectId });
        await TestCase.deleteMany({ run_id: runObjectId });
        await TestSuite.deleteMany({ run_id: runObjectId });
        await FileUpload.deleteMany({ run_id: runObjectId });
        await TestRun.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            data: {
                success: true,
                message: 'Test run deleted successfully'
            }
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
        cases1.forEach(c => cases1Map.set(`${c.name}|${c.class_name}`, c));

        const cases2Map = new Map();
        cases2.forEach(c => cases2Map.set(`${c.name}|${c.class_name}`, c));

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
                        class_name: test2.class_name,
                        status: test2.status,
                        error_message: test2.error_message
                    });
                } else if (
                    (test1.status === 'failed' || test1.status === 'error') &&
                    test2.status === 'passed'
                ) {
                    newPasses.push({
                        name: test2.name,
                        class_name: test2.class_name
                    });
                }

                // Check for performance regression (>20% slower)
                if (test1.status === 'passed' && test2.status === 'passed' && test1.time > 0) {
                    const percentChange = ((test2.time - test1.time) / test1.time) * 100;
                    if (percentChange > 20) {
                        regressions.push({
                            name: test2.name,
                            class_name: test2.class_name,
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
                    class_name: test1.class_name
                });
            }
        }

        // Summary stats
        const summary = {
            run1: {
                id: run1._id,
                timestamp: run1.timestamp,
                total_tests: cases1.length,
                passed: cases1.filter(c => c.status === 'passed').length,
                failed: cases1.filter(c => c.status === 'failed').length,
                errors: cases1.filter(c => c.status === 'error').length,
                skipped: cases1.filter(c => c.status === 'skipped').length
            },
            run2: {
                id: run2._id,
                timestamp: run2.timestamp,
                total_tests: cases2.length,
                passed: cases2.filter(c => c.status === 'passed').length,
                failed: cases2.filter(c => c.status === 'failed').length,
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

// PATCH /api/v1/runs/batch - Bulk update test run metadata
router.patch('/batch', async (req, res, next) => {
    try {
        const { run_ids, release_tag, release_version, job_name } = req.body;

        logger.info('Batch update request received', {
            run_ids,
            release_tag,
            release_version,
            job_name,
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

        if (release_tag === undefined && release_version === undefined && job_name === undefined) {
            logger.warn('No run metadata provided', { release_tag, release_version, job_name });
            return res.status(400).json({
                success: false,
                error: 'At least one run metadata field must be provided'
            });
        }

        if (job_name !== undefined && job_name !== null && typeof job_name !== 'string') {
            return res.status(400).json({ success: false, error: 'job_name must be a string or null' });
        }
        const normalizedJobName = typeof job_name === 'string' ? job_name.trim() : job_name;
        if (normalizedJobName && normalizedJobName.length > 200) {
            return res.status(400).json({ success: false, error: 'job_name must be 200 characters or fewer' });
        }

        if (run_ids.some(id => !mongoose.isValidObjectId(id))) {
            return res.status(400).json({ success: false, error: 'run_ids contains an invalid ID' });
        }

        // Build an aggregation-pipeline update so assigning a project also works
        // for manually uploaded runs whose ci_metadata field is currently null.
        const updateFields = {};
        const persistedFields = {};
        if (release_tag !== undefined) {
            updateFields.release_tag = release_tag;
            persistedFields.release_tag = { $literal: release_tag };
        }
        if (release_version !== undefined) {
            updateFields.release_version = release_version;
            persistedFields.release_version = { $literal: release_version };
        }
        if (job_name !== undefined) {
            updateFields['ci_metadata.job_name'] = normalizedJobName || null;
            persistedFields.ci_metadata = {
                $mergeObjects: [
                    { $ifNull: ['$ci_metadata', {}] },
                    { job_name: { $literal: normalizedJobName || null } }
                ]
            };
        }

        // Convert string IDs to ObjectIds
        const objectIds = run_ids.map(id => new mongoose.Types.ObjectId(id));

        // Update all runs
        const result = await TestRun.updateMany(
            { _id: { $in: objectIds } },
            [{ $set: persistedFields }]
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

// POST /api/v1/runs/:id/recalculate-stats - Recalculate test run statistics
router.post('/:id/recalculate-stats', async (req, res, next) => {
    try {
        const runId = req.params.id;

        // Find the test run
        const testRun = await TestRun.findById(runId);
        if (!testRun) {
            return res.status(404).json({
                success: false,
                error: 'Test run not found'
            });
        }

        // Get all test cases for this run
        const cases = await TestCase.find({ run_id: runId });

        // Calculate stats
        const stats = {
            total_tests: cases.length,
            passed: cases.filter(c => c.status === 'passed').length,
            failed: cases.filter(c => c.status === 'failed').length,
            errors: cases.filter(c => c.status === 'error').length,
            skipped: cases.filter(c => c.status === 'skipped').length,
            time: cases.reduce((sum, c) => sum + c.time, 0)
        };

        // Update the test run
        await TestRun.findByIdAndUpdate(runId, stats);

        logger.info(`Recalculated stats for run ${runId}`, stats);

        res.json({
            success: true,
            data: {
                run_id: runId,
                name: testRun.name,
                old_stats: {
                    total_tests: testRun.total_tests,
                    passed: testRun.passed,
                    failed: testRun.failed,
                    errors: testRun.errors,
                    skipped: testRun.skipped
                },
                new_stats: stats
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
