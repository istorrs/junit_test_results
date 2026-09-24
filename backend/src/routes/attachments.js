const express = require('express');
const mongoose = require('mongoose');
const AllureAttachment = require('../models/AllureAttachment');
const { apiRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
const INLINE_CONTENT_TYPES = new Set([
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp'
]);

router.get('/:id', apiRateLimiter, async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, error: 'Invalid attachment ID' });
        }
        const attachment = await AllureAttachment.findById(req.params.id);
        if (!attachment) {
            return res.status(404).json({ success: false, error: 'Attachment not found' });
        }

        const safeName = attachment.name.replace(/[\r\n"]/g, '_');
        const contentType = attachment.content_type || 'application/octet-stream';
        const disposition = INLINE_CONTENT_TYPES.has(contentType) ? 'inline' : 'attachment';
        res.set({
            'Content-Type': contentType,
            'Content-Length': attachment.size,
            'Content-Disposition': `${disposition}; filename="${safeName}"`,
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'private, max-age=300'
        });
        res.send(attachment.content);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
