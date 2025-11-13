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
    package_name: String,
    // Legacy field - keep for backwards compatibility
    classname: String,
    timestamp: {
        type: Date,
        default: Date.now
    },
    time: {
        type: Number,
        default: 0
    },
    total_tests: {
        type: Number,
        default: 0
    },
    // Legacy field - keep for backwards compatibility
    tests: {
        type: Number,
        default: 0
    },
    passed: {
        type: Number,
        default: 0
    },
    failed: {
        type: Number,
        default: 0
    },
    // Legacy field - keep for backwards compatibility
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
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id.toString()
            delete ret._id
            delete ret.__v
            // Prefer package_name over classname for suite
            if (!ret.package_name && ret.classname) {
                ret.package_name = ret.classname
            }
            return ret
        }
    }
});

module.exports = mongoose.model('TestSuite', testSuiteSchema);
