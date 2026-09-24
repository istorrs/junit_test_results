/**
 * Link existing executions to stable definitions. Dry-run by default.
 *   npm run migrate:test-definitions
 *   npm run migrate:test-definitions -- --apply
 * Safe to rerun; it never deletes cases or definitions.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const TestCase = require('../src/models/TestCase');
const TestDefinition = require('../src/models/TestDefinition');
const TestRun = require('../src/models/TestRun');
const { linkRunCases } = require('../src/services/testDefinition');

const uri = process.env.MONGODB_URI ||
    'mongodb://junit_app:changeme@mongodb:27017/junit_test_results?authSource=junit_test_results';
const apply = process.argv.includes('--apply');

const main = async () => {
    await mongoose.connect(uri, { autoIndex: false });
    try {
        const before = {
            cases: await TestCase.countDocuments({}),
            unlinked: await TestCase.countDocuments({ definition_id: { $exists: false } }),
            definitions: await TestDefinition.countDocuments({}),
            orphanRuns: (await TestCase.aggregate([
                { $lookup: { from: 'testruns', localField: 'run_id', foreignField: '_id', as: 'run' } },
                { $match: { run: { $size: 0 } } },
                { $count: 'count' }
            ]))[0]?.count || 0
        };
        console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', before }));
        if (!apply) return;
        if (before.orphanRuns) throw new Error('Orphaned runs detected; resolve before backfill');

        await TestDefinition.createIndexes();
        await TestCase.createIndexes();
        let linked = 0;
        const cursor = TestRun.find({}).lean().cursor();
        for await (const run of cursor) linked += await linkRunCases(run);

        const after = {
            cases: await TestCase.countDocuments({}),
            unlinked: await TestCase.countDocuments({ definition_id: { $exists: false } }),
            definitions: await TestDefinition.countDocuments({})
        };
        console.log(JSON.stringify({ linked, after }));
        if (after.unlinked || after.cases !== before.cases) {
            throw new Error('Backfill validation failed: cases missing definitions or case count changed');
        }
    } finally {
        await mongoose.disconnect();
    }
};

main().catch(error => { console.error(error); process.exitCode = 1; });
