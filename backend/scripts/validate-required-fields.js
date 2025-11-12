/**
 * Validation script to check for missing required fields
 * Focuses on fields that should ALWAYS have values (not status-dependent)
 */

const mongoose = require('mongoose');
const TestRun = require('../src/models/TestRun');
const TestCase = require('../src/models/TestCase');
const TestSuite = require('../src/models/TestSuite');
const TestResult = require('../src/models/TestResult');

const MONGODB_URI =
    process.env.MONGODB_URI ||
    'mongodb://junit_app:changeme@mongodb:27017/junit_test_results?authSource=junit_test_results';

// Define required fields for each collection
const REQUIRED_FIELDS = {
    TestRun: ['name', 'timestamp', 'tests', 'failures', 'errors', 'skipped', 'time'],
    TestCase: ['name', 'status', 'time', 'run_id', 'suite_id'],
    TestSuite: ['name', 'run_id', 'timestamp', 'time', 'tests', 'failures', 'errors', 'skipped'],
    TestResult: ['case_id', 'suite_id', 'run_id', 'status', 'timestamp']
};

async function validateRequiredFields() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('🔍 Validating required fields across all collections...\n');

        let totalIssues = 0;

        // Validate TestRun
        console.log('═══ TestRun Collection ═══');
        const testRuns = await TestRun.find({}).lean();
        let runIssues = 0;

        testRuns.forEach((run, idx) => {
            REQUIRED_FIELDS.TestRun.forEach(field => {
                if (run[field] === null || run[field] === undefined) {
                    console.log(
                        `  ⚠️  TestRun #${idx + 1} (${run.name || run._id}): Missing '${field}'`
                    );
                    runIssues++;
                }
            });
        });

        if (runIssues === 0) {
            console.log(`  ✅ All ${testRuns.length} test runs have required fields`);
        } else {
            console.log(`  ❌ Found ${runIssues} missing required fields`);
        }
        totalIssues += runIssues;

        // Validate TestCase
        console.log('\n═══ TestCase Collection ═══');
        const testCases = await TestCase.find({}).lean();
        let caseIssues = 0;

        testCases.forEach((tc, idx) => {
            REQUIRED_FIELDS.TestCase.forEach(field => {
                if (tc[field] === null || tc[field] === undefined) {
                    console.log(`  ⚠️  TestCase #${idx + 1} (${tc.name}): Missing '${field}'`);
                    caseIssues++;
                }
            });
        });

        if (caseIssues === 0) {
            console.log(`  ✅ All ${testCases.length} test cases have required fields`);
        } else {
            console.log(`  ❌ Found ${caseIssues} missing required fields`);
        }
        totalIssues += caseIssues;

        // Validate TestSuite
        console.log('\n═══ TestSuite Collection ═══');
        const testSuites = await TestSuite.find({}).lean();
        let suiteIssues = 0;

        testSuites.forEach((suite, idx) => {
            REQUIRED_FIELDS.TestSuite.forEach(field => {
                if (suite[field] === null || suite[field] === undefined) {
                    console.log(`  ⚠️  TestSuite #${idx + 1} (${suite.name}): Missing '${field}'`);
                    suiteIssues++;
                }
            });
        });

        if (suiteIssues === 0) {
            console.log(`  ✅ All ${testSuites.length} test suites have required fields`);
        } else {
            console.log(`  ❌ Found ${suiteIssues} missing required fields`);
        }
        totalIssues += suiteIssues;

        // Validate TestResult
        console.log('\n═══ TestResult Collection ═══');
        const testResults = await TestResult.find({}).lean();
        let resultIssues = 0;

        testResults.forEach((result, idx) => {
            REQUIRED_FIELDS.TestResult.forEach(field => {
                if (result[field] === null || result[field] === undefined) {
                    console.log(`  ⚠️  TestResult #${idx + 1}: Missing '${field}'`);
                    resultIssues++;
                }
            });
        });

        if (resultIssues === 0) {
            console.log(`  ✅ All ${testResults.length} test results have required fields`);
        } else {
            console.log(`  ❌ Found ${resultIssues} missing required fields`);
        }
        totalIssues += resultIssues;

        // Summary
        console.log('\n═══════════════════════════');
        if (totalIssues === 0) {
            console.log('✅ VALIDATION PASSED: All required fields are present');
        } else {
            console.log(`❌ VALIDATION FAILED: Found ${totalIssues} missing required fields`);
            console.log('\nRecommendation: Run migration scripts to fix missing data');
        }
        console.log('═══════════════════════════\n');

        await mongoose.connection.close();
        process.exit(totalIssues > 0 ? 1 : 0);
    } catch (error) {
        console.error('Error during validation:', error);
        process.exit(1);
    }
}

validateRequiredFields();
