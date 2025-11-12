const mongoose = require('mongoose');

const testRunSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
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
        job_name: {
            type: String,
            index: true  // Index for filtering by project
        },
        build_number: {
            type: Number,
            index: true  // Index for test run identification
        },
        build_time: {
            type: Date,
            index: true
        },
        // Legacy fields for other CI systems
        provider: String,
        build_id: String,
        commit_sha: String,
        branch: String,
        repository: String,
        build_url: String
    },
    // Tier 2: Release tracking
    release_tag: {
        type: String,
        index: true,
        sparse: true  // Only index if present
    },
    release_version: {
        type: String,
        index: true,
        sparse: true
    },
    baseline: {
        type: Boolean,
        default: false
    },
    comparison_tags: [{
        type: String
    }],
    // Add aliases for backward compatibility
    tests: {
        type: Number,
        alias: 'total_tests'
    },
    failures: {
        type: Number,
        alias: 'total_failures'
    },
    errors: {
        type: Number,
        alias: 'total_errors'
    },
    skipped: {
        type: Number,
        alias: 'total_skipped'
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound index for unique test run identification
testRunSchema.index({ 'ci_metadata.job_name': 1, 'ci_metadata.build_number': 1, 'ci_metadata.build_time': 1 }, { unique: true, sparse: true });

// Index for filtering by project (job_name)
testRunSchema.index({ 'ci_metadata.job_name': 1, timestamp: -1 });

module.exports = mongoose.model('TestRun', testRunSchema);
