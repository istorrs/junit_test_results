const xml2js = require('xml2js');
const TestRun = require('../models/TestRun');
const TestSuite = require('../models/TestSuite');
const TestCase = require('../models/TestCase');
const TestResult = require('../models/TestResult');
const FileUpload = require('../models/FileUpload');
const { generateHash } = require('./hashGenerator');
const logger = require('../utils/logger');

/**
 * Extract properties from JUnit XML element
 * Properties are stored as key-value pairs in <properties><property name="key" value="val"/></properties>
 */
const extractProperties = element => {
    const properties = {};

    if (!element.properties) {
        return properties;
    }

    // Handle properties array structure
    const propertiesArray = Array.isArray(element.properties)
        ? element.properties[0]
        : element.properties;

    if (!propertiesArray || !propertiesArray.property) {
        return properties;
    }

    // Normalize to array
    const propertyList = Array.isArray(propertiesArray.property)
        ? propertiesArray.property
        : [propertiesArray.property];

    // Extract key-value pairs
    propertyList.forEach(prop => {
        if (prop.name) {
            properties[prop.name] = prop.value || '';
        }
    });

    logger.debug('Extracted properties', {
        count: Object.keys(properties).length,
        keys: Object.keys(properties)
    });

    return properties;
};

const parseJUnitXML = async (
    xmlContent,
    filename,
    ciMetadata = null,
    uploaderInfo = {},
    releaseMetadata = {}
) => {
    try {
        const parser = new xml2js.Parser({
            explicitArray: false,
            mergeAttrs: true,
            trim: true
        });

        const result = await parser.parseStringPromise(xmlContent);

        // Generate content hash for duplicate detection
        const contentHash = generateHash(xmlContent);

        // Check for duplicate file - if this exact XML was already uploaded, skip it
        const existingUpload = await FileUpload.findOne({
            content_hash: contentHash,
            status: 'completed'
        });
        if (existingUpload) {
            logger.warn('Duplicate XML file detected - skipping upload', {
                filename,
                contentHash,
                existing_file_id: existingUpload._id,
                existing_run_id: existingUpload.run_id
            });
            return {
                success: true,
                duplicate: true,
                run_id: existingUpload.run_id,
                file_upload_id: existingUpload._id,
                message: 'Duplicate file skipped'
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

        // Extract properties from first testsuite element (typically contains test run level properties)
        const suiteElement = testsuites[0];
        const runProperties = extractProperties(suiteElement.testsuite || suiteElement);

        let testRun;

        // Determine the correct timestamp
        // Priority: CI metadata build_time > XML timestamp > current time
        let timestamp;

        if (ciMetadata && ciMetadata.build_time) {
            // Use build time from CI metadata (most accurate for test run identification)
            timestamp = new Date(ciMetadata.build_time);
            const _timestampSource = 'ci_metadata.build_time';
            logger.info('Using CI metadata timestamp', {
                build_time: ciMetadata.build_time,
                parsed_timestamp: timestamp.toISOString(),
                source: _timestampSource
            });
        } else {
            // Check for timestamp in XML
            const suiteElement = testsuites[0];
            let timestampValue = null;
            if (suiteElement.testsuite && suiteElement.testsuite.timestamp) {
                timestampValue = suiteElement.testsuite.timestamp;
            } else if (suiteElement.timestamp) {
                timestampValue = suiteElement.timestamp;
            }

            if (timestampValue) {
                timestamp = new Date(timestampValue);
                const _timestampSource = 'junit_xml';
                logger.info('Using JUnit XML timestamp', {
                    xml_timestamp: timestampValue,
                    parsed_timestamp: timestamp.toISOString(),
                    source: _timestampSource
                });
            } else {
                // Last resort: use current time
                timestamp = new Date();
                const _timestampSource = 'current_time';
                logger.warn('No timestamp found - using current time', {
                    timestamp: timestamp.toISOString(),
                    filename,
                    source: _timestampSource
                });
            }
        }

        // Find or create test run based on CI metadata
        if (ciMetadata && ciMetadata.job_name && ciMetadata.build_number) {
            // Look for existing test run with same job_name, build_number, and build_time
            testRun = await TestRun.findOne({
                'ci_metadata.job_name': ciMetadata.job_name,
                'ci_metadata.build_number': ciMetadata.build_number,
                'ci_metadata.build_time': ciMetadata.build_time
            });

            if (testRun) {
                logger.info('Found existing test run - adding XML to it', {
                    run_id: testRun._id,
                    job_name: ciMetadata.job_name,
                    build_number: ciMetadata.build_number,
                    existing_files: testRun.file_upload_id
                });
            } else {
                // Create new test run with proper naming: "JOB_NAME #BUILD_NUMBER"
                const testRunName = `${ciMetadata.job_name} #${ciMetadata.build_number}`;

                testRun = await TestRun.create({
                    name: testRunName,
                    timestamp,
                    time: 0, // Will be calculated from test cases
                    total_tests: 0, // Will be calculated from test cases
                    passed: 0,
                    failed: 0,
                    errors: 0,
                    skipped: 0,
                    file_upload_id: fileUpload._id,
                    source: 'ci_cd',
                    ci_metadata: ciMetadata,
                    release_tag: releaseMetadata.release_tag || null,
                    release_version: releaseMetadata.release_version || null,
                    properties: runProperties
                });

                logger.info('Created new test run from CI metadata', {
                    run_id: testRun._id,
                    name: testRunName,
                    job_name: ciMetadata.job_name,
                    build_number: ciMetadata.build_number
                });
            }
        } else {
            // No CI metadata - create test run with filename
            const suiteElement = testsuites[0];
            testRun = await TestRun.create({
                name: suiteElement.name || filename,
                timestamp,
                time: 0, // Will be calculated from test cases
                total_tests: 0,
                passed: 0,
                failed: 0,
                errors: 0,
                skipped: 0,
                file_upload_id: fileUpload._id,
                content_hash: contentHash,
                source: 'api',
                ci_metadata: null,
                release_tag: releaseMetadata.release_tag || null,
                release_version: releaseMetadata.release_version || null,
                properties: runProperties
            });

            logger.info('Created test run without CI metadata', {
                run_id: testRun._id,
                name: testRun.name,
                filename
            });
        }

        // Process all test suites from this XML
        for (const suiteElement of testsuites) {
            // Process test suites
            let suites = suiteElement.testsuite || [suiteElement];
            if (!Array.isArray(suites)) {
                suites = [suites];
            }

            for (const suite of suites) {
                await processTestSuite(suite, testRun._id, fileUpload._id, testRun.timestamp);
            }
        }

        // Update file upload status
        await FileUpload.findByIdAndUpdate(fileUpload._id, {
            status: 'completed',
            run_id: testRun._id
        });

        // Calculate statistics from actual test cases and update the test run
        const stats = await calculateStats(testRun._id);
        await TestRun.findByIdAndUpdate(testRun._id, stats);

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

const processTestSuite = async (suiteData, runId, fileUploadId, testRunTimestamp) => {
    // Determine suite timestamp: use suite's own timestamp if available, otherwise use test run timestamp
    const suiteTimestamp = suiteData.timestamp ? new Date(suiteData.timestamp) : testRunTimestamp;

    // Extract properties from suite element
    const suiteProperties = extractProperties(suiteData);

    logger.info('Processing test suite', {
        suite_name: suiteData.name,
        properties_count: Object.keys(suiteProperties).length,
        properties_keys: Object.keys(suiteProperties).slice(0, 5) // First 5 keys for logging
    });

    const testSuite = await TestSuite.create({
        run_id: runId,
        name: suiteData.name || 'Unnamed Suite',
        package_name: suiteData.classname || suiteData.package || '',
        timestamp: suiteTimestamp,
        time: parseFloat(suiteData.time || 0),
        total_tests: parseInt(suiteData.tests || 0),
        passed: 0, // Will be calculated from test cases
        failed: parseInt(suiteData.failures || 0),
        errors: parseInt(suiteData.errors || 0),
        skipped: parseInt(suiteData.skipped || 0),
        hostname: suiteData.hostname || '',
        file_upload_id: fileUploadId,
        properties: suiteProperties
    });

    // Process test cases
    let testcases = suiteData.testcase;
    if (testcases) {
        if (!Array.isArray(testcases)) {
            testcases = [testcases];
        }

        // Calculate start time for each test by accumulating durations
        let accumulatedTime = 0; // in seconds

        for (const testcase of testcases) {
            // Calculate this test's start time by adding accumulated duration to suite timestamp
            const testStartTime = new Date(suiteTimestamp.getTime() + accumulatedTime * 1000);

            await processTestCase(testcase, testSuite._id, runId, fileUploadId, testStartTime);

            // Add this test's duration to accumulated time for next test
            accumulatedTime += parseFloat(testcase.time || 0);
        }
    }

    // Update suite name if it's generic (e.g., "pytest") - use class_name from test cases instead
    if (
        testSuite.name === 'pytest' ||
        testSuite.name === 'pytest tests' ||
        testSuite.name === 'Unnamed Suite' ||
        !testSuite.name
    ) {
        const testCases = await TestCase.find({ suite_id: testSuite._id });
        const classNames = [...new Set(testCases.map(tc => tc.class_name).filter(c => c))];

        if (classNames.length > 0) {
            // Use the most common class_name or the first one if all test cases are from same class
            const newName = classNames.length === 1 ? classNames[0] : classNames[0]; // Use first class_name for consistency

            await TestSuite.findByIdAndUpdate(testSuite._id, { name: newName });
            logger.info('Updated test suite name from generic to class_name', {
                suite_id: testSuite._id,
                old_name: testSuite.name,
                new_name: newName
            });
        }
    }
};

const processTestCase = async (caseData, suiteId, runId, fileUploadId, testStartTime) => {
    let status = 'passed';
    let errorMessage = null;
    let errorType = null;
    let skippedMessage = null;
    let stackTrace = null;

    // Helper function to extract error message from stack trace
    const extractErrorMessage = (trace, existingMessage) => {
        if (existingMessage) {
            return existingMessage;
        }
        if (!trace) {
            return null;
        }

        // For Python/pytest stack traces, find the FIRST exception (root cause)
        // Python stack traces show exceptions in order, first one is the root cause
        // Format:
        //   libraries/mqtt_explore.py:859: MQTTClientMessageTimeoutException
        //   E       libraries.mqtt_explore.MQTTClientMessageTimeoutException
        //
        // Or for assertions:
        //   E       AssertionError: expected value
        //
        // Look for lines starting with "E       " which pytest uses to mark exception lines
        const lines = trace.split('\n');

        // First pass: find the first "E       " line with an exception
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Pytest marks exception lines with "E       " or "E   "
            if (line.match(/^E\s{3,}/)) {
                const exceptionLine = line.replace(/^E\s+/, '').trim();
                // This is an exception line - extract it
                if (
                    exceptionLine &&
                    !exceptionLine.startsWith('>>>') &&
                    !exceptionLine.startsWith('self =')
                ) {
                    return exceptionLine.length > 500
                        ? exceptionLine.substring(0, 500) + '...'
                        : exceptionLine;
                }
            }

            // Also look for file:line: ExceptionType format (before the E lines)
            const fileMatch = line.match(/^\s*(.+?):(\d+):\s*([A-Z]\w+(?:Error|Exception))/);
            if (fileMatch) {
                const [, file, lineNum, exceptionType] = fileMatch;
                const fileName = file.split('/').pop();
                return `${exceptionType} at ${fileName}:${lineNum}`;
            }
        }

        // Second pass: look for "raise" or "assert" statements (root cause)
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            if (trimmed.startsWith('raise ') || trimmed.startsWith('assert ')) {
                // Found the root cause raise/assert statement
                return trimmed.length > 500 ? trimmed.substring(0, 500) + '...' : trimmed;
            }
        }

        // Fallback: look for "Failed:" line (pytest wrapper)
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('Failed:')) {
                const cleaned = trimmed.replace(/^Failed:\s*/, '');
                return cleaned.length > 500 ? cleaned.substring(0, 500) + '...' : cleaned;
            }
        }

        // Last resort: first non-empty line that looks like an error
        for (const line of lines) {
            const trimmed = line.trim();
            if (
                trimmed &&
                !trimmed.startsWith('at ') &&
                !trimmed.startsWith('File ') &&
                !trimmed.startsWith('>') &&
                !trimmed.startsWith('_')
            ) {
                return trimmed.length > 500 ? trimmed.substring(0, 500) + '...' : trimmed;
            }
        }

        return null;
    };

    // Determine status
    if (caseData.failure) {
        status = 'failed';
        const failure = caseData.failure;
        const traceContent = failure._ || '';
        errorMessage = extractErrorMessage(traceContent, failure.message);
        errorType = failure.type || '';
        stackTrace = traceContent || failure.message || '';
    } else if (caseData.error) {
        status = 'error';
        const error = caseData.error;
        const traceContent = error._ || '';
        errorMessage = extractErrorMessage(traceContent, error.message);
        errorType = error.type || '';
        stackTrace = traceContent || error.message || '';
    } else if (caseData.skipped !== undefined) {
        status = 'skipped';
        skippedMessage =
            typeof caseData.skipped === 'string'
                ? caseData.skipped
                : caseData.skipped.message || '';
    }

    // Create test case
    const testCase = await TestCase.create({
        suite_id: suiteId,
        run_id: runId,
        name: caseData.name || 'Unnamed Test',
        class_name: caseData.classname || '',
        time: parseFloat(caseData.time || 0),
        status,
        error_message: errorMessage,
        error_type: errorType,
        stack_trace: stackTrace,
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
        error_message: errorMessage,
        error_type: errorType,
        skipped_message: skippedMessage,
        system_out: testCase.system_out,
        system_err: testCase.system_err,
        stack_trace: stackTrace,
        timestamp: testStartTime
    });
};

const calculateStats = async runId => {
    const cases = await TestCase.find({ run_id: runId });
    const passed = cases.filter(c => c.status === 'passed').length;
    const failed = cases.filter(c => c.status === 'failed').length;

    return {
        total_tests: cases.length,
        passed,
        failed,
        errors: cases.filter(c => c.status === 'error').length,
        skipped: cases.filter(c => c.status === 'skipped').length,
        time: cases.reduce((sum, c) => sum + c.time, 0)
    };
};

module.exports = { parseJUnitXML };
