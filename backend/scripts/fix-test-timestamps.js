#!/usr/bin/env node
/**
 * Script to fix test result timestamps in existing data
 *
 * This script recalculates test start times based on:
 * 1. Test suite timestamp (from XML or test run)
 * 2. Accumulated test durations within each suite
 *
 * Run with: node backend/scripts/fix-test-timestamps.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

const TestSuite = require('../src/models/TestSuite');
const TestCase = require('../src/models/TestCase');
const TestResult = require('../src/models/TestResult');
const TestRun = require('../src/models/TestRun');

async function fixTestTimestamps() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/junit_dashboard';
        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Get all test suites
        const suites = await TestSuite.find().sort({ timestamp: 1 });
        console.log(`Found ${suites.length} test suites to process`);

        let totalUpdated = 0;

        for (const suite of suites) {
            console.log(`\nProcessing suite: ${suite.name} (${suite._id})`);

            // Get test cases for this suite, sorted by their order in the file
            // We need to maintain the order they appear in the XML
            const testCases = await TestCase.find({ suite_id: suite._id }).sort({ created_at: 1 });

            if (testCases.length === 0) {
                console.log('  No test cases found for this suite');
                continue;
            }

            console.log(`  Found ${testCases.length} test cases`);

            // Calculate start time for each test by accumulating durations
            let accumulatedTime = 0; // in seconds
            const suiteTimestamp = suite.timestamp;

            for (const testCase of testCases) {
                // Calculate this test's start time
                const testStartTime = new Date(suiteTimestamp.getTime() + (accumulatedTime * 1000));

                // Update the test result with the calculated timestamp
                const result = await TestResult.findOneAndUpdate(
                    { case_id: testCase._id },
                    { timestamp: testStartTime },
                    { new: false } // Return old document to see if it changed
                );

                if (result) {
                    const oldTimestamp = result.timestamp;
                    if (oldTimestamp.getTime() !== testStartTime.getTime()) {
                        console.log(`    Updated: ${testCase.name}`);
                        console.log(`      Old: ${oldTimestamp.toISOString()}`);
                        console.log(`      New: ${testStartTime.toISOString()}`);
                        totalUpdated++;
                    }
                } else {
                    console.log(`    WARNING: No result found for test case ${testCase.name}`);
                }

                // Add this test's duration to accumulated time for next test
                accumulatedTime += parseFloat(testCase.time || 0);
            }
        }

        console.log(`\n✅ Migration complete!`);
        console.log(`   Total test results updated: ${totalUpdated}`);
        console.log(`   Total suites processed: ${suites.length}`);

    } catch (error) {
        console.error('Error during migration:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the migration
fixTestTimestamps()
    .then(() => {
        console.log('\n🎉 Timestamp fix completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
