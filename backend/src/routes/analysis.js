const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const TestCase = require('../models/TestCase');
const StackTraceAnalyzer = require('../utils/stack-trace-analyzer');

// GET /api/v1/analysis/failure-patterns/:runId - Analyze failure patterns for a test run
router.get('/failure-patterns/:runId', async (req, res, next) => {
    try {
        const { runId } = req.params;

        // Get all test cases for this run
        const testCases = await TestCase.find({ run_id: new mongoose.Types.ObjectId(runId) }).lean();

        if (!testCases || testCases.length === 0) {
            return res.json({
                success: true,
                data: {
                    totalFailures: 0,
                    patterns: [],
                    categoryCounts: {}
                }
            });
        }

        // Analyze failures
        const analysis = StackTraceAnalyzer.analyzeFailures(testCases);

        res.json({
            success: true,
            data: analysis
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
