const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    identity_key: { type: String, required: true, unique: true },
    project: { type: String, required: true },
    repository: String,
    result_format: { type: String, enum: ['junit', 'allure'], required: true },
    identity_kind: { type: String, required: true },
    identity_value: { type: String, required: true },
    name: { type: String, required: true },
    class_name: String,
    full_name: String
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

schema.index({ project: 1, name: 1 });

module.exports = mongoose.model('TestDefinition', schema);
