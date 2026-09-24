const test = require('node:test');
const assert = require('node:assert/strict');
const { buildReleaseMatch, getReleasePagination } = require('../src/services/releaseQuery');

test('buildReleaseMatch applies project and escaped release search', () => {
    const match = buildReleaseMatch({ job_name: 'project', search: '1.0+' });
    assert.equal(match['ci_metadata.job_name'], 'project');
    assert.equal(match.$or[0].release_tag.source, '1\\.0\\+');
    assert.equal(match.$or[1].release_version.flags, 'i');
});

test('getReleasePagination supports pages and caps the limit', () => {
    assert.deepEqual(getReleasePagination({ page: '3', limit: '25' }, 50, 100), {
        page: 3,
        limit: 25,
        skip: 50
    });
    assert.equal(getReleasePagination({ limit: '500' }, 50, 100).limit, 100);
});

test('getReleasePagination retains legacy skip support', () => {
    assert.deepEqual(getReleasePagination({ skip: '75', limit: '25' }, 50, 100), {
        page: 4,
        limit: 25,
        skip: 75
    });
});
