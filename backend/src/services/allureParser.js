const { readAllureArchive } = require('./allureArchive');

const ALLURE_STATUS_MAP = Object.freeze({
    passed: 'passed',
    failed: 'failed',
    broken: 'error',
    skipped: 'skipped',
    unknown: 'error'
});

const mapStatus = status => ALLURE_STATUS_MAP[status] || 'error';
const durationSeconds = (start, stop) =>
    Number.isFinite(start) && Number.isFinite(stop) && stop >= start ? (stop - start) / 1000 : 0;

const normalizeAttachments = attachments =>
    Array.isArray(attachments)
        ? attachments
            .filter(attachment => attachment?.source)
            .map(attachment => ({
                name: attachment.name || attachment.source,
                source: attachment.source,
                type: attachment.type || 'application/octet-stream'
            }))
        : [];

const normalizeAllureStep = step => ({
    name: step?.name || 'Unnamed step',
    status: mapStatus(step?.status),
    start: Number.isFinite(step?.start) ? new Date(step.start) : null,
    stop: Number.isFinite(step?.stop) ? new Date(step.stop) : null,
    time: durationSeconds(step?.start, step?.stop),
    status_details: step?.statusDetails || {},
    parameters: Array.isArray(step?.parameters) ? step.parameters : [],
    attachments: normalizeAttachments(step?.attachments),
    steps: Array.isArray(step?.steps) ? step.steps.map(normalizeAllureStep) : []
});

const labelValue = (labels, name) => labels.find(label => label?.name === name)?.value;

const normalizeAllureResult = result => {
    const labels = Array.isArray(result.labels) ? result.labels : [];
    const suiteParts = ['parentSuite', 'suite', 'subSuite']
        .map(name => labelValue(labels, name))
        .filter(Boolean);
    const start = Number.isFinite(result.start) ? result.start : null;
    const stop = Number.isFinite(result.stop) ? result.stop : null;

    return {
        uuid: result.uuid,
        history_id: result.historyId,
        test_case_id: result.testCaseId,
        name: result.name || 'Unnamed test',
        full_name: result.fullName,
        status: mapStatus(result.status),
        status_details: result.statusDetails || {},
        description: result.description || '',
        description_html: result.descriptionHtml || '',
        start: start === null ? null : new Date(start),
        stop: stop === null ? null : new Date(stop),
        time: durationSeconds(start, stop),
        suite_name: suiteParts.join(' / ') || labelValue(labels, 'package') || 'Allure Tests',
        package_name: labelValue(labels, 'package') || '',
        labels,
        links: Array.isArray(result.links) ? result.links : [],
        parameters: Array.isArray(result.parameters) ? result.parameters : [],
        attachments: normalizeAttachments(result.attachments),
        steps: Array.isArray(result.steps) ? result.steps.map(normalizeAllureStep) : []
    };
};

const parseJson = (name, content) => {
    try {
        return JSON.parse(content.toString('utf8'));
    } catch (error) {
        throw new Error(`Invalid JSON in ${name}: ${error.message}`);
    }
};

const parseAllureFiles = files => {
    const results = [];
    const containers = [];
    const attachments = new Map();

    for (const [name, content] of files) {
        if (name.endsWith('-result.json')) results.push(normalizeAllureResult(parseJson(name, content)));
        else if (name.endsWith('-container.json')) containers.push(parseJson(name, content));
        else if (name.includes('-attachment.')) attachments.set(name, content);
    }
    if (results.length === 0) throw new Error('Allure archive contains no result JSON files');

    return { results, containers, attachments };
};

const parseAllureArchive = async (archiveBuffer, limits) =>
    parseAllureFiles(await readAllureArchive(archiveBuffer, limits));

module.exports = {
    mapStatus,
    normalizeAllureStep,
    normalizeAllureResult,
    parseAllureFiles,
    parseAllureArchive
};
