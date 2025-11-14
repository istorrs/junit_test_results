const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
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
    name: {
        type: String,
        required: true
    },
    class_name: String,
    time: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['passed', 'failed', 'error', 'skipped'],
        required: true
    },
    error_message: String,
    error_type: String,
    stack_trace: String,
    assertions: Number,
    file: String,
    line: Number,
    system_out: String,
    system_err: String,
    is_flaky: {
        type: Boolean,
        default: false
    },
    flaky_detected_at: Date,
    file_upload_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FileUpload'
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id.toString();
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

module.exports = mongoose.model('TestCase', testCaseSchema);
