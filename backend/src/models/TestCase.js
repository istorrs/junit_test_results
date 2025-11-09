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
    classname: String,
    time: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['passed', 'failed', 'error', 'skipped'],
        required: true
    },
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
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('TestCase', testCaseSchema);
