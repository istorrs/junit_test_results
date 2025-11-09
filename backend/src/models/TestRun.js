const mongoose = require('mongoose');

const testRunSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        required: true,
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
    total_failures: {
        type: Number,
        default: 0
    },
    total_errors: {
        type: Number,
        default: 0
    },
    total_skipped: {
        type: Number,
        default: 0
    },
    content_hash: {
        type: String,
        unique: true,
        sparse: true
    },
    file_upload_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FileUpload'
    },
    source: {
        type: String,
        enum: ['manual_upload', 'ci_cd', 'api'],
        default: 'api'
    },
    ci_metadata: {
        provider: String,
        build_id: String,
        commit_sha: String,
        branch: String,
        repository: String,
        build_url: String,
        job_name: String
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('TestRun', testRunSchema);
