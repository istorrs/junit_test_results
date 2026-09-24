const test = require('node:test');
const assert = require('node:assert/strict');
const { buildRunStatsPipeline, emptyRunStats } = require('../src/services/runStats');

test('buildRunStatsPipeline calculates run counters in MongoDB', () => {
    const pipeline = buildRunStatsPipeline('507f1f77bcf86cd799439011');
    const group = pipeline[1].$group;

    assert.equal(pipeline[0].$match.run_id.toString(), '507f1f77bcf86cd799439011');
    assert.equal(group.total_tests.$sum, 1);
    assert.equal(group.passed.$sum.$cond[0].$eq[1], 'passed');
    assert.equal(group.time.$sum, '$time');
});

test('emptyRunStats provides all persisted counters', () => {
    assert.deepEqual(emptyRunStats(), {
        total_tests: 0,
        passed: 0,
        failed: 0,
        errors: 0,
        skipped: 0,
        time: 0
    });
});
