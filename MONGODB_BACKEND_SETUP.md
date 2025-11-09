# MongoDB Backend Setup Guide

## Overview

This guide provides step-by-step instructions to convert the JUnit Test Results Dashboard to use a MongoDB backend with a Node.js/Express API server. The solution is designed for:

- **Primary deployment:** Self-hosted on Ubuntu 24.04
- **CI/CD Integration:** Direct API access from Jenkins pipelines and GitHub Actions
- **Cloud Migration:** Easy migration path to AWS, Azure, GCP, or other cloud providers
- **Static Frontend:** Can be hosted on GitHub Pages or any static hosting service

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CI/CD Pipelines                         │
│  ┌──────────────────┐           ┌──────────────────┐           │
│  │  Jenkins         │           │  GitHub Actions  │           │
│  │  Pipeline        │           │  Workflow        │           │
│  └────────┬─────────┘           └────────┬─────────┘           │
│           │ POST /api/v1/upload          │                     │
└───────────┼──────────────────────────────┼─────────────────────┘
            │                              │
            ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend Server (Ubuntu)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Express.js API Server (Port 5000)                       │  │
│  │  - File upload endpoints                                 │  │
│  │  - Test results CRUD                                     │  │
│  │  - Statistics & analytics                                │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│                           │                                     │
│  ┌────────────────────────▼─────────────────────────────────┐  │
│  │  MongoDB Database (Port 27017)                           │  │
│  │  - test_runs, test_suites, test_cases collections       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           ▲
                           │ GET /api/v1/*
                           │
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Static Files)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Can be hosted on:                                       │  │
│  │  - Same Ubuntu server (Nginx)                            │  │
│  │  - GitHub Pages                                          │  │
│  │  - Netlify / Vercel                                      │  │
│  │  - Any static file hosting                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Ubuntu 24.04 Server Setup

### 1.1 Initial Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential build tools
sudo apt install -y build-essential curl wget git

# Install Node.js 20 LTS (recommended for production)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### 1.2 Install MongoDB 7.0

```bash
# Import MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

# Create MongoDB list file for Ubuntu 24.04
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package database
sudo apt update

# Install MongoDB
sudo apt install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod

# Test MongoDB connection
mongosh --eval 'db.runCommand({ connectionStatus: 1 })'
```

### 1.3 Configure MongoDB Security

```bash
# Connect to MongoDB shell
mongosh

# Create admin user
use admin
db.createUser({
  user: "admin",
  pwd: "YourSecureAdminPassword123!",
  roles: [ { role: "userAdminAnyDatabase", role: "root" } ]
})

# Create application database and user
use junit_test_results
db.createUser({
  user: "junit_app",
  pwd: "YourSecureAppPassword123!",
  roles: [ { role: "readWrite", db: "junit_test_results" } ]
})

exit
```

Enable authentication:
```bash
# Edit MongoDB configuration
sudo nano /etc/mongod.conf
```

Add/modify these lines:
```yaml
security:
  authorization: enabled

net:
  bindIp: 127.0.0.1  # Only allow local connections (more secure)
  port: 27017
```

Restart MongoDB:
```bash
sudo systemctl restart mongod
```

### 1.4 Install Nginx (for frontend hosting)

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify Nginx is running
sudo systemctl status nginx

# Allow HTTP/HTTPS through firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

### 1.5 Install PM2 (Process Manager for Node.js)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

---

## Part 2: Backend Application Setup

### 2.1 Create Backend Project Structure

```bash
# Create project directory
sudo mkdir -p /opt/junit-dashboard
sudo chown $USER:$USER /opt/junit-dashboard
cd /opt/junit-dashboard

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express mongoose cors multer dotenv helmet compression morgan joi
npm install crypto xml2js
npm install --save-dev nodemon
```

### 2.2 Create Project Structure

```bash
mkdir -p src/{config,models,routes,services,middleware,utils}
mkdir -p uploads logs
```

Final structure:
```
/opt/junit-dashboard/
├── src/
│   ├── config/
│   │   └── database.js
│   ├── models/
│   │   ├── TestRun.js
│   │   ├── TestSuite.js
│   │   ├── TestCase.js
│   │   ├── TestResult.js
│   │   └── FileUpload.js
│   ├── routes/
│   │   ├── upload.js
│   │   ├── runs.js
│   │   ├── cases.js
│   │   └── stats.js
│   ├── services/
│   │   ├── junitParser.js
│   │   ├── hashGenerator.js
│   │   └── flakyDetector.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── validator.js
│   ├── utils/
│   │   └── logger.js
│   └── server.js
├── uploads/
├── logs/
├── .env
├── .gitignore
├── package.json
└── ecosystem.config.js  (PM2 config)
```

### 2.3 Create Environment Configuration

Create `.env` file:
```bash
cat > .env << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# MongoDB Configuration
MONGODB_URI=mongodb://junit_app:YourSecureAppPassword123!@localhost:27017/junit_test_results?authSource=junit_test_results

# CORS Configuration (Update with your frontend URLs)
CORS_ORIGIN=http://localhost
ALLOWED_ORIGINS=http://localhost,http://your-domain.com,https://your-github-username.github.io

# File Upload Configuration
MAX_FILE_SIZE=52428800  # 50MB in bytes
MAX_FILES=20
UPLOAD_DIR=./uploads

# Logging
LOG_LEVEL=info
LOG_DIR=./logs
EOF
```

Create `.env.example` for version control:
```bash
cp .env .env.example
# Edit .env.example and replace sensitive values with placeholders
```

### 2.4 Create Configuration Files

**src/config/database.js:**
```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Create indexes on startup
        await createIndexes();

        return conn;
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

const createIndexes = async () => {
    try {
        const db = mongoose.connection.db;

        // test_runs indexes
        await db.collection('test_runs').createIndex({ timestamp: -1 });
        await db.collection('test_runs').createIndex({ content_hash: 1 }, { unique: true });
        await db.collection('test_runs').createIndex({ 'ci_metadata.build_id': 1 });
        await db.collection('test_runs').createIndex({ 'ci_metadata.commit_sha': 1 });
        await db.collection('test_runs').createIndex({ 'ci_metadata.branch': 1 });

        // test_suites indexes
        await db.collection('test_suites').createIndex({ run_id: 1 });
        await db.collection('test_suites').createIndex({ timestamp: -1 });

        // test_cases indexes
        await db.collection('test_cases').createIndex({ run_id: 1 });
        await db.collection('test_cases').createIndex({ suite_id: 1 });
        await db.collection('test_cases').createIndex({ status: 1 });
        await db.collection('test_cases').createIndex({ name: 1, classname: 1 });
        await db.collection('test_cases').createIndex({ is_flaky: 1 });
        await db.collection('test_cases').createIndex({ name: 'text', classname: 'text' });

        // test_results indexes
        await db.collection('test_results').createIndex({ case_id: 1 });
        await db.collection('test_results').createIndex({ run_id: 1 });
        await db.collection('test_results').createIndex({ timestamp: -1 });

        // file_uploads indexes
        await db.collection('file_uploads').createIndex({ content_hash: 1 }, { unique: true, sparse: true });
        await db.collection('file_uploads').createIndex({ upload_timestamp: -1 });

        console.log('Database indexes created successfully');
    } catch (error) {
        console.error('Error creating indexes:', error.message);
    }
};

module.exports = { connectDB };
```

**src/utils/logger.js:**
```javascript
const fs = require('fs');
const path = require('path');

const logDir = process.env.LOG_DIR || './logs';

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const log = (level, message, meta = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        message,
        ...meta
    };

    // Console output
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);

    // File output
    const logFile = path.join(logDir, `${level}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
};

module.exports = {
    info: (message, meta) => log('info', message, meta),
    error: (message, meta) => log('error', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    debug: (message, meta) => log('debug', message, meta)
};
```

### 2.5 Create Mongoose Models

**src/models/TestRun.js:**
```javascript
const mongoose = require('mongoose');

const testRunSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now
    },
    time: {
        type: Number,
        default: 0
    },
    total_tests: {
        type: Number,
        default: 0
    },
    total_failures: {
        type: Number,
        default: 0
    },
    total_errors: {
        type: Number,
        default: 0
    },
    total_skipped: {
        type: Number,
        default: 0
    },
    content_hash: {
        type: String,
        unique: true,
        sparse: true
    },
    file_upload_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FileUpload'
    },
    source: {
        type: String,
        enum: ['manual_upload', 'ci_cd', 'api'],
        default: 'api'
    },
    ci_metadata: {
        provider: String,
        build_id: String,
        commit_sha: String,
        branch: String,
        repository: String,
        build_url: String,
        job_name: String
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('TestRun', testRunSchema);
```

**src/models/TestSuite.js:**
```javascript
const mongoose = require('mongoose');

const testSuiteSchema = new mongoose.Schema({
    run_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestRun',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    classname: String,
    timestamp: {
        type: Date,
        default: Date.now
    },
    time: {
        type: Number,
        default: 0
    },
    tests: {
        type: Number,
        default: 0
    },
    failures: {
        type: Number,
        default: 0
    },
    errors: {
        type: Number,
        default: 0
    },
    skipped: {
        type: Number,
        default: 0
    },
    hostname: String,
    file_upload_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FileUpload'
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('TestSuite', testSuiteSchema);
```

**src/models/TestCase.js:**
```javascript
const mongoose = require('mongoose');

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
    classname: String,
    time: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['passed', 'failed', 'error', 'skipped'],
        required: true
    },
    assertions: Number,
    file: String,
    line: Number,
    system_out: String,
    system_err: String,
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
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('TestCase', testCaseSchema);
```

**src/models/TestResult.js:**
```javascript
const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
    case_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestCase',
        required: true
    },
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
    status: {
        type: String,
        enum: ['passed', 'failed', 'error', 'skipped'],
        required: true
    },
    time: Number,
    failure_message: String,
    failure_type: String,
    error_message: String,
    error_type: String,
    skipped_message: String,
    system_out: String,
    system_err: String,
    stack_trace: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'created_at' }
});

module.exports = mongoose.model('TestResult', testResultSchema);
```

**src/models/FileUpload.js:**
```javascript
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
```

### 2.6 Create Service Files

**src/services/hashGenerator.js:**
```javascript
const crypto = require('crypto');

const generateHash = (content) => {
    return crypto.createHash('sha256').update(content).digest('hex');
};

module.exports = { generateHash };
```

**src/services/junitParser.js:**
```javascript
const xml2js = require('xml2js');
const TestRun = require('../models/TestRun');
const TestSuite = require('../models/TestSuite');
const TestCase = require('../models/TestCase');
const TestResult = require('../models/TestResult');
const FileUpload = require('../models/FileUpload');
const { generateHash } = require('./hashGenerator');
const logger = require('../utils/logger');

const parseJUnitXML = async (xmlContent, filename, ciMetadata = null, uploaderInfo = {}) => {
    try {
        const parser = new xml2js.Parser({
            explicitArray: false,
            mergeAttrs: true,
            trim: true
        });

        const result = await parser.parseStringPromise(xmlContent);

        // Generate content hash for duplicate detection
        const contentHash = generateHash(xmlContent);

        // Check for duplicate
        const existingUpload = await FileUpload.findOne({ content_hash: contentHash, status: 'completed' });
        if (existingUpload) {
            logger.warn('Duplicate test results detected', { filename, contentHash });
            return {
                success: false,
                error: 'Duplicate test results',
                run_id: existingUpload.run_id
            };
        }

        // Create file upload record
        const fileUpload = await FileUpload.create({
            filename,
            file_size: xmlContent.length,
            content_hash: contentHash,
            status: 'processing',
            uploader: uploaderInfo
        });

        // Parse test data
        let testsuites = result.testsuites || result.testsuite;
        if (!testsuites) {
            throw new Error('Invalid JUnit XML format');
        }

        // Handle both <testsuites> and <testsuite> root elements
        if (!Array.isArray(testsuites)) {
            testsuites = [testsuites];
        }

        let testRun;

        for (const suiteElement of testsuites) {
            if (!testRun) {
                // Create test run
                testRun = await TestRun.create({
                    name: suiteElement.name || filename,
                    timestamp: suiteElement.timestamp || new Date(),
                    time: parseFloat(suiteElement.time || 0),
                    total_tests: parseInt(suiteElement.tests || 0),
                    total_failures: parseInt(suiteElement.failures || 0),
                    total_errors: parseInt(suiteElement.errors || 0),
                    total_skipped: parseInt(suiteElement.skipped || 0),
                    file_upload_id: fileUpload._id,
                    content_hash: contentHash,
                    source: ciMetadata ? 'ci_cd' : 'api',
                    ci_metadata: ciMetadata
                });

                logger.info('Test run created', { run_id: testRun._id, name: testRun.name });
            }

            // Process test suites
            let suites = suiteElement.testsuite || [suiteElement];
            if (!Array.isArray(suites)) {
                suites = [suites];
            }

            for (const suite of suites) {
                await processTestSuite(suite, testRun._id, fileUpload._id);
            }
        }

        // Update file upload status
        await FileUpload.findByIdAndUpdate(fileUpload._id, {
            status: 'completed',
            run_id: testRun._id
        });

        // Calculate statistics
        const stats = await calculateStats(testRun._id);

        logger.info('JUnit XML parsed successfully', { run_id: testRun._id, stats });

        return {
            success: true,
            run_id: testRun._id,
            file_upload_id: fileUpload._id,
            stats
        };

    } catch (error) {
        logger.error('Error parsing JUnit XML', { error: error.message });
        throw error;
    }
};

const processTestSuite = async (suiteData, runId, fileUploadId) => {
    const testSuite = await TestSuite.create({
        run_id: runId,
        name: suiteData.name || 'Unnamed Suite',
        classname: suiteData.classname || '',
        timestamp: suiteData.timestamp || new Date(),
        time: parseFloat(suiteData.time || 0),
        tests: parseInt(suiteData.tests || 0),
        failures: parseInt(suiteData.failures || 0),
        errors: parseInt(suiteData.errors || 0),
        skipped: parseInt(suiteData.skipped || 0),
        hostname: suiteData.hostname || '',
        file_upload_id: fileUploadId
    });

    // Process test cases
    let testcases = suiteData.testcase;
    if (testcases) {
        if (!Array.isArray(testcases)) {
            testcases = [testcases];
        }

        for (const testcase of testcases) {
            await processTestCase(testcase, testSuite._id, runId, fileUploadId);
        }
    }
};

const processTestCase = async (caseData, suiteId, runId, fileUploadId) => {
    let status = 'passed';
    let failureMessage = null;
    let failureType = null;
    let errorMessage = null;
    let errorType = null;
    let skippedMessage = null;
    let stackTrace = null;

    // Determine status
    if (caseData.failure) {
        status = 'failed';
        const failure = caseData.failure;
        failureMessage = failure.message || failure._ || '';
        failureType = failure.type || '';
        stackTrace = failure._ || failure.message || '';
    } else if (caseData.error) {
        status = 'error';
        const error = caseData.error;
        errorMessage = error.message || error._ || '';
        errorType = error.type || '';
        stackTrace = error._ || error.message || '';
    } else if (caseData.skipped !== undefined) {
        status = 'skipped';
        skippedMessage = typeof caseData.skipped === 'string' ? caseData.skipped :
                         (caseData.skipped.message || '');
    }

    // Create test case
    const testCase = await TestCase.create({
        suite_id: suiteId,
        run_id: runId,
        name: caseData.name || 'Unnamed Test',
        classname: caseData.classname || '',
        time: parseFloat(caseData.time || 0),
        status,
        assertions: parseInt(caseData.assertions || 0),
        file: caseData.file || '',
        line: parseInt(caseData.line || 0),
        system_out: caseData['system-out'] || '',
        system_err: caseData['system-err'] || '',
        file_upload_id: fileUploadId
    });

    // Create test result
    await TestResult.create({
        case_id: testCase._id,
        suite_id: suiteId,
        run_id: runId,
        status,
        time: testCase.time,
        failure_message: failureMessage,
        failure_type: failureType,
        error_message: errorMessage,
        error_type: errorType,
        skipped_message: skippedMessage,
        system_out: testCase.system_out,
        system_err: testCase.system_err,
        stack_trace: stackTrace,
        timestamp: new Date()
    });
};

const calculateStats = async (runId) => {
    const cases = await TestCase.find({ run_id: runId });

    return {
        total_tests: cases.length,
        passed: cases.filter(c => c.status === 'passed').length,
        failed: cases.filter(c => c.status === 'failed').length,
        errors: cases.filter(c => c.status === 'error').length,
        skipped: cases.filter(c => c.status === 'skipped').length,
        total_time: cases.reduce((sum, c) => sum + c.time, 0)
    };
};

module.exports = { parseJUnitXML };
```

**src/services/flakyDetector.js:**
```javascript
const TestCase = require('../models/TestCase');
const logger = require('../utils/logger');

const detectFlakyTests = async (runId) => {
    try {
        const testCases = await TestCase.find({
            run_id: runId,
            status: { $in: ['failed', 'error'] }
        });

        for (const testCase of testCases) {
            // Get historical results for this test
            const history = await TestCase.find({
                name: testCase.name,
                classname: testCase.classname
            }).sort({ created_at: -1 }).limit(10);

            if (history.length >= 3) {
                const statuses = history.map(h => h.status);
                const hasPassed = statuses.includes('passed');
                const hasFailed = statuses.includes('failed') || statuses.includes('error');

                // If test has both passed and failed in recent history, mark as flaky
                if (hasPassed && hasFailed) {
                    await TestCase.findByIdAndUpdate(testCase._id, {
                        is_flaky: true,
                        flaky_detected_at: new Date()
                    });

                    logger.info('Flaky test detected', {
                        test_name: testCase.name,
                        classname: testCase.classname
                    });
                }
            }
        }
    } catch (error) {
        logger.error('Error detecting flaky tests', { error: error.message });
    }
};

module.exports = { detectFlakyTests };
```

### 2.7 Create Middleware

**src/middleware/errorHandler.js:**
```javascript
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    logger.error('Error occurred', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
    });

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;
```

**src/middleware/validator.js:**
```javascript
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
```

### 2.8 Create API Routes

**src/routes/upload.js:**
```javascript
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
```

**src/routes/runs.js:**
```javascript
const express = require('express');
const router = express.Router();
const TestRun = require('../models/TestRun');
const TestSuite = require('../models/TestSuite');
const TestCase = require('../models/TestCase');

// GET /api/v1/runs - Get all test runs with pagination
router.get('/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const query = {};

        // Filters
        if (req.query.branch) {
            query['ci_metadata.branch'] = req.query.branch;
        }
        if (req.query.from_date) {
            query.timestamp = { $gte: new Date(req.query.from_date) };
        }
        if (req.query.to_date) {
            query.timestamp = { ...query.timestamp, $lte: new Date(req.query.to_date) };
        }

        const total = await TestRun.countDocuments(query);
        const runs = await TestRun.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        res.json({
            success: true,
            data: {
                runs,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/v1/runs/:id - Get specific test run with suites
router.get('/:id', async (req, res, next) => {
    try {
        const run = await TestRun.findById(req.params.id).lean();

        if (!run) {
            return res.status(404).json({
                success: false,
                error: 'Test run not found'
            });
        }

        const suites = await TestSuite.find({ run_id: req.params.id }).lean();

        res.json({
            success: true,
            data: {
                ...run,
                suites
            }
        });

    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/runs/:id - Delete test run and all related data
router.delete('/:id', async (req, res, next) => {
    try {
        const session = await TestRun.startSession();
        session.startTransaction();

        try {
            // Delete all related data
            await TestCase.deleteMany({ run_id: req.params.id }, { session });
            await TestSuite.deleteMany({ run_id: req.params.id }, { session });
            await TestRun.findByIdAndDelete(req.params.id, { session });

            await session.commitTransaction();

            res.json({
                success: true,
                message: 'Test run deleted successfully'
            });

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

    } catch (error) {
        next(error);
    }
});

module.exports = router;
```

**src/routes/cases.js:**
```javascript
const express = require('express');
const router = express.Router();
const TestCase = require('../models/TestCase');
const TestResult = require('../models/TestResult');

// GET /api/v1/cases - Get test cases with filtering
router.get('/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const query = {};

        // Filters
        if (req.query.run_id) query.run_id = req.query.run_id;
        if (req.query.suite_id) query.suite_id = req.query.suite_id;
        if (req.query.status) query.status = req.query.status;
        if (req.query.is_flaky) query.is_flaky = req.query.is_flaky === 'true';

        // Text search
        if (req.query.search) {
            query.$text = { $search: req.query.search };
        }

        const total = await TestCase.countDocuments(query);
        const cases = await TestCase.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        res.json({
            success: true,
            data: {
                cases,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/v1/cases/:id - Get specific test case with result
router.get('/:id', async (req, res, next) => {
    try {
        const testCase = await TestCase.findById(req.params.id).lean();

        if (!testCase) {
            return res.status(404).json({
                success: false,
                error: 'Test case not found'
            });
        }

        const result = await TestResult.findOne({ case_id: req.params.id }).lean();

        res.json({
            success: true,
            data: {
                ...testCase,
                result
            }
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/v1/cases/:id/history - Get test case execution history
router.get('/:id/history', async (req, res, next) => {
    try {
        const testCase = await TestCase.findById(req.params.id);

        if (!testCase) {
            return res.status(404).json({
                success: false,
                error: 'Test case not found'
            });
        }

        const history = await TestCase.find({
            name: testCase.name,
            classname: testCase.classname
        })
        .sort({ created_at: -1 })
        .limit(20)
        .lean();

        res.json({
            success: true,
            data: history
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
```

**src/routes/stats.js:**
```javascript
const express = require('express');
const router = express.Router();
const TestRun = require('../models/TestRun');
const TestCase = require('../models/TestCase');

// GET /api/v1/stats/overview - Get overall statistics
router.get('/overview', async (req, res, next) => {
    try {
        const query = {};

        if (req.query.from_date) {
            query.created_at = { $gte: new Date(req.query.from_date) };
        }
        if (req.query.to_date) {
            query.created_at = { ...query.created_at, $lte: new Date(req.query.to_date) };
        }

        const totalRuns = await TestRun.countDocuments(query);
        const cases = await TestCase.find(query);

        const stats = {
            total_runs: totalRuns,
            total_tests: cases.length,
            total_passed: cases.filter(c => c.status === 'passed').length,
            total_failed: cases.filter(c => c.status === 'failed').length,
            total_errors: cases.filter(c => c.status === 'error').length,
            total_skipped: cases.filter(c => c.status === 'skipped').length,
            flaky_tests_count: cases.filter(c => c.is_flaky).length,
            average_duration: cases.reduce((sum, c) => sum + c.time, 0) / cases.length || 0
        };

        stats.success_rate = stats.total_tests > 0
            ? ((stats.total_passed / stats.total_tests) * 100).toFixed(2)
            : 0;

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/v1/stats/trends - Get test execution trends
router.get('/trends', async (req, res, next) => {
    try {
        const runs = await TestRun.find()
            .sort({ timestamp: 1 })
            .limit(30)
            .lean();

        const trends = [];

        for (const run of runs) {
            const cases = await TestCase.find({ run_id: run._id });

            trends.push({
                date: run.timestamp,
                run_id: run._id,
                total_tests: cases.length,
                passed: cases.filter(c => c.status === 'passed').length,
                failed: cases.filter(c => c.status === 'failed').length,
                errors: cases.filter(c => c.status === 'error').length,
                skipped: cases.filter(c => c.status === 'skipped').length,
                success_rate: cases.length > 0
                    ? ((cases.filter(c => c.status === 'passed').length / cases.length) * 100).toFixed(2)
                    : 0
            });
        }

        res.json({
            success: true,
            data: trends
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/v1/stats/flaky-tests - Get flaky tests
router.get('/flaky-tests', async (req, res, next) => {
    try {
        const flakyTests = await TestCase.aggregate([
            { $match: { is_flaky: true } },
            {
                $group: {
                    _id: { name: '$name', classname: '$classname' },
                    failure_count: {
                        $sum: {
                            $cond: [
                                { $in: ['$status', ['failed', 'error']] },
                                1,
                                0
                            ]
                        }
                    },
                    total_runs: { $sum: 1 },
                    last_failed: { $max: '$created_at' }
                }
            },
            {
                $project: {
                    name: '$_id.name',
                    classname: '$_id.classname',
                    failure_count: 1,
                    total_runs: 1,
                    failure_rate: {
                        $multiply: [
                            { $divide: ['$failure_count', '$total_runs'] },
                            100
                        ]
                    },
                    last_failed: 1
                }
            },
            { $sort: { failure_rate: -1 } }
        ]);

        res.json({
            success: true,
            data: flakyTests
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
```

### 2.9 Create Main Server File

**src/server.js:**
```javascript
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

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS.split(','),
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', {
        stream: {
            write: (message) => logger.info(message.trim())
        }
    }));
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
```

### 2.10 Update package.json

```bash
cat > package.json << 'EOF'
{
  "name": "junit-dashboard-backend",
  "version": "1.0.0",
  "description": "Backend API for JUnit Test Results Dashboard",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "echo \"Tests not yet implemented\" && exit 0"
  },
  "keywords": ["junit", "testing", "dashboard", "ci-cd"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.3",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "dotenv": "^16.3.1",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "morgan": "^1.10.0",
    "joi": "^17.11.0",
    "xml2js": "^0.6.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
EOF
```

### 2.11 Create PM2 Configuration

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'junit-dashboard-api',
    script: './src/server.js',
    instances: 2,  // Use 2 CPU cores, or 'max' for all cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    time: true
  }]
};
```

### 2.12 Create .gitignore

```bash
cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# Environment variables
.env

# Logs
logs/
*.log
npm-debug.log*

# Uploads
uploads/
*.xml

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
EOF
```

### 2.13 Start the Backend

```bash
# Install dependencies
cd /opt/junit-dashboard
npm install

# Test the server in development mode
npm run dev

# If working, start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# View logs
pm2 logs junit-dashboard-api

# Monitor
pm2 monit
```

---

## Part 3: CI/CD Integration

### 3.1 Jenkins Pipeline Integration

Create `Jenkinsfile` in your project repository:

```groovy
pipeline {
    agent any

    environment {
        JUNIT_API_URL = 'http://your-ubuntu-server:5000/api/v1/upload'
        // Or use Jenkins credentials for authentication
    }

    stages {
        stage('Build') {
            steps {
                // Your build steps
                sh 'mvn clean install'
            }
        }

        stage('Test') {
            steps {
                // Run tests and generate JUnit XML
                sh 'mvn test'
            }
        }

        stage('Upload Test Results') {
            steps {
                script {
                    // Find all JUnit XML files
                    def testResults = findFiles(glob: '**/target/surefire-reports/*.xml')

                    testResults.each { file ->
                        // Prepare CI metadata
                        def ciMetadata = """
                        {
                            "provider": "jenkins",
                            "build_id": "${env.BUILD_ID}",
                            "build_url": "${env.BUILD_URL}",
                            "job_name": "${env.JOB_NAME}",
                            "commit_sha": "${env.GIT_COMMIT}",
                            "branch": "${env.GIT_BRANCH}",
                            "repository": "${env.GIT_URL}"
                        }
                        """

                        // Upload to dashboard
                        sh """
                            curl -X POST ${JUNIT_API_URL} \\
                                -F "file=@${file.path}" \\
                                -F "ci_metadata=${ciMetadata}"
                        """
                    }
                }
            }
        }
    }

    post {
        always {
            // Clean workspace
            cleanWs()
        }
    }
}
```

**Alternative: Groovy Script for Multiple Files**

```groovy
stage('Upload Test Results') {
    steps {
        script {
            sh '''
                # Create a temporary file for CI metadata
                cat > /tmp/ci_metadata.json << EOF
{
    "provider": "jenkins",
    "build_id": "''' + env.BUILD_ID + '''",
    "build_url": "''' + env.BUILD_URL + '''",
    "job_name": "''' + env.JOB_NAME + '''",
    "commit_sha": "''' + env.GIT_COMMIT + '''",
    "branch": "''' + env.GIT_BRANCH + '''",
    "repository": "''' + env.GIT_URL + '''"
}
EOF

                # Find and upload all JUnit XML files
                find . -name "*.xml" -path "*/surefire-reports/*" | while read xmlfile; do
                    echo "Uploading $xmlfile..."
                    curl -X POST ''' + env.JUNIT_API_URL + ''' \
                        -F "file=@$xmlfile" \
                        -F "ci_metadata=<file:///tmp/ci_metadata.json" \
                        --fail --silent --show-error
                done
            '''
        }
    }
}
```

### 3.2 GitHub Actions Integration

Create `.github/workflows/test-and-upload.yml`:

```yaml
name: Run Tests and Upload Results

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Run tests
        run: mvn clean test

      - name: Upload test results to dashboard
        if: always()  # Run even if tests fail
        env:
          JUNIT_API_URL: ${{ secrets.JUNIT_API_URL }}
        run: |
          # Find all JUnit XML files
          find . -name "*.xml" -path "*/surefire-reports/*" | while read xmlfile; do
            echo "Uploading $xmlfile..."

            # Prepare CI metadata JSON
            CI_METADATA=$(cat <<EOF
          {
            "provider": "github_actions",
            "build_id": "${{ github.run_id }}",
            "build_url": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}",
            "job_name": "${{ github.workflow }}",
            "commit_sha": "${{ github.sha }}",
            "branch": "${{ github.ref_name }}",
            "repository": "${{ github.repository }}"
          }
          EOF
          )

            # Upload to dashboard API
            curl -X POST "${JUNIT_API_URL}/api/v1/upload" \
              -F "file=@$xmlfile" \
              -F "ci_metadata=${CI_METADATA}" \
              --fail --silent --show-error || echo "Failed to upload $xmlfile"
          done

      - name: Archive test results (optional backup)
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: junit-test-results
          path: '**/surefire-reports/*.xml'
```

**Simplified version using action:**

```yaml
      - name: Upload test results
        if: always()
        run: |
          curl -X POST ${{ secrets.JUNIT_API_URL }}/api/v1/upload/batch \
            -F "files=@target/surefire-reports/TEST-*.xml" \
            -F 'ci_metadata={"provider":"github_actions","build_id":"${{ github.run_id }}","commit_sha":"${{ github.sha }}","branch":"${{ github.ref_name }}"}'
```

**Store API URL in GitHub Secrets:**
1. Go to your repository → Settings → Secrets and variables → Actions
2. Add new repository secret:
   - Name: `JUNIT_API_URL`
   - Value: `http://your-ubuntu-server:5000`

### 3.3 GitLab CI Integration

Create `.gitlab-ci.yml`:

```yaml
stages:
  - test
  - upload

test:
  stage: test
  image: maven:3.9-openjdk-17
  script:
    - mvn clean test
  artifacts:
    when: always
    paths:
      - target/surefire-reports/*.xml
    expire_in: 1 week

upload_test_results:
  stage: upload
  image: curlimages/curl:latest
  when: always
  dependencies:
    - test
  script:
    - |
      for xmlfile in target/surefire-reports/*.xml; do
        echo "Uploading $xmlfile..."

        curl -X POST "${JUNIT_API_URL}/api/v1/upload" \
          -F "file=@$xmlfile" \
          -F "ci_metadata={
            \"provider\": \"gitlab\",
            \"build_id\": \"${CI_PIPELINE_ID}\",
            \"build_url\": \"${CI_PIPELINE_URL}\",
            \"job_name\": \"${CI_JOB_NAME}\",
            \"commit_sha\": \"${CI_COMMIT_SHA}\",
            \"branch\": \"${CI_COMMIT_REF_NAME}\",
            \"repository\": \"${CI_PROJECT_URL}\"
          }" \
          --fail --silent --show-error
      done
  variables:
    JUNIT_API_URL: "http://your-ubuntu-server:5000"
```

### 3.4 Bash Script for Manual Uploads

Create `upload-test-results.sh`:

```bash
#!/bin/bash

# Configuration
API_URL="${JUNIT_API_URL:-http://localhost:5000/api/v1/upload}"
RESULTS_DIR="${1:-./target/surefire-reports}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Uploading JUnit test results from: $RESULTS_DIR"
echo "API URL: $API_URL"
echo ""

# Check if directory exists
if [ ! -d "$RESULTS_DIR" ]; then
    echo -e "${RED}Error: Directory $RESULTS_DIR not found${NC}"
    exit 1
fi

# Find and upload all XML files
count=0
success=0
failed=0

for xmlfile in "$RESULTS_DIR"/*.xml; do
    if [ -f "$xmlfile" ]; then
        count=$((count + 1))
        filename=$(basename "$xmlfile")

        echo "Uploading: $filename..."

        response=$(curl -X POST "$API_URL" \
            -F "file=@$xmlfile" \
            -F "ci_metadata={\"provider\":\"manual\",\"source\":\"bash_script\"}" \
            --silent --write-out "\n%{http_code}")

        http_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | sed '$d')

        if [ "$http_code" -eq 201 ] || [ "$http_code" -eq 200 ]; then
            echo -e "${GREEN}✓ Success${NC}"
            success=$((success + 1))
        else
            echo -e "${RED}✗ Failed (HTTP $http_code)${NC}"
            echo "$body"
            failed=$((failed + 1))
        fi
        echo ""
    fi
done

echo "========================================"
echo "Upload Summary:"
echo "  Total files: $count"
echo -e "  ${GREEN}Successful: $success${NC}"
echo -e "  ${RED}Failed: $failed${NC}"
echo "========================================"

if [ $failed -gt 0 ]; then
    exit 1
fi
```

Make executable:
```bash
chmod +x upload-test-results.sh
```

Usage:
```bash
# Upload from default directory
./upload-test-results.sh

# Upload from specific directory
./upload-test-results.sh /path/to/test-results

# With custom API URL
JUNIT_API_URL=http://your-server:5000/api/v1/upload ./upload-test-results.sh
```

---

## Part 4: Frontend Deployment

### 4.1 Update Frontend for API Backend

Create `frontend/api-client.js`:

```javascript
class JUnitAPIClient {
    constructor() {
        // Auto-detect API URL based on environment
        this.baseURL = this.detectAPIURL();
        console.log('API Base URL:', this.baseURL);
    }

    detectAPIURL() {
        // Check if environment variable is set (for build-time configuration)
        if (typeof JUNIT_API_URL !== 'undefined') {
            return JUNIT_API_URL;
        }

        // Development: Use localhost
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:5000/api/v1';
        }

        // Production: Same host, different port
        // Adjust this based on your deployment strategy
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;

        // If frontend is on GitHub Pages, use your Ubuntu server
        if (hostname.includes('github.io')) {
            return 'http://your-ubuntu-server-ip:5000/api/v1';
        }

        // If frontend and backend are on same server
        return `${protocol}//${hostname}:5000/api/v1`;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers
                }
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Upload file
    async uploadFile(file, ciMetadata = null) {
        const formData = new FormData();
        formData.append('file', file);

        if (ciMetadata) {
            formData.append('ci_metadata', JSON.stringify(ciMetadata));
        }

        return this.request('/upload', {
            method: 'POST',
            body: formData
        });
    }

    // Get test runs
    async getTestRuns(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/runs?${queryString}`);
    }

    // Get specific test run
    async getTestRun(runId) {
        return this.request(`/runs/${runId}`);
    }

    // Get test cases
    async getTestCases(filters = {}) {
        const queryString = new URLSearchParams(filters).toString();
        return this.request(`/cases?${queryString}`);
    }

    // Get test case details
    async getTestCase(caseId) {
        return this.request(`/cases/${caseId}`);
    }

    // Get test case history
    async getTestCaseHistory(caseId) {
        return this.request(`/cases/${caseId}/history`);
    }

    // Get statistics
    async getStatistics(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/stats/overview?${queryString}`);
    }

    // Get trends
    async getTrends(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/stats/trends?${queryString}`);
    }

    // Get flaky tests
    async getFlakyTests() {
        return this.request('/stats/flaky-tests');
    }

    // Delete test run
    async deleteTestRun(runId) {
        return this.request(`/runs/${runId}`, {
            method: 'DELETE'
        });
    }

    // Health check
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL.replace('/api/v1', '')}/health`);
            return response.ok;
        } catch {
            return false;
        }
    }
}

window.JUnitAPIClient = JUnitAPIClient;
```

### 4.2 Update index.html

Replace the database.js script with api-client.js:

```html
<!-- OLD -->
<script src="database.js"></script>

<!-- NEW -->
<script src="api-client.js"></script>
```

### 4.3 Update main.js

Replace database initialization with API client:

```javascript
// At the top of JUnitDashboard class
constructor() {
    // OLD:
    // this.db = new JUnitDatabase();

    // NEW:
    this.api = new JUnitAPIClient();

    this.currentFilters = {
        status: 'all',
        search: '',
        dateRange: null,
        runId: null
    };
    this.charts = {};
    this.init();
}

async init() {
    try {
        // OLD:
        // await this.db.initializeDatabase();

        // NEW:
        const isHealthy = await this.api.healthCheck();
        if (!isHealthy) {
            this.showError('Cannot connect to API server');
            return;
        }

        this.setupEventListeners();
        this.loadDashboard();
        this.initializeAnimations();
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        this.showError('Failed to initialize application. Please refresh the page.');
    }
}

// Update all database calls to API calls
async loadDashboard() {
    try {
        // OLD:
        // const runs = await this.db.getTestRuns(50, 0);

        // NEW:
        const response = await this.api.getTestRuns({ limit: 50, page: 1 });
        const runs = response.data.runs;

        this.renderTestRuns(runs);
        await this.loadStatistics();
        await this.loadCharts();
    } catch (error) {
        this.showError('Failed to load dashboard data');
    }
}

async processFiles(files) {
    const xmlFiles = files.filter(file => file.name.endsWith('.xml'));

    for (const file of xmlFiles) {
        try {
            // OLD:
            // const reader = new FileReader();
            // reader.onload = async (e) => {
            //     await this.db.parseAndStoreJUnitXML(e.target.result, file.name);
            // };
            // reader.readAsText(file);

            // NEW:
            const result = await this.api.uploadFile(file);
            this.showSuccess(`Uploaded: ${file.name}`);
            this.loadDashboard(); // Refresh dashboard
        } catch (error) {
            this.showError(`Failed to upload ${file.name}: ${error.message}`);
        }
    }
}
```

### 4.4 Deploy Frontend

**Option 1: Same Ubuntu Server (with Nginx)**

```bash
# Copy frontend files to web directory
sudo mkdir -p /var/www/junit-dashboard
sudo chown $USER:$USER /var/www/junit-dashboard

# Copy files
cp -r index.html details.html reports.html *.js resources/ /var/www/junit-dashboard/

# Configure Nginx
sudo nano /etc/nginx/sites-available/junit-dashboard
```

Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # or use IP address

    # Frontend static files
    location / {
        root /var/www/junit-dashboard;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:5000/health;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/junit-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Option 2: GitHub Pages**

1. Create a new repository or use existing one
2. Add frontend files to repository
3. Update `api-client.js` with your Ubuntu server URL:

```javascript
detectAPIURL() {
    if (window.location.hostname.includes('github.io')) {
        return 'http://your-ubuntu-server-ip:5000/api/v1';
    }
    // ... rest of code
}
```

4. Enable GitHub Pages in repository settings
5. Push changes

```bash
git init
git add .
git commit -m "Deploy JUnit Dashboard frontend"
git branch -M main
git remote add origin https://github.com/your-username/junit-dashboard.git
git push -u origin main
```

6. Access at: `https://your-username.github.io/junit-dashboard/`

**Option 3: Netlify/Vercel**

1. Create `netlify.toml` or `vercel.json`:

```toml
# netlify.toml
[build]
  publish = "."

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

2. Deploy via CLI or connect Git repository

---

## Part 5: Cloud Migration Strategy

### 5.1 Architecture for Cloud Migration

The application is designed to easily migrate to cloud services:

```
Current (Ubuntu):
┌─────────────────────────────────┐
│  Ubuntu Server                  │
│  ├── MongoDB (local)            │
│  ├── Node.js API (PM2)          │
│  └── Nginx (frontend)           │
└─────────────────────────────────┘

Cloud Migration Option 1 (AWS):
┌─────────────────────────────────┐
│  Amazon Web Services            │
│  ├── MongoDB Atlas (managed)    │
│  ├── Elastic Beanstalk (API)    │
│  └── S3 + CloudFront (frontend) │
└─────────────────────────────────┘

Cloud Migration Option 2 (Docker):
┌─────────────────────────────────┐
│  Any Cloud Provider             │
│  ├── Docker Container (MongoDB) │
│  ├── Docker Container (API)     │
│  └── Static Hosting (frontend)  │
└─────────────────────────────────┘
```

### 5.2 Dockerize the Application

Create `Dockerfile` for backend:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY src/ ./src/

# Create directories
RUN mkdir -p uploads logs

# Expose port
EXPOSE 5000

# Start application
CMD ["node", "src/server.js"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: junit-mongodb
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGODB_PASSWORD}
      MONGO_INITDB_DATABASE: junit_test_results
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"
    networks:
      - junit-network

  backend:
    build: .
    container_name: junit-backend
    restart: always
    environment:
      NODE_ENV: production
      PORT: 5000
      MONGODB_URI: mongodb://admin:${MONGODB_PASSWORD}@mongodb:27017/junit_test_results?authSource=admin
      CORS_ORIGIN: ${CORS_ORIGIN}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
    ports:
      - "5000:5000"
    depends_on:
      - mongodb
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    networks:
      - junit-network

volumes:
  mongodb_data:

networks:
  junit-network:
    driver: bridge
```

Deploy with Docker:
```bash
docker-compose up -d
```

### 5.3 Migration Steps

**To MongoDB Atlas (Cloud Database):**

1. Create MongoDB Atlas account
2. Create cluster and get connection string
3. Update `.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/junit_test_results
```
4. Restart application

**To AWS:**

1. Deploy backend to Elastic Beanstalk
2. Use MongoDB Atlas or DocumentDB
3. Deploy frontend to S3 + CloudFront
4. Update API URLs

**To Google Cloud:**

1. Deploy backend to Cloud Run
2. Use MongoDB Atlas or Cloud MongoDB
3. Deploy frontend to Cloud Storage + CDN
4. Update API URLs

---

## Part 6: Testing and Verification

### 6.1 Test Backend API

```bash
# Health check
curl http://localhost:5000/health

# Upload test file
curl -X POST http://localhost:5000/api/v1/upload \
  -F "file=@sample-test-results.xml" \
  -F 'ci_metadata={"provider":"manual","source":"curl"}'

# Get test runs
curl http://localhost:5000/api/v1/runs

# Get statistics
curl http://localhost:5000/api/v1/stats/overview
```

### 6.2 Monitor Application

```bash
# View PM2 status
pm2 status

# View logs
pm2 logs junit-dashboard-api

# View MongoDB status
sudo systemctl status mongod

# View Nginx status
sudo systemctl status nginx

# Check disk space
df -h

# Check memory usage
free -h

# View MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

---

## Conclusion

You now have a complete self-hosted JUnit Test Results Dashboard running on Ubuntu 24.04 with:

✅ MongoDB database for persistent storage
✅ Node.js/Express REST API backend
✅ Frontend (can be hosted locally or on GitHub Pages)
✅ CI/CD integration (Jenkins, GitHub Actions, GitLab)
✅ Easy cloud migration path
✅ Production-ready with PM2 and Nginx
✅ Comprehensive monitoring and logging

The system is designed to scale and can be easily migrated to cloud services when needed.
