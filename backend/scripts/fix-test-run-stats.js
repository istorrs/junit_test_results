const mongoose = require('mongoose');
const TestRun = require('../src/models/TestRun');
const TestCase = require('../src/models/TestCase');

const runId = process.argv[2] || '691a54f3593b05d88e0310d6';

async function fixStats() {
    try {
        await mongoose.connect('mongodb://localhost:27017/junit_test_results');

        console.log('Recalculating stats for run:', runId);

        const cases = await TestCase.find({ run_id: new mongoose.Types.ObjectId(runId) });
        const passed = cases.filter(c => c.status === 'passed').length;
        const failed = cases.filter(c => c.status === 'failed').length;
        const errors = cases.filter(c => c.status === 'error').length;
        const skipped = cases.filter(c => c.status === 'skipped').length;
        const time = cases.reduce((sum, c) => sum + c.time, 0);

        console.log('Found test cases:', cases.length);
        console.log('Breakdown:', { passed, failed, errors, skipped, time: time.toFixed(2) });

        const result = await TestRun.findByIdAndUpdate(
            runId,
            {
                total_tests: cases.length,
                passed,
                failed,
                errors,
                skipped,
                time
            },
            { new: true }
        );

        console.log('Updated test run stats:', {
            name: result.name,
            total_tests: result.total_tests,
            passed: result.passed,
            failed: result.failed,
            errors: result.errors,
            skipped: result.skipped
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

fixStats();
