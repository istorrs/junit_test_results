const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for expensive file system operations
 * Limits to 10 requests per minute per IP
 */
const logsRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: {
        success: false,
        error: 'Too many requests to logs API. Please try again later.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: 'Too many requests to logs API. Please try again later.',
            retryAfter: 60
        });
    }
});

/**
 * Standard API rate limiter
 * Limits to 100 requests per minute per IP
 */
const apiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: {
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    logsRateLimiter,
    apiRateLimiter
};
