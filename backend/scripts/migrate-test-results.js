/**
 * Backfill execution-only fields from the legacy testresults collection.
 *
 * Dry-run by default:
 *   npm run migrate:test-results
 * Apply the backfill:
 *   npm run migrate:test-results -- --apply
 *
 * This script deliberately does not delete testresults. Remove that collection
 * only after the application has run successfully on the consolidated model and
 * the reported orphan/duplicate counts have been investigated.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const TestCase = require('../src/models/TestCase');
const TestResult = require('../src/models/TestResult');

const MONGODB_URI =
    process.env.MONGODB_URI ||
    'mongodb://junit_app:changeme@mongodb:27017/junit_test_results?authSource=junit_test_results';
const apply = process.argv.includes('--apply');
const BATCH_SIZE = 500;

const auditLegacyResults = async () => {
    const [resultCount, duplicateGroups, orphanResults, casesMissingTimestamp] = await Promise.all([
        TestResult.countDocuments({}),
        TestResult.aggregate([
            { $group: { _id: '$case_id', count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } },
            { $count: 'groups' }
        ]),
        TestResult.aggregate([
            {
                $lookup: {
                    from: 'testcases',
                    localField: 'case_id',
                    foreignField: '_id',
                    as: 'case'
                }
            },
            { $match: { case: { $size: 0 } } },
            { $count: 'count' }
        ]),
        TestCase.countDocuments({ timestamp: { $exists: false } })
    ]);

    return {
        resultCount,
        duplicateCaseGroups: duplicateGroups[0]?.groups || 0,
        orphanResults: orphanResults[0]?.count || 0,
        casesMissingTimestamp
    };
};

const backfill = async () => {
    let operations = [];
    let matched = 0;
    const cursor = TestResult.find({}).sort({ case_id: 1, timestamp: 1, _id: 1 }).lean().cursor();

    for await (const result of cursor) {
        const fields = {};
        if (result.timestamp) fields.timestamp = result.timestamp;
        if (result.skipped_message) fields.skipped_message = result.skipped_message;
        if (Object.keys(fields).length === 0) continue;

        operations.push({
            updateOne: {
                filter: { _id: result.case_id },
                update: { $set: fields }
            }
        });

        if (operations.length === BATCH_SIZE) {
            const outcome = await TestCase.bulkWrite(operations, { ordered: false });
            matched += outcome.matchedCount;
            operations = [];
        }
    }

    if (operations.length > 0) {
        const outcome = await TestCase.bulkWrite(operations, { ordered: false });
        matched += outcome.matchedCount;
    }
    return matched;
};

const main = async () => {
    try {
        // Keep the default audit mode genuinely read-only; application startup
        // is responsible for creating the new TestCase timestamp index.
        await mongoose.connect(MONGODB_URI, { autoIndex: false });
        const before = await auditLegacyResults();
        console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', before }, null, 2));

        if (!apply) {
            console.log('Dry run only. Re-run with --apply to backfill TestCase execution fields.');
            return;
        }
        if (before.duplicateCaseGroups > 0) {
            throw new Error('Duplicate TestResult rows detected; investigate before applying migration');
        }

        const matched = await backfill();
        const after = await auditLegacyResults();
        console.log(JSON.stringify({ matched, after }, null, 2));

        if (after.casesMissingTimestamp > 0 || after.orphanResults > 0) {
            process.exitCode = 2;
            console.error('Migration requires investigation; legacy testresults were retained.');
        } else {
            console.log('Backfill verified. Legacy testresults were retained for the observation period.');
        }
    } catch (error) {
        process.exitCode = 1;
        console.error(`Migration failed: ${error.message}`);
    } finally {
        await mongoose.disconnect();
    }
};

main();
