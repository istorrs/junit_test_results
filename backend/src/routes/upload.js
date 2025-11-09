const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parseJUnitXML } = require('../services/junitParser');
const { detectFlakyTests } = require('../services/flakyDetector');
const { validateUpload } = require('../middleware/validator');
const logger = require('../utils/logger');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800, // 50MB default
    },
    fileFilter: (req, file, cb) => {
        if (file.originalname.endsWith('.xml')) {
            cb(null, true);
        } else {
            cb(new Error('Only XML files are allowed'), false);
        }
    }
});

// POST /api/v1/upload - Upload single JUnit XML file
router.post('/', upload.single('file'), validateUpload, async (req, res, next) => {
    try {
        const xmlContent = req.file.buffer.toString('utf-8');
        const filename = req.file.originalname;

        // Parse CI metadata from request body
        let ciMetadata = null;
        if (req.body.ci_metadata) {
            try {
                ciMetadata = typeof req.body.ci_metadata === 'string'
                    ? JSON.parse(req.body.ci_metadata)
                    : req.body.ci_metadata;
            } catch (e) {
                logger.warn('Invalid CI metadata format', { error: e.message });
            }
        }

        // Uploader info
        const uploaderInfo = {
            ip: req.ip,
            user_agent: req.headers['user-agent'],
            source: ciMetadata ? ciMetadata.provider : 'api'
        };

        // Parse and store
        const result = await parseJUnitXML(xmlContent, filename, ciMetadata, uploaderInfo);

        if (!result.success) {
            return res.status(409).json(result);
        }

        // Detect flaky tests asynchronously
        detectFlakyTests(result.run_id).catch(err => {
            logger.error('Error in flaky test detection', { error: err.message });
        });

        res.status(201).json({
            success: true,
            data: {
                run_id: result.run_id,
                file_upload_id: result.file_upload_id,
                stats: result.stats
            }
        });

    } catch (error) {
        next(error);
    }
});

// POST /api/v1/upload/batch - Upload multiple JUnit XML files
router.post('/batch', upload.array('files', parseInt(process.env.MAX_FILES) || 20), async (req, res, next) => {
    try {
        const results = [];

        for (const file of req.files) {
            try {
                const xmlContent = file.buffer.toString('utf-8');
                const filename = file.originalname;

                let ciMetadata = null;
                if (req.body.ci_metadata) {
                    ciMetadata = typeof req.body.ci_metadata === 'string'
                        ? JSON.parse(req.body.ci_metadata)
                        : req.body.ci_metadata;
                }

                const uploaderInfo = {
                    ip: req.ip,
                    user_agent: req.headers['user-agent'],
                    source: ciMetadata ? ciMetadata.provider : 'api'
                };

                const result = await parseJUnitXML(xmlContent, filename, ciMetadata, uploaderInfo);

                results.push({
                    filename,
                    ...result
                });

                if (result.success) {
                    detectFlakyTests(result.run_id).catch(err => {
                        logger.error('Error in flaky test detection', { error: err.message });
                    });
                }

            } catch (error) {
                results.push({
                    filename: file.originalname,
                    success: false,
                    error: error.message
                });
            }
        }

        res.status(201).json({
            success: true,
            data: {
                total_files: req.files.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                results
            }
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
