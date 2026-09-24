const TestRun = require('../models/TestRun');
const TestSuite = require('../models/TestSuite');
const TestCase = require('../models/TestCase');
const TestResult = require('../models/TestResult');
const FileUpload = require('../models/FileUpload');
const AllureAttachment = require('../models/AllureAttachment');
const { calculateRunStats } = require('./runStats');

const rollbackUpload = async (
    { fileUploadId, runId, createdRun, errorMessage },
    {
        TestRunModel = TestRun,
        TestSuiteModel = TestSuite,
        TestCaseModel = TestCase,
        TestResultModel = TestResult,
        FileUploadModel = FileUpload,
        AllureAttachmentModel = AllureAttachment,
        calculateStats = calculateRunStats
    } = {}
) => {
    const caseIds = await TestCaseModel.distinct('_id', { file_upload_id: fileUploadId });

    await TestResultModel.deleteMany({
        $or: [{ file_upload_id: fileUploadId }, { case_id: { $in: caseIds } }]
    });
    await AllureAttachmentModel.deleteMany({ file_upload_id: fileUploadId });
    await TestCaseModel.deleteMany({ file_upload_id: fileUploadId });
    await TestSuiteModel.deleteMany({ file_upload_id: fileUploadId });

    if (runId) {
        if (createdRun) {
            await TestRunModel.deleteOne({ _id: runId });
        } else {
            const stats = await calculateStats(runId);
            await TestRunModel.findByIdAndUpdate(runId, stats);
        }
    }

    await FileUploadModel.findByIdAndUpdate(fileUploadId, {
        $set: {
            status: 'failed',
            error_message: errorMessage
        },
        $unset: {
            content_hash: '',
            run_id: ''
        }
    });
};

module.exports = { rollbackUpload };
