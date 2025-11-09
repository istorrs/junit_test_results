const mongoose = require('mongoose');

const testSuiteSchema = new mongoose.Schema({
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
    timestamp: {
        type: Date,
        default: Date.now
    },
    time: {
        type: Number,
        default: 0
    },
    tests: {
        type: Number,
        default: 0
    },
    failures: {
        type: Number,
        default: 0
    },
    errors: {
        type: Number,
        default: 0
    },
    skipped: {
        type: Number,
        default: 0
    },
    hostname: String,
    file_upload_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FileUpload'
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('TestSuite', testSuiteSchema);
