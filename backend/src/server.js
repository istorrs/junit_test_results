require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { connectDB } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Import routes
const uploadRoutes = require('./routes/upload');
const runsRoutes = require('./routes/runs');
const casesRoutes = require('./routes/cases');
const statsRoutes = require('./routes/stats');
const analysisRoutes = require('./routes/analysis');
const analyticsRoutes = require('./routes/analytics');

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(compression());
app.use(
    cors({
        origin: process.env.ALLOWED_ORIGINS.split(','),
        credentials: true
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(
        morgan('combined', {
            stream: {
                write: message => logger.info(message.trim())
            }
        })
    );
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'JUnit Test Results API is running',
        timestamp: new Date().toISOString()
    });
});

// API routes
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/runs', runsRoutes);
app.use('/api/v1/cases', casesRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/analysis', analysisRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
    logger.info(`Server running on ${HOST}:${PORT} in ${process.env.NODE_ENV} mode`);
});

module.exports = app;
