const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
    case_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestCase',
        required: true
    },
    suite_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestSuite',
        required: true
    },
    run_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestRun',
        required: true
    },
    status: {
        type: String,
        enum: ['passed', 'failed', 'error', 'skipped'],
        required: true
    },
    time: Number,
    failure_message: String,
    failure_type: String,
    error_message: String,
    error_type: String,
    skipped_message: String,
    system_out: String,
    system_err: String,
    stack_trace: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'created_at' }
});

module.exports = mongoose.model('TestResult', testResultSchema);
