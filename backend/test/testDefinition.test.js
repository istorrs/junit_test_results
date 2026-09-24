const test = require('node:test');
const assert = require('node:assert/strict');
const { describeIdentity } = require('../src/services/testDefinition');

const run = project => ({ ci_metadata: { job_name: project } });
const junit = { result_format: 'junit', class_name: 'pkg.Case', name: 'test_works' };

test('JUnit identity is stable across runs and isolated by project', () => {
    const first = describeIdentity(run('alpha'), junit);
    assert.equal(first.identity_key, describeIdentity(run('alpha'), { ...junit, status: 'failed' }).identity_key);
    assert.notEqual(first.identity_key, describeIdentity(run('beta'), junit).identity_key);
    assert.notEqual(first.identity_key, describeIdentity({ ci_metadata: {
        job_name: 'alpha', repository: 'other-repo'
    } }, junit).identity_key);
    assert.notEqual(first.identity_key, describeIdentity(run('alpha'), { ...junit, name: 'test_other' }).identity_key);
});

test('Allure historyId distinguishes parameterized variants and format', () => {
    const a = describeIdentity(run('alpha'), { ...junit, result_format: 'allure', history_id: 'a' });
    const b = describeIdentity(run('alpha'), { ...junit, result_format: 'allure', history_id: 'b' });
    assert.notEqual(a.identity_key, b.identity_key);
    assert.notEqual(a.identity_key, describeIdentity(run('alpha'), junit).identity_key);
});

test('Allure testCaseId fallback includes non-excluded parameters', () => {
    const base = { ...junit, result_format: 'allure', test_case_id: 'source-id' };
    const a = describeIdentity(run('alpha'), { ...base, parameters: [{ name: 'board', value: 'imx95' }] });
    const b = describeIdentity(run('alpha'), { ...base, parameters: [{ name: 'board', value: 'imx93' }] });
    assert.notEqual(a.identity_key, b.identity_key);
    assert.equal(a.identity_key, describeIdentity(run('alpha'), {
        ...base, parameters: [{ name: 'board', value: 'imx95' }, { name: 'ignored', value: 'x', excluded: true }]
    }).identity_key);
});
