const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCaseSearch, getCaseSort } = require('../src/services/caseQuery');

test('case search treats a hyphenated test ID as one literal substring', () => {
    const query = buildCaseSearch('TC-VID-010');
    const pattern = query.$or[0].name;

    assert.equal(pattern.test('TC-VID-010: VPU encode'), true);
    assert.equal(pattern.test('TC-VID-011: H.264 encode'), false);
    assert.equal(pattern.test('TC-BOOT-010'), false);
});

test('case search escapes regular expression operators', () => {
    const pattern = buildCaseSearch('case[1].*').$or[0].name;
    assert.equal(pattern.test('case[1].* passes'), true);
    assert.equal(pattern.test('case1 anything'), false);
});

test('case sorting is deterministic and allowlisted', () => {
    assert.deepEqual(getCaseSort(), { field: 'name', direction: 1 });
    assert.deepEqual(getCaseSort('time', 'desc'), { field: 'time', direction: -1 });
    assert.throws(() => getCaseSort('$where', 'asc'), /Invalid sort_by/);
    assert.throws(() => getCaseSort('name', 'sideways'), /Invalid sort_order/);
});
