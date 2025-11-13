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
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id.toString()
            delete ret._id
            delete ret.__v
            return ret
        }
    }
});

module.exports = mongoose.model('TestResult', testResultSchema);
