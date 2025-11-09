const xml2js = require('xml2js');
const TestRun = require('../models/TestRun');
const TestSuite = require('../models/TestSuite');
const TestCase = require('../models/TestCase');
const TestResult = require('../models/TestResult');
const FileUpload = require('../models/FileUpload');
const { generateHash } = require('./hashGenerator');
const logger = require('../utils/logger');

const parseJUnitXML = async (xmlContent, filename, ciMetadata = null, uploaderInfo = {}) => {
    try {
        const parser = new xml2js.Parser({
            explicitArray: false,
            mergeAttrs: true,
            trim: true
        });

        const result = await parser.parseStringPromise(xmlContent);

        // Generate content hash for duplicate detection
        const contentHash = generateHash(xmlContent);

        // Check for duplicate
        const existingUpload = await FileUpload.findOne({ content_hash: contentHash, status: 'completed' });
        if (existingUpload) {
            logger.warn('Duplicate test results detected', { filename, contentHash });
            return {
                success: false,
                error: 'Duplicate test results',
                run_id: existingUpload.run_id
            };
        }

        // Create file upload record
        const fileUpload = await FileUpload.create({
            filename,
            file_size: xmlContent.length,
            content_hash: contentHash,
            status: 'processing',
            uploader: uploaderInfo
        });

        // Parse test data
        let testsuites = result.testsuites || result.testsuite;
        if (!testsuites) {
            throw new Error('Invalid JUnit XML format');
        }

        // Handle both <testsuites> and <testsuite> root elements
        if (!Array.isArray(testsuites)) {
            testsuites = [testsuites];
        }

        let testRun;

        for (const suiteElement of testsuites) {
            if (!testRun) {
                // Create test run
                testRun = await TestRun.create({
                    name: suiteElement.name || filename,
                    timestamp: suiteElement.timestamp || new Date(),
                    time: parseFloat(suiteElement.time || 0),
                    total_tests: parseInt(suiteElement.tests || 0),
                    total_failures: parseInt(suiteElement.failures || 0),
                    total_errors: parseInt(suiteElement.errors || 0),
                    total_skipped: parseInt(suiteElement.skipped || 0),
                    file_upload_id: fileUpload._id,
                    content_hash: contentHash,
                    source: ciMetadata ? 'ci_cd' : 'api',
                    ci_metadata: ciMetadata
                });

                logger.info('Test run created', { run_id: testRun._id, name: testRun.name });
            }

            // Process test suites
            let suites = suiteElement.testsuite || [suiteElement];
            if (!Array.isArray(suites)) {
                suites = [suites];
            }

            for (const suite of suites) {
                await processTestSuite(suite, testRun._id, fileUpload._id);
            }
        }

        // Update test run name based on test case classnames if name is generic
        if (testRun.name === 'pytest tests' || testRun.name === 'pytest' || !testRun.name || testRun.name === filename) {
            const testCases = await TestCase.find({ run_id: testRun._id }).limit(100);
            const classnames = [...new Set(testCases.map(tc => tc.classname).filter(c => c))];

            if (classnames.length > 0) {
                // Use the most common classname or combine first few unique ones
                const newName = classnames.length === 1
                    ? classnames[0]
                    : classnames.slice(0, 3).join(', ') + (classnames.length > 3 ? '...' : '');

                await TestRun.findByIdAndUpdate(testRun._id, { name: newName });
                testRun.name = newName;
                logger.info('Updated test run name', { run_id: testRun._id, name: newName });
            }
        }

        // Update file upload status
        await FileUpload.findByIdAndUpdate(fileUpload._id, {
            status: 'completed',
            run_id: testRun._id
        });

        // Calculate statistics from actual test cases and update the test run
        const stats = await calculateStats(testRun._id);
        await TestRun.findByIdAndUpdate(testRun._id, {
            total_tests: stats.total_tests,
            total_failures: stats.failed,
            total_errors: stats.errors,
            total_skipped: stats.skipped,
            time: stats.total_time
        });

        logger.info('JUnit XML parsed successfully', { run_id: testRun._id, stats });

        return {
            success: true,
            run_id: testRun._id,
            file_upload_id: fileUpload._id,
            stats
        };

    } catch (error) {
        logger.error('Error parsing JUnit XML', { error: error.message });
        throw error;
    }
};

const processTestSuite = async (suiteData, runId, fileUploadId) => {
    const testSuite = await TestSuite.create({
        run_id: runId,
        name: suiteData.name || 'Unnamed Suite',
        classname: suiteData.classname || '',
        timestamp: suiteData.timestamp || new Date(),
        time: parseFloat(suiteData.time || 0),
        tests: parseInt(suiteData.tests || 0),
        failures: parseInt(suiteData.failures || 0),
        errors: parseInt(suiteData.errors || 0),
        skipped: parseInt(suiteData.skipped || 0),
        hostname: suiteData.hostname || '',
        file_upload_id: fileUploadId
    });

    // Process test cases
    let testcases = suiteData.testcase;
    if (testcases) {
        if (!Array.isArray(testcases)) {
            testcases = [testcases];
        }

        for (const testcase of testcases) {
            await processTestCase(testcase, testSuite._id, runId, fileUploadId);
        }
    }
};

const processTestCase = async (caseData, suiteId, runId, fileUploadId) => {
    let status = 'passed';
    let failureMessage = null;
    let failureType = null;
    let errorMessage = null;
    let errorType = null;
    let skippedMessage = null;
    let stackTrace = null;

    // Determine status
    if (caseData.failure) {
        status = 'failed';
        const failure = caseData.failure;
        failureMessage = failure.message || failure._ || '';
        failureType = failure.type || '';
        stackTrace = failure._ || failure.message || '';
    } else if (caseData.error) {
        status = 'error';
        const error = caseData.error;
        errorMessage = error.message || error._ || '';
        errorType = error.type || '';
        stackTrace = error._ || error.message || '';
    } else if (caseData.skipped !== undefined) {
        status = 'skipped';
        skippedMessage = typeof caseData.skipped === 'string' ? caseData.skipped :
                         (caseData.skipped.message || '');
    }

    // Create test case
    const testCase = await TestCase.create({
        suite_id: suiteId,
        run_id: runId,
        name: caseData.name || 'Unnamed Test',
        classname: caseData.classname || '',
        time: parseFloat(caseData.time || 0),
        status,
        assertions: parseInt(caseData.assertions || 0),
        file: caseData.file || '',
        line: parseInt(caseData.line || 0),
        system_out: caseData['system-out'] || '',
        system_err: caseData['system-err'] || '',
        file_upload_id: fileUploadId
    });

    // Create test result
    await TestResult.create({
        case_id: testCase._id,
        suite_id: suiteId,
        run_id: runId,
        status,
        time: testCase.time,
        failure_message: failureMessage,
        failure_type: failureType,
        error_message: errorMessage,
        error_type: errorType,
        skipped_message: skippedMessage,
        system_out: testCase.system_out,
        system_err: testCase.system_err,
        stack_trace: stackTrace,
        timestamp: new Date()
    });
};

const calculateStats = async (runId) => {
    const cases = await TestCase.find({ run_id: runId });

    return {
        total_tests: cases.length,
        passed: cases.filter(c => c.status === 'passed').length,
        failed: cases.filter(c => c.status === 'failed').length,
        errors: cases.filter(c => c.status === 'error').length,
        skipped: cases.filter(c => c.status === 'skipped').length,
        total_time: cases.reduce((sum, c) => sum + c.time, 0)
    };
};

module.exports = { parseJUnitXML };
