const test = require('node:test');
const assert = require('node:assert/strict');
const {
    buildCiRunQuery,
    generateUploadIdentity,
    hasCiBuildIdentity
} = require('../src/services/uploadIdentity');

const xml = '<testsuite tests="0" />';

test('retries for the same CI build have the same identity', () => {
    const metadata = {
        provider: 'jenkins',
        repository: 'example/service',
        job_name: 'unit-tests',
        build_number: 42
    };

    const first = generateUploadIdentity(xml, 'results.xml', metadata, {});
    const retry = generateUploadIdentity(xml, 'renamed.xml', metadata, {});

    assert.equal(first.contentHash, retry.contentHash);
    assert.equal(first.rawContentHash, retry.rawContentHash);
});

test('identical XML from different CI builds is not treated as a duplicate', () => {
    const first = generateUploadIdentity(
        xml,
        'results.xml',
        { provider: 'jenkins', job_name: 'unit-tests', build_number: 42 },
        {}
    );
    const second = generateUploadIdentity(
        xml,
        'results.xml',
        { provider: 'jenkins', job_name: 'unit-tests', build_number: 43 },
        {}
    );

    assert.notEqual(first.contentHash, second.contentHash);
});

test('manual uploads are scoped by filename and release', () => {
    const first = generateUploadIdentity(xml, 'results.xml', null, { release_tag: 'v1' });
    const second = generateUploadIdentity(xml, 'results.xml', null, { release_tag: 'v2' });

    assert.notEqual(first.contentHash, second.contentHash);
});

test('CI run lookup includes available provider and repository scope', () => {
    assert.deepEqual(
        buildCiRunQuery({
            provider: 'jenkins',
            repository: 'example/service',
            job_name: 'unit-tests',
            build_number: 42
        }),
        {
            'ci_metadata.provider': 'jenkins',
            'ci_metadata.repository': 'example/service',
            'ci_metadata.job_name': 'unit-tests',
            'ci_metadata.build_number': 42
        }
    );
});

test('build number zero is a valid CI build identity', () => {
    assert.equal(hasCiBuildIdentity({ job_name: 'unit-tests', build_number: 0 }), true);
    assert.equal(hasCiBuildIdentity({ job_name: 'unit-tests', build_number: null }), false);
});
