const mongoose = require('mongoose');

const attachmentReferenceSchema = new mongoose.Schema(
    {
        attachment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AllureAttachment' },
        name: String,
        source: String,
        type: String,
        size: Number
    },
    { _id: false }
);

const allureStepSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        status: { type: String, enum: ['passed', 'failed', 'error', 'skipped'] },
        start: Date,
        stop: Date,
        time: Number,
        status_details: mongoose.Schema.Types.Mixed,
        parameters: [mongoose.Schema.Types.Mixed],
        attachments: [attachmentReferenceSchema]
    },
    { _id: false }
);
allureStepSchema.add({ steps: [allureStepSchema] });

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
    result_format: {
        type: String,
        enum: ['junit', 'allure'],
        default: 'junit',
        index: true
    },
    external_id: String,
    history_id: String,
    test_case_id: String,
    full_name: String,
    description: String,
    description_html: String,
    start: Date,
    stop: Date,
    status_details: mongoose.Schema.Types.Mixed,
    labels: [mongoose.Schema.Types.Mixed],
    parameters: [mongoose.Schema.Types.Mixed],
    links: [mongoose.Schema.Types.Mixed],
    steps: [allureStepSchema],
    attachments: [attachmentReferenceSchema],
    fixtures: {
        befores: [allureStepSchema],
        afters: [allureStepSchema]
    },
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
