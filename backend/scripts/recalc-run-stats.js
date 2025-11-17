/**
 * Recalculate stats for a specific test run or all test runs
 */

const mongoose = require('mongoose');
const TestRun = require('../src/models/TestRun');
const TestCase = require('../src/models/TestCase');

const MONGODB_URI =
    process.env.MONGODB_URI ||
    'mongodb://junit_app:changeme@mongodb:27017/junit_test_results?authSource=junit_test_results';

const calculateStats = async runId => {
    const cases = await TestCase.find({ run_id: runId });

    return {
        total_tests: cases.length,
        passed: cases.filter(c => c.status === 'passed').length,
        failed: cases.filter(c => c.status === 'failed').length,
        errors: cases.filter(c => c.status === 'error').length,
        skipped: cases.filter(c => c.status === 'skipped').length,
        time: cases.reduce((sum, c) => sum + c.time, 0)
    };
};

async function recalcStats() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB\n');

        const runId = process.argv[2];

        if (runId) {
            // Fix specific run
            console.log(`Recalculating stats for run: ${runId}\n`);
            const testRun = await TestRun.findById(runId);

            if (!testRun) {
                console.error('Test run not found');
                process.exit(1);
            }

            console.log(`Current stats for "${testRun.name}":`);
            console.log(
                `  Total: ${testRun.total_tests}, Passed: ${testRun.passed}, Failed: ${testRun.failed}, Errors: ${testRun.errors}, Skipped: ${testRun.skipped}`
            );

            const stats = await calculateStats(testRun._id);
            console.log(`\nRecalculated stats:`);
            console.log(
                `  Total: ${stats.total_tests}, Passed: ${stats.passed}, Failed: ${stats.failed}, Errors: ${stats.errors}, Skipped: ${stats.skipped}`
            );

            await TestRun.findByIdAndUpdate(testRun._id, stats);
            console.log('\n✅ Stats updated successfully!');
        } else {
            // Fix all runs
            console.log('Recalculating stats for ALL test runs\n');
            const testRuns = await TestRun.find({}).sort({ timestamp: -1 });
            console.log(`Found ${testRuns.length} test runs\n`);

            for (const testRun of testRuns) {
                const stats = await calculateStats(testRun._id);

                // Check if stats need updating
                if (
                    stats.total_tests !== testRun.total_tests ||
                    stats.passed !== testRun.passed ||
                    stats.failed !== testRun.failed
                ) {
                    await TestRun.findByIdAndUpdate(testRun._id, stats);
                    console.log(
                        `✓ Updated ${testRun.name}: ${testRun.total_tests} -> ${stats.total_tests} tests`
                    );
                }
            }

            console.log('\n✅ All runs updated!');
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

recalcStats();
