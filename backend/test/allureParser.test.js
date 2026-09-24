const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeEntryName } = require('../src/services/allureArchive');
const {
    mapStatus,
    normalizeAllureResult,
    parseAllureFiles
} = require('../src/services/allureParser');

test('normalizes nested Allure steps and metadata for passing tests', () => {
    const result = normalizeAllureResult({
        uuid: 'result-1',
        name: 'test_v4l2_device_identity',
        fullName: 'tests.test_video#test_v4l2_device_identity',
        status: 'passed',
        start: 1790189701256,
        stop: 1790189701503,
        labels: [
            { name: 'parentSuite', value: 'Hardware' },
            { name: 'suite', value: 'V4L2' },
            { name: 'tag', value: 'smoke' }
        ],
        steps: [
            {
                name: 'V4L2 device identity readable [V4L-002]',
                status: 'passed',
                start: 1790189701256,
                stop: 1790189701503,
                attachments: [{ name: 'NOTE', source: 'note-attachment.txt', type: 'text/plain' }],
                steps: [{ name: 'Read device', status: 'passed' }]
            }
        ],
        attachments: [{ name: 'stderr', source: 'stderr-attachment.txt', type: 'text/plain' }]
    });

    assert.equal(result.status, 'passed');
    assert.equal(result.time, 0.247);
    assert.equal(result.suite_name, 'Hardware / V4L2');
    assert.equal(result.steps[0].steps[0].name, 'Read device');
    assert.equal(result.steps[0].attachments[0].source, 'note-attachment.txt');
});

test('maps broken Allure tests to dashboard errors', () => {
    assert.equal(mapStatus('broken'), 'error');
    assert.equal(mapStatus('failed'), 'failed');
    assert.equal(mapStatus('unexpected'), 'error');
});

test('classifies result, container, and attachment files', () => {
    const parsed = parseAllureFiles(
        new Map([
            ['abc-result.json', Buffer.from(JSON.stringify({ uuid: 'abc', name: 'passes', status: 'passed' }))],
            ['abc-container.json', Buffer.from(JSON.stringify({ uuid: 'fixture', children: ['abc'] }))],
            ['abc-attachment.txt', Buffer.from('captured log')]
        ])
    );
    assert.equal(parsed.results.length, 1);
    assert.equal(parsed.containers.length, 1);
    assert.equal(parsed.attachments.get('abc-attachment.txt').toString(), 'captured log');
});

test('rejects unsafe archive paths and accepts a directory prefix', () => {
    assert.equal(normalizeEntryName('allure-results/abc-result.json'), 'abc-result.json');
    assert.throws(() => normalizeEntryName('../secret'), /Unsafe Allure archive entry/);
    assert.throws(() => normalizeEntryName('/etc/passwd'), /Unsafe Allure archive entry/);
});
