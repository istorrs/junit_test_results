const buildLegacyResult = testCase => ({
    id: testCase.id,
    case_id: testCase.id,
    suite_id: testCase.suite_id,
    run_id: testCase.run_id,
    file_upload_id: testCase.file_upload_id,
    status: testCase.status,
    time: testCase.time,
    error_message: testCase.error_message,
    error_type: testCase.error_type,
    skipped_message: testCase.skipped_message,
    system_out: testCase.system_out,
    system_err: testCase.system_err,
    stack_trace: testCase.stack_trace,
    timestamp: testCase.execution_timestamp
});

module.exports = { buildLegacyResult };
