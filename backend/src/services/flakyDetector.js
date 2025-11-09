const TestCase = require('../models/TestCase');
const logger = require('../utils/logger');

const detectFlakyTests = async (runId) => {
    try {
        const testCases = await TestCase.find({
            run_id: runId,
            status: { $in: ['failed', 'error'] }
        });

        for (const testCase of testCases) {
            // Get historical results for this test
            const history = await TestCase.find({
                name: testCase.name,
                classname: testCase.classname
            }).sort({ created_at: -1 }).limit(10);

            if (history.length >= 3) {
                const statuses = history.map(h => h.status);
                const hasPassed = statuses.includes('passed');
                const hasFailed = statuses.includes('failed') || statuses.includes('error');

                // If test has both passed and failed in recent history, mark as flaky
                if (hasPassed && hasFailed) {
                    await TestCase.findByIdAndUpdate(testCase._id, {
                        is_flaky: true,
                        flaky_detected_at: new Date()
                    });

                    logger.info('Flaky test detected', {
                        test_name: testCase.name,
                        classname: testCase.classname
                    });
                }
            }
        }
    } catch (error) {
        logger.error('Error detecting flaky tests', { error: error.message });
    }
};

module.exports = { detectFlakyTests };
