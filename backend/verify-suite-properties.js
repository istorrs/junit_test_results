const mongoose = require('mongoose');
const TestSuite = require('./src/models/TestSuite');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://junit_app:changeme@mongodb:27017/junit_test_results?authSource=junit_test_results';

async function verifySuiteProperties() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB\n');

        // Get a sample of test suites
        const suites = await TestSuite.find().limit(10).sort({ timestamp: -1 });

        console.log(`Found ${suites.length} recent test suites\n`);

        let suitesWithProperties = 0;
        let suitesWithoutProperties = 0;

        for (const suite of suites) {
            const hasProperties = suite.properties && Object.keys(suite.properties).length > 0;

            if (hasProperties) {
                suitesWithProperties++;
                console.log(`✓ Suite: ${suite.name}`);
                console.log(`  ID: ${suite._id}`);
                console.log(`  Properties count: ${Object.keys(suite.properties).length}`);
                console.log(`  Property keys: ${Object.keys(suite.properties).slice(0, 5).join(', ')}${Object.keys(suite.properties).length > 5 ? '...' : ''}`);
                if (suite.properties.test_group) {
                    console.log(`  test_group: ${suite.properties.test_group}`);
                }
                console.log('');
            } else {
                suitesWithoutProperties++;
                console.log(`✗ Suite: ${suite.name}`);
                console.log(`  ID: ${suite._id}`);
                console.log('  Properties: EMPTY or NULL');
                console.log('');
            }
        }

        console.log('\nSummary:');
        console.log(`  Suites WITH properties: ${suitesWithProperties}`);
        console.log(`  Suites WITHOUT properties: ${suitesWithoutProperties}`);

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

verifySuiteProperties();
