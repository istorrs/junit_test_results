const test = require('node:test');
const assert = require('node:assert/strict');
const { suiteStats } = require('../src/services/allureImporter');

test('suiteStats counts every Allure status and duration', () => {
    assert.deepEqual(
        suiteStats([
            { status: 'passed', time: 1 },
            { status: 'failed', time: 2 },
            { status: 'error', time: 3 },
            { status: 'skipped', time: 0 }
        ]),
        {
            total_tests: 4,
            passed: 1,
            failed: 1,
            errors: 1,
            skipped: 1,
            time: 6
        }
    );
});
