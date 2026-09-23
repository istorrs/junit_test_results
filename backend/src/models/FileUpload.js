const mongoose = require('mongoose');

const fileUploadSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    upload_timestamp: {
        type: Date,
        default: Date.now
    },
    file_size: Number,
    status: {
        type: String,
        enum: ['processing', 'completed', 'failed'],
        default: 'processing'
    },
    run_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestRun'
    },
    created_run: {
        type: Boolean,
        default: false
    },
    content_hash: {
        type: String,
        unique: true,
        sparse: true
    },
    raw_content_hash: String,
    deduplication_scope: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    uploader: {
        ip: String,
        user_agent: String,
        source: String
    },
    error_message: String
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('FileUpload', fileUploadSchema);
