const express = require('express');
const mongoose = require('mongoose');
const AllureAttachment = require('../models/AllureAttachment');

const router = express.Router();

router.get('/:id', async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, error: 'Invalid attachment ID' });
        }
        const attachment = await AllureAttachment.findById(req.params.id);
        if (!attachment) {
            return res.status(404).json({ success: false, error: 'Attachment not found' });
        }

        const safeName = attachment.name.replace(/[\r\n"]/g, '_');
        res.set({
            'Content-Type': attachment.content_type || 'application/octet-stream',
            'Content-Length': attachment.size,
            'Content-Disposition': `attachment; filename="${safeName}"`,
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'private, max-age=300'
        });
        res.send(attachment.content);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
