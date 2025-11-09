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
    content_hash: {
        type: String,
        unique: true,
        sparse: true
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
