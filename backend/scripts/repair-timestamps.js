#!/usr/bin/env node
/**
 * Repair Script: Fix Test Run Timestamps
 *
 * This script repairs test runs that were imported with incorrect timestamps
 * (showing upload time instead of actual test execution time).
 *
 * It updates:
 * - Test runs with ci_metadata.build_time to use that timestamp
 * - Related test suites to use the corrected test run timestamp
 *
 * Usage:
 *   node backend/scripts/repair-timestamps.js [--dry-run]
 */

const mongoose = require('mongoose');
const TestRun = require('../src/models/TestRun');
const TestSuite = require('../src/models/TestSuite');

// Load environment variables
require('dotenv').config();

const DRY_RUN = process.argv.includes('--dry-run');

async function repairTimestamps() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/junit_results';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        if (DRY_RUN) {
            console.log('\n=== DRY RUN MODE - No changes will be saved ===\n');
        }

        // Find all test runs with ci_metadata.build_time
        const testRuns = await TestRun.find({
            'ci_metadata.build_time': { $exists: true }
        }).lean();

        console.log(`Found ${testRuns.length} test runs with ci_metadata.build_time`);

        let updatedCount = 0;
        let skippedCount = 0;
        let suitesUpdatedCount = 0;

        for (const run of testRuns) {
            const buildTime = new Date(run.ci_metadata.build_time);
            const currentTimestamp = new Date(run.timestamp);

            // Check if timestamps are different (more than 1 minute apart)
            const timeDiff = Math.abs(buildTime - currentTimestamp);
            if (timeDiff > 60000) {
                // Timestamps differ significantly
                console.log(`\nTest Run: ${run._id}`);
                console.log(`  Name: ${run.name}`);
                console.log(`  Current timestamp: ${currentTimestamp.toISOString()}`);
                console.log(`  Build time: ${buildTime.toISOString()}`);
                console.log(`  Difference: ${(timeDiff / 1000 / 60).toFixed(2)} minutes`);

                if (!DRY_RUN) {
                    // Update test run timestamp
                    await TestRun.findByIdAndUpdate(run._id, {
                        timestamp: buildTime
                    });

                    // Update related test suites that don't have their own timestamp
                    const suitesResult = await TestSuite.updateMany(
                        {
                            run_id: run._id,
                            $or: [
                                { timestamp: currentTimestamp },
                                {
                                    timestamp: {
                                        $gte: currentTimestamp,
                                        $lte: new Date(currentTimestamp.getTime() + 60000)
                                    }
                                }
                            ]
                        },
                        {
                            timestamp: buildTime
                        }
                    );

                    suitesUpdatedCount += suitesResult.modifiedCount;
                    console.log(
                        `  ✓ Updated test run and ${suitesResult.modifiedCount} test suites`
                    );
                } else {
                    console.log(`  [DRY RUN] Would update this test run`);
                }

                updatedCount++;
            } else {
                skippedCount++;
            }
        }

        console.log('\n=== Summary ===');
        console.log(`Total test runs found: ${testRuns.length}`);
        console.log(`Test runs updated: ${updatedCount}`);
        console.log(`Test runs skipped (already correct): ${skippedCount}`);
        console.log(`Test suites updated: ${suitesUpdatedCount}`);

        if (DRY_RUN) {
            console.log('\nThis was a dry run. Run without --dry-run to apply changes.');
        } else {
            console.log('\n✓ Timestamp repair completed successfully!');
        }
    } catch (error) {
        console.error('Error repairing timestamps:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

// Run the repair script
repairTimestamps();
