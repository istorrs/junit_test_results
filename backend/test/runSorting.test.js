const test = require('node:test');
const assert = require('node:assert/strict');
const { getRunSort, buildPassRateSortPipeline } = require('../src/services/runSorting');

test('getRunSort defaults to newest run first', () => {
    assert.deepEqual(getRunSort(), { field: 'timestamp', direction: -1 });
});

test('getRunSort accepts allowlisted fields and directions', () => {
    assert.deepEqual(getRunSort('total_tests', 'asc'), {
        field: 'total_tests',
        direction: 1
    });
    assert.deepEqual(getRunSort('pass_rate', 'desc'), {
        field: 'pass_rate',
        direction: -1
    });
});

test('getRunSort rejects arbitrary fields and directions', () => {
    assert.throws(() => getRunSort('$where', 'asc'), /Invalid sort_by/);
    assert.throws(() => getRunSort('name', 'sideways'), /Invalid sort_order/);
});

test('buildPassRateSortPipeline calculates rate before stable pagination', () => {
    const query = { 'ci_metadata.job_name': 'example' };
    const pipeline = buildPassRateSortPipeline(query, -1, 50, 25);

    assert.deepEqual(pipeline[0], { $match: query });
    assert.deepEqual(pipeline[2], { $sort: { _sort_pass_rate: -1, _id: -1 } });
    assert.deepEqual(pipeline[3], { $skip: 50 });
    assert.deepEqual(pipeline[4], { $limit: 25 });
});
