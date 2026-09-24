const test = require('node:test');
const assert = require('node:assert/strict');
const { rollbackUpload } = require('../src/services/uploadRollback');

const createDependencies = events => ({
    TestCaseModel: {
        distinct: async () => ['case-1'],
        deleteMany: async query => events.push(['delete-cases', query])
    },
    TestResultModel: {
        deleteMany: async query => events.push(['delete-results', query])
    },
    AllureAttachmentModel: {
        deleteMany: async query => events.push(['delete-attachments', query])
    },
    TestSuiteModel: {
        deleteMany: async query => events.push(['delete-suites', query])
    },
    TestRunModel: {
        deleteOne: async query => events.push(['delete-run', query]),
        findByIdAndUpdate: async (id, stats) => events.push(['update-run', id, stats])
    },
    FileUploadModel: {
        findByIdAndUpdate: async (id, update) => events.push(['fail-upload', id, update])
    },
    calculateStats: async () => ({ total_tests: 4 })
});

test('rollbackUpload deletes only upload-owned records and removes a newly created run', async () => {
    const events = [];
    await rollbackUpload(
        {
            fileUploadId: 'upload-1',
            runId: 'run-1',
            createdRun: true,
            errorMessage: 'parse failed'
        },
        createDependencies(events)
    );

    assert.deepEqual(events.map(event => event[0]), [
        'delete-results',
        'delete-attachments',
        'delete-cases',
        'delete-suites',
        'delete-run',
        'fail-upload'
    ]);
    assert.deepEqual(events[0][1].$or[1], { case_id: { $in: ['case-1'] } });
    assert.deepEqual(events[1][1], { file_upload_id: 'upload-1' });
    assert.equal(events[5][3], undefined);
    assert.equal(events[5][2].$set.status, 'failed');
    assert.equal(events[5][2].$unset.content_hash, '');
});

test('rollbackUpload recalculates a pre-existing merged run', async () => {
    const events = [];
    await rollbackUpload(
        {
            fileUploadId: 'upload-2',
            runId: 'run-2',
            createdRun: false,
            errorMessage: 'write failed'
        },
        createDependencies(events)
    );

    assert.equal(events.some(event => event[0] === 'delete-run'), false);
    assert.deepEqual(events.find(event => event[0] === 'update-run'), [
        'update-run',
        'run-2',
        { total_tests: 4 }
    ]);
});
