const test = require('node:test');
const assert = require('node:assert/strict');
const { buildLegacyResult } = require('../src/services/testExecution');

test('legacy result view mirrors the authoritative execution fields', () => {
    const execution = {
        id: 'case-1',
        suite_id: 'suite-1',
        run_id: 'run-1',
        file_upload_id: 'upload-1',
        status: 'skipped',
        time: 1.25,
        error_message: 'not available',
        error_type: 'Skip',
        skipped_message: 'unsupported',
        system_out: 'out',
        system_err: 'err',
        stack_trace: 'trace',
        execution_timestamp: new Date('2026-09-24T12:00:00Z')
    };

    assert.deepEqual(buildLegacyResult(execution), {
        id: 'case-1',
        case_id: 'case-1',
        suite_id: 'suite-1',
        run_id: 'run-1',
        file_upload_id: 'upload-1',
        status: 'skipped',
        time: 1.25,
        error_message: 'not available',
        error_type: 'Skip',
        skipped_message: 'unsupported',
        system_out: 'out',
        system_err: 'err',
        stack_trace: 'trace',
        timestamp: execution.execution_timestamp
    });
});
