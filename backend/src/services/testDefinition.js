const crypto = require('node:crypto');
const TestDefinition = require('../models/TestDefinition');
const TestCase = require('../models/TestCase');
const TestRun = require('../models/TestRun');

const normalize = value => String(value || '').trim();

const describeIdentity = (run, testCase) => {
    const project = normalize(run?.ci_metadata?.job_name) || 'unassigned';
    const repository = normalize(run?.ci_metadata?.repository);
    const resultFormat = testCase.result_format || 'junit';
    const parameters = (testCase.parameters || [])
        .filter(parameter => !parameter.excluded)
        .map(parameter => [normalize(parameter.name), String(parameter.value ?? '')])
        .sort((a, b) => a[0].localeCompare(b[0]));
    let identityKind;
    let identityValue;

    if (resultFormat === 'allure' && normalize(testCase.history_id)) {
        identityKind = 'history_id';
        identityValue = normalize(testCase.history_id);
    } else if (resultFormat === 'allure' && normalize(testCase.test_case_id)) {
        identityKind = 'test_case_id';
        // testCaseId identifies the test source; parameters identify executions.
        identityValue = JSON.stringify([normalize(testCase.test_case_id), parameters]);
    } else if (resultFormat === 'allure') {
        identityKind = 'full_name';
        identityValue = JSON.stringify([
            normalize(testCase.full_name) || JSON.stringify([
                normalize(testCase.class_name), normalize(testCase.name)
            ]), parameters
        ]);
    } else {
        identityKind = 'junit_name';
        identityValue = JSON.stringify([normalize(testCase.class_name), normalize(testCase.name)]);
    }

    const identityKey = crypto.createHash('sha256')
        .update(JSON.stringify([project, repository, resultFormat, identityKind, identityValue]))
        .digest('hex');
    return { project, repository, result_format: resultFormat, identity_kind: identityKind,
        identity_value: identityValue, identity_key: identityKey,
        name: normalize(testCase.name), class_name: normalize(testCase.class_name),
        full_name: normalize(testCase.full_name) };
};

const resolveTestDefinition = async (run, testCase) => {
    const identity = describeIdentity(run, testCase);
    const definition = await TestDefinition.findOneAndUpdate(
        { identity_key: identity.identity_key },
        { $setOnInsert: identity },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return definition._id;
};

// Used by the migration and project reassignment. Idempotent, and never deletes definitions.
const linkRunCases = async run => {
    let linked = 0;
    const operations = [];
    const cursor = TestCase.find({ run_id: run._id }).lean().cursor();
    for await (const testCase of cursor) {
        const definitionId = await resolveTestDefinition(run, testCase);
        if (String(testCase.definition_id || '') === String(definitionId)) continue;
        operations.push({ updateOne: { filter: { _id: testCase._id },
            update: { $set: { definition_id: definitionId } } } });
        if (operations.length >= 500) {
            await TestCase.bulkWrite(operations, { ordered: false });
            linked += operations.length;
            operations.length = 0;
        }
    }
    if (operations.length) {
        await TestCase.bulkWrite(operations, { ordered: false });
        linked += operations.length;
    }
    return linked;
};

const linkRuns = async runIds => {
    let linked = 0;
    for (const runId of runIds) {
        const run = await TestRun.findById(runId).lean();
        if (run) linked += await linkRunCases(run);
    }
    return linked;
};

module.exports = { describeIdentity, resolveTestDefinition, linkRunCases, linkRuns };
