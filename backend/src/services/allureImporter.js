const TestRun = require('../models/TestRun');
const TestSuite = require('../models/TestSuite');
const TestCase = require('../models/TestCase');
const FileUpload = require('../models/FileUpload');
const AllureAttachment = require('../models/AllureAttachment');
const { parseAllureArchive, normalizeAllureStep } = require('./allureParser');
const { buildCiRunQuery, generateUploadIdentity, hasCiBuildIdentity } = require('./uploadIdentity');
const { calculateRunStats } = require('./runStats');
const { rollbackUpload } = require('./uploadRollback');
const logger = require('../utils/logger');
const { resolveTestDefinition } = require('./testDefinition');

const suiteStats = results => ({
    total_tests: results.length,
    passed: results.filter(result => result.status === 'passed').length,
    failed: results.filter(result => result.status === 'failed').length,
    errors: results.filter(result => result.status === 'error').length,
    skipped: results.filter(result => result.status === 'skipped').length,
    time: results.reduce((total, result) => total + result.time, 0)
});

const importAllureArchive = async (
    archiveBuffer,
    filename,
    ciMetadata = null,
    uploaderInfo = {},
    releaseMetadata = {}
) => {
    let fileUpload;
    let testRun;
    let createdRun = false;

    try {
        const parsed = await parseAllureArchive(archiveBuffer);
        const { contentHash, rawContentHash, scope } = generateUploadIdentity(
            archiveBuffer,
            filename,
            ciMetadata,
            releaseMetadata
        );
        const existingUpload = await FileUpload.findOne({ content_hash: contentHash, status: 'completed' });
        if (existingUpload) {
            const existingRun = await TestRun.findById(existingUpload.run_id);
            if (existingRun) {
                // Parsing can become richer over time. Keep run-level metadata current
                // even when the archive body is correctly skipped as a duplicate.
                existingRun.allure_metadata = parsed.metadata;
                if (releaseMetadata.release_tag) existingRun.release_tag = releaseMetadata.release_tag;
                if (releaseMetadata.release_version) {
                    existingRun.release_version = releaseMetadata.release_version;
                }
                await existingRun.save();
            }
            return {
                success: true,
                duplicate: true,
                run_id: existingUpload.run_id,
                file_upload_id: existingUpload._id,
                stats: existingRun
                    ? {
                        total_tests: existingRun.total_tests,
                        passed: existingRun.passed,
                        failed: existingRun.failed,
                        errors: existingRun.errors,
                        skipped: existingRun.skipped,
                        time: existingRun.time
                    }
                    : undefined,
                message: 'Duplicate archive skipped'
            };
        }

        fileUpload = await FileUpload.create({
            filename,
            file_size: archiveBuffer.length,
            content_hash: contentHash,
            raw_content_hash: rawContentHash,
            deduplication_scope: scope,
            result_format: 'allure',
            status: 'processing',
            uploader: uploaderInfo
        });

        const resultStarts = parsed.results.map(result => result.start).filter(Boolean);
        const timestamp = ciMetadata?.build_time
            ? new Date(ciMetadata.build_time)
            : resultStarts.length > 0
                ? new Date(Math.min(...resultStarts.map(date => date.getTime())))
                : new Date();

        if (hasCiBuildIdentity(ciMetadata)) {
            testRun = await TestRun.findOne(buildCiRunQuery(ciMetadata));
        }
        if (!testRun) {
            testRun = await TestRun.create({
                name: hasCiBuildIdentity(ciMetadata)
                    ? `${ciMetadata.job_name} #${ciMetadata.build_number}`
                    : filename.replace(/\.(zip|allure)$/i, ''),
                timestamp,
                source: ciMetadata ? 'ci_cd' : 'api',
                ci_metadata: ciMetadata,
                file_upload_id: fileUpload._id,
                release_tag: releaseMetadata.release_tag || null,
                release_version: releaseMetadata.release_version || null,
                result_formats: ['allure'],
                allure_metadata: parsed.metadata
            });
            createdRun = true;
        } else {
            await TestRun.findByIdAndUpdate(testRun._id, {
                $addToSet: { result_formats: 'allure' },
                $set: { allure_metadata: parsed.metadata }
            });
        }

        await FileUpload.findByIdAndUpdate(fileUpload._id, {
            run_id: testRun._id,
            created_run: createdRun
        });

        const casesByUuid = new Map();
        const attachmentsByCase = new Map();
        const persistReferences = async (references, caseId) => {
            const cache = attachmentsByCase.get(caseId.toString()) || new Map();
            attachmentsByCase.set(caseId.toString(), cache);
            const stored = [];
            for (const reference of references || []) {
                let attachment = cache.get(reference.source);
                const content = parsed.attachments.get(reference.source);
                if (!attachment && content) {
                    attachment = await AllureAttachment.create({
                        run_id: testRun._id,
                        case_id: caseId,
                        file_upload_id: fileUpload._id,
                        source: reference.source,
                        name: reference.name,
                        content_type: reference.type,
                        size: content.length,
                        content
                    });
                    cache.set(reference.source, attachment);
                }
                stored.push({
                    ...reference,
                    attachment_id: attachment?._id,
                    size: attachment?.size
                });
            }
            return stored;
        };
        const persistSteps = async (steps, caseId) =>
            Promise.all(
                (steps || []).map(async step => ({
                    ...step,
                    attachments: await persistReferences(step.attachments, caseId),
                    steps: await persistSteps(step.steps, caseId)
                }))
            );

        const grouped = new Map();
        for (const result of parsed.results) {
            const suiteResults = grouped.get(result.suite_name) || [];
            suiteResults.push(result);
            grouped.set(result.suite_name, suiteResults);
        }
        for (const [suiteName, results] of grouped) {
            const stats = suiteStats(results);
            const suite = await TestSuite.create({
                run_id: testRun._id,
                name: suiteName,
                package_name: results[0]?.package_name || '',
                timestamp: results.map(result => result.start).filter(Boolean).sort()[0] || timestamp,
                ...stats,
                file_upload_id: fileUpload._id,
                properties: { result_format: 'allure' }
            });

            for (const result of results) {
                const details = result.status_details || {};
                const definitionId = await resolveTestDefinition(testRun, {
                    ...result, result_format: 'allure', class_name: suiteName,
                    timestamp: result.start || timestamp
                });
                const testCase = await TestCase.create({
                    definition_id: definitionId,
                    suite_id: suite._id,
                    run_id: testRun._id,
                    file_upload_id: fileUpload._id,
                    result_format: 'allure',
                    external_id: result.uuid,
                    history_id: result.history_id,
                    test_case_id: result.test_case_id,
                    name: result.name,
                    full_name: result.full_name,
                    class_name: suiteName,
                    time: result.time,
                    status: result.status,
                    error_message: details.message,
                    stack_trace: details.trace,
                    description: result.description,
                    description_html: result.description_html,
                    start: result.start,
                    stop: result.stop,
                    timestamp: result.start || timestamp,
                    status_details: details,
                    labels: result.labels,
                    parameters: result.parameters,
                    links: result.links
                });
                testCase.attachments = await persistReferences(result.attachments, testCase._id);
                testCase.steps = await persistSteps(result.steps, testCase._id);
                await testCase.save();
                if (result.uuid) casesByUuid.set(result.uuid, testCase._id);
            }
        }

        for (const container of parsed.containers) {
            for (const child of container.children || []) {
                const caseId = casesByUuid.get(child);
                if (!caseId) continue;
                const befores = await persistSteps((container.befores || []).map(normalizeAllureStep), caseId);
                const afters = await persistSteps((container.afters || []).map(normalizeAllureStep), caseId);
                await TestCase.findByIdAndUpdate(caseId, {
                    $push: { 'fixtures.befores': { $each: befores }, 'fixtures.afters': { $each: afters } }
                });
            }
        }

        const stats = await calculateRunStats(testRun._id);
        await Promise.all([
            TestRun.findByIdAndUpdate(testRun._id, stats),
            FileUpload.findByIdAndUpdate(fileUpload._id, { status: 'completed', run_id: testRun._id })
        ]);
        return { success: true, run_id: testRun._id, file_upload_id: fileUpload._id, stats };
    } catch (error) {
        logger.error('Error importing Allure archive', { error: error.message });
        if (fileUpload) {
            await rollbackUpload({
                fileUploadId: fileUpload._id,
                runId: testRun?._id,
                createdRun,
                errorMessage: error.message
            });
        }
        throw error;
    }
};

module.exports = { importAllureArchive, suiteStats };
