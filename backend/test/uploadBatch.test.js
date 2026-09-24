/* global Blob, FormData, fetch */
const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');

const allureImporter = require('../src/services/allureImporter');
const flakyDetector = require('../src/services/flakyDetector');

test('batch upload passes an Allure ZIP to the importer with the correct arguments', async t => {
    const calls = [];
    t.mock.method(allureImporter, 'importAllureArchive', async (...args) => {
        calls.push(args);
        return {
            success: true,
            run_id: 'run-1',
            file_upload_id: 'upload-1',
            stats: { total_tests: 1, passed: 1, failed: 0, errors: 0, skipped: 0 }
        };
    });
    t.mock.method(flakyDetector, 'detectFlakyTests', async () => {});

    delete require.cache[require.resolve('../src/routes/upload')];
    const uploadRoutes = require('../src/routes/upload');
    const app = express();
    app.use('/api/v1/upload', uploadRoutes);
    app.use((error, req, res, next) => {
        void req;
        void next;
        res.status(500).json({ success: false, error: error.message });
    });

    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));

    const address = server.address();
    const form = new FormData();
    form.append('files', new Blob([Buffer.from('zip bytes')]), 'allure-results.zip');
    form.append(
        'ci_metadata',
        JSON.stringify({ provider: 'test', job_name: 'project', build_number: '42' })
    );
    form.append('release_tag', 'nightly');
    form.append('release_version', '1.2.3');

    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/upload/batch`, {
        method: 'POST',
        body: form
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.data.successful, 1);
    assert.equal(calls.length, 1);
    const [archive, filename, ciMetadata, uploader, releaseMetadata] = calls[0];
    assert.ok(Buffer.isBuffer(archive));
    assert.equal(filename, 'allure-results.zip');
    assert.deepEqual(ciMetadata, { provider: 'test', job_name: 'project', build_number: '42' });
    assert.equal(uploader.source, 'test');
    assert.deepEqual(releaseMetadata, {
        release_tag: 'nightly',
        release_version: '1.2.3'
    });
});
