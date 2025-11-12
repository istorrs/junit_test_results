/**
 * Migration script to fix test run counts
 * Updates all TestRun documents that have tests=0 by calculating stats from their test cases
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
        tests: cases.length,
        passed: cases.filter(c => c.status === 'passed').length,
        failures: cases.filter(c => c.status === 'failed').length,
        errors: cases.filter(c => c.status === 'error').length,
        skipped: cases.filter(c => c.status === 'skipped').length,
        time: cases.reduce((sum, c) => sum + c.time, 0)
    };
};

async function fixTestRunCounts() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB\n');

        // Find all test runs with tests = 0 or null (missing/undefined)
        const testRuns = await TestRun.find({
            $or: [{ tests: 0 }, { tests: null }, { tests: { $exists: false } }]
        });
        console.log(`Found ${testRuns.length} test runs with tests=0 or null\n`);

        let fixed = 0;
        let skipped = 0;

        for (const testRun of testRuns) {
            const stats = await calculateStats(testRun._id);

            // Only update if there are actually test cases
            if (stats.tests > 0) {
                await TestRun.findByIdAndUpdate(testRun._id, {
                    tests: stats.tests,
                    failures: stats.failures,
                    errors: stats.errors,
                    skipped: stats.skipped,
                    time: stats.time
                });

                console.log(
                    `✓ Fixed ${testRun.name}: ${stats.tests} tests, ${stats.failures} failures`
                );
                fixed++;
            } else {
                console.log(`⊘ Skipped ${testRun.name}: No test cases found`);
                skipped++;
            }
        }

        console.log(`\n✅ Migration complete!`);
        console.log(`   Fixed: ${fixed}`);
        console.log(`   Skipped: ${skipped}`);

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixTestRunCounts();
