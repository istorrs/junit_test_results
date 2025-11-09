const Joi = require('joi');

const validateUpload = (req, res, next) => {
    if (!req.file && !req.files) {
        return res.status(400).json({
            success: false,
            error: 'No file uploaded'
        });
    }

    const file = req.file || (req.files && req.files[0]);

    if (!file.originalname.endsWith('.xml')) {
        return res.status(400).json({
            success: false,
            error: 'Only XML files are allowed'
        });
    }

    next();
};

const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.query);
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message
            });
        }
        next();
    };
};

module.exports = { validateUpload, validateQuery };
