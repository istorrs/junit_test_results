const mongoose = require('mongoose');
const TestCase = require('../models/TestCase');

const buildRunStatsPipeline = runId => [
    { $match: { run_id: new mongoose.Types.ObjectId(runId) } },
    {
        $group: {
            _id: null,
            total_tests: { $sum: 1 },
            passed: { $sum: { $cond: [{ $eq: ['$status', 'passed'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            errors: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
            skipped: { $sum: { $cond: [{ $eq: ['$status', 'skipped'] }, 1, 0] } },
            time: { $sum: '$time' }
        }
    }
];

const emptyRunStats = () => ({
    total_tests: 0,
    passed: 0,
    failed: 0,
    errors: 0,
    skipped: 0,
    time: 0
});

const calculateRunStats = async runId => {
    const [stats] = await TestCase.aggregate(buildRunStatsPipeline(runId));
    if (!stats) return emptyRunStats();

    delete stats._id;
    return stats;
};

module.exports = { buildRunStatsPipeline, calculateRunStats, emptyRunStats };
