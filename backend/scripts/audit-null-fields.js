/**
 * Audit script to find all null/undefined fields across collections
 * Helps identify data quality issues and missing field values
 */

const mongoose = require('mongoose');
const TestRun = require('../src/models/TestRun');
const TestCase = require('../src/models/TestCase');
const TestSuite = require('../src/models/TestSuite');
const TestResult = require('../src/models/TestResult');

const MONGODB_URI =
    process.env.MONGODB_URI ||
    'mongodb://junit_app:changeme@mongodb:27017/junit_test_results?authSource=junit_test_results';

async function auditNullFields() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('🔍 Auditing database for null/missing fields...\n');

        // Check TestRun collection
        console.log('═══ TestRun Collection ═══');
        const testRuns = await TestRun.find({}).lean();
        const runNullFields = {};

        testRuns.forEach(run => {
            Object.keys(run).forEach(key => {
                if (run[key] === null || run[key] === undefined) {
                    if (!runNullFields[key]) {
                        runNullFields[key] = 0;
                    }
                    runNullFields[key]++;
                }
            });
        });

        console.log(`Total TestRuns: ${testRuns.length}`);
        if (Object.keys(runNullFields).length === 0) {
            console.log('  ✅ No null/undefined fields found');
        } else {
            Object.entries(runNullFields)
                .sort(([, a], [, b]) => b - a)
                .forEach(([field, count]) => {
                    const pct = ((count / testRuns.length) * 100).toFixed(1);
                    console.log(`  • ${field}: ${count} documents (${pct}%)`);
                });
        }

        // Check TestCase collection
        console.log('\n═══ TestCase Collection ═══');
        const testCases = await TestCase.find({}).lean();
        const caseNullFields = {};

        testCases.forEach(tc => {
            Object.keys(tc).forEach(key => {
                if (tc[key] === null || tc[key] === undefined) {
                    if (!caseNullFields[key]) {
                        caseNullFields[key] = 0;
                    }
                    caseNullFields[key]++;
                }
            });
        });

        console.log(`Total TestCases: ${testCases.length}`);
        if (Object.keys(caseNullFields).length === 0) {
            console.log('  ✅ No null/undefined fields found');
        } else {
            Object.entries(caseNullFields)
                .sort(([, a], [, b]) => b - a)
                .forEach(([field, count]) => {
                    const pct = ((count / testCases.length) * 100).toFixed(1);
                    console.log(`  • ${field}: ${count} documents (${pct}%)`);
                });
        }

        // Check TestSuite collection
        console.log('\n═══ TestSuite Collection ═══');
        const testSuites = await TestSuite.find({}).lean();
        const suiteNullFields = {};

        testSuites.forEach(suite => {
            Object.keys(suite).forEach(key => {
                if (suite[key] === null || suite[key] === undefined) {
                    if (!suiteNullFields[key]) {
                        suiteNullFields[key] = 0;
                    }
                    suiteNullFields[key]++;
                }
            });
        });

        console.log(`Total TestSuites: ${testSuites.length}`);
        if (Object.keys(suiteNullFields).length === 0) {
            console.log('  ✅ No null/undefined fields found');
        } else {
            Object.entries(suiteNullFields)
                .sort(([, a], [, b]) => b - a)
                .forEach(([field, count]) => {
                    const pct = ((count / testSuites.length) * 100).toFixed(1);
                    console.log(`  • ${field}: ${count} documents (${pct}%)`);
                });
        }

        // Check TestResult collection
        console.log('\n═══ TestResult Collection ═══');
        const testResults = await TestResult.find({}).lean();
        const resultNullFields = {};

        testResults.forEach(result => {
            Object.keys(result).forEach(key => {
                if (result[key] === null || result[key] === undefined) {
                    if (!resultNullFields[key]) {
                        resultNullFields[key] = 0;
                    }
                    resultNullFields[key]++;
                }
            });
        });

        console.log(`Total TestResults: ${testResults.length}`);
        if (Object.keys(resultNullFields).length === 0) {
            console.log('  ✅ No null/undefined fields found');
        } else {
            Object.entries(resultNullFields)
                .sort(([, a], [, b]) => b - a)
                .forEach(([field, count]) => {
                    const pct = ((count / testResults.length) * 100).toFixed(1);
                    console.log(`  • ${field}: ${count} documents (${pct}%)`);
                });
        }

        console.log('\n✅ Audit complete!');
        await mongoose.connection.close();
    } catch (error) {
        console.error('Error during audit:', error);
        process.exit(1);
    }
}

auditNullFields();
