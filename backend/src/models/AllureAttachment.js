const mongoose = require('mongoose');

const allureAttachmentSchema = new mongoose.Schema(
    {
        run_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TestRun', required: true, index: true },
        case_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TestCase', required: true, index: true },
        file_upload_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FileUpload',
            required: true,
            index: true
        },
        source: { type: String, required: true },
        name: { type: String, required: true },
        content_type: { type: String, default: 'application/octet-stream' },
        size: { type: Number, required: true },
        content: { type: Buffer, required: true }
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

allureAttachmentSchema.index({ file_upload_id: 1, source: 1 });

module.exports = mongoose.model('AllureAttachment', allureAttachmentSchema);
