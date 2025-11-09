# MongoDB Migration Guide

## Overview

This guide provides a comprehensive plan to migrate the JUnit Test Results Dashboard from a client-side IndexedDB architecture to a server-based MongoDB architecture with a Node.js backend.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [MongoDB Schema Design](#mongodb-schema-design)
3. [Backend Server Setup](#backend-server-setup)
4. [API Endpoints](#api-endpoints)
5. [Frontend Modifications](#frontend-modifications)
6. [Implementation Steps](#implementation-steps)
7. [Deployment Guide](#deployment-guide)
8. [Migration from Existing Data](#migration-from-existing-data)

---

## Architecture Overview

### Current Architecture (IndexedDB)
```
┌─────────────────────┐
│   Browser Client    │
│  ┌───────────────┐  │
│  │  Frontend     │  │
│  │  HTML/CSS/JS  │  │
│  └───────┬───────┘  │
│          │          │
│  ┌───────▼───────┐  │
│  │  IndexedDB    │  │
│  │  (Client DB)  │  │
│  └───────────────┘  │
└─────────────────────┘
```

### New Architecture (MongoDB)
```
┌─────────────────────┐         ┌─────────────────────┐         ┌─────────────────────┐
│   Browser Client    │         │   Backend Server    │         │      MongoDB        │
│  ┌───────────────┐  │         │  ┌───────────────┐  │         │  ┌───────────────┐  │
│  │  Frontend     │  │  HTTP   │  │  Express.js   │  │  Driver │  │  Collections  │  │
│  │  HTML/CSS/JS  ├──┼────────►│  │  REST API     ├──┼────────►│  │  - test_runs  │  │
│  └───────────────┘  │  HTTPS  │  └───────────────┘  │         │  │  - test_cases │  │
│                     │         │                     │         │  │  - etc.       │  │
└─────────────────────┘         └─────────────────────┘         └─────────────────────┘
```

---

## MongoDB Schema Design

### Collection Structure

MongoDB will use 5 collections (similar to IndexedDB object stores):

#### 1. **test_runs** Collection
```javascript
{
  _id: ObjectId,
  name: String,                    // Test run name
  timestamp: ISODate,               // Execution timestamp
  time: Number,                     // Total execution time (seconds)
  total_tests: Number,              // Total test count
  total_failures: Number,           // Failed test count
  total_errors: Number,             // Error test count
  total_skipped: Number,            // Skipped test count
  content_hash: String,             // SHA-256 hash for duplicate detection (unique index)
  file_upload_id: ObjectId,         // Reference to file_uploads
  source: String,                   // "manual_upload" | "ci_cd"
  ci_metadata: {                    // CI/CD metadata (optional)
    provider: String,               // "jenkins" | "github_actions" | "gitlab"
    build_id: String,
    commit_sha: String,
    branch: String,
    repository: String,
    build_url: String
  },
  created_at: ISODate,
  updated_at: ISODate
}

// Indexes:
db.test_runs.createIndex({ timestamp: -1 })
db.test_runs.createIndex({ content_hash: 1 }, { unique: true })
db.test_runs.createIndex({ "ci_metadata.build_id": 1 })
db.test_runs.createIndex({ "ci_metadata.commit_sha": 1 })
db.test_runs.createIndex({ "ci_metadata.branch": 1 })
```

#### 2. **test_suites** Collection
```javascript
{
  _id: ObjectId,
  run_id: ObjectId,                 // Reference to test_runs
  name: String,                     // Suite name
  classname: String,                // Java classname or test suite identifier
  timestamp: ISODate,               // Suite execution timestamp
  time: Number,                     // Execution time (seconds)
  tests: Number,                    // Number of tests in suite
  failures: Number,                 // Failed tests in suite
  errors: Number,                   // Error tests in suite
  skipped: Number,                  // Skipped tests in suite
  hostname: String,                 // Execution hostname
  file_upload_id: ObjectId,         // Reference to file_uploads
  created_at: ISODate,
  updated_at: ISODate
}

// Indexes:
db.test_suites.createIndex({ run_id: 1 })
db.test_suites.createIndex({ classname: 1 })
db.test_suites.createIndex({ timestamp: -1 })
```

#### 3. **test_cases** Collection
```javascript
{
  _id: ObjectId,
  suite_id: ObjectId,               // Reference to test_suites
  run_id: ObjectId,                 // Reference to test_runs
  name: String,                     // Test case name
  classname: String,                // Class or module name
  time: Number,                     // Execution time (seconds)
  status: String,                   // "passed" | "failed" | "error" | "skipped"
  assertions: Number,               // Number of assertions
  file: String,                     // Source file path
  line: Number,                     // Line number in source
  system_out: String,               // Standard output
  system_err: String,               // Standard error output
  is_flaky: Boolean,                // Flaky test indicator
  flaky_detected_at: ISODate,       // When flakiness was detected
  file_upload_id: ObjectId,         // Reference to file_uploads
  created_at: ISODate,
  updated_at: ISODate
}

// Indexes:
db.test_cases.createIndex({ run_id: 1 })
db.test_cases.createIndex({ suite_id: 1 })
db.test_cases.createIndex({ status: 1 })
db.test_cases.createIndex({ name: 1, classname: 1 })  // Compound index for history queries
db.test_cases.createIndex({ is_flaky: 1 })
db.test_cases.createIndex({ created_at: -1 })
db.test_cases.createIndex({ name: "text", classname: "text" })  // Text search
```

#### 4. **test_results** Collection
```javascript
{
  _id: ObjectId,
  case_id: ObjectId,                // Reference to test_cases
  suite_id: ObjectId,               // Reference to test_suites
  run_id: ObjectId,                 // Reference to test_runs
  status: String,                   // "passed" | "failed" | "error" | "skipped"
  time: Number,                     // Execution time
  failure_message: String,          // Failure message (if failed)
  failure_type: String,             // Failure type/category
  error_message: String,            // Error message (if error)
  error_type: String,               // Error type/category
  skipped_message: String,          // Skip reason (if skipped)
  system_out: String,               // Standard output
  system_err: String,               // Standard error output
  stack_trace: String,              // Full stack trace
  timestamp: ISODate,               // Result timestamp
  created_at: ISODate
}

// Indexes:
db.test_results.createIndex({ case_id: 1 })
db.test_results.createIndex({ run_id: 1 })
db.test_results.createIndex({ status: 1 })
db.test_results.createIndex({ timestamp: -1 })
```

#### 5. **file_uploads** Collection
```javascript
{
  _id: ObjectId,
  filename: String,                 // Original filename
  upload_timestamp: ISODate,        // Upload time
  file_size: Number,                // File size in bytes
  status: String,                   // "processing" | "completed" | "failed"
  run_id: ObjectId,                 // Reference to test_runs (nullable during processing)
  content_hash: String,             // SHA-256 hash (unique index)
  xml_content: String,              // Optional: store original XML
  uploader: {                       // Optional: user/system info
    ip: String,
    user_agent: String,
    user_id: ObjectId               // If user authentication is added
  },
  error_message: String,            // If status is "failed"
  created_at: ISODate,
  updated_at: ISODate
}

// Indexes:
db.file_uploads.createIndex({ content_hash: 1 }, { unique: true })
db.file_uploads.createIndex({ upload_timestamp: -1 })
db.file_uploads.createIndex({ run_id: 1 })
db.file_uploads.createIndex({ status: 1 })
```

---

## Backend Server Setup

### Technology Stack

- **Runtime:** Node.js 18+ (LTS)
- **Framework:** Express.js 4.x
- **Database Driver:** MongoDB Node.js Driver 6.x or Mongoose 8.x
- **File Upload:** Multer
- **Validation:** Joi or Zod
- **Authentication:** JWT (optional, for future use)
- **CORS:** cors middleware
- **Logging:** Winston or Pino
- **Environment:** dotenv

### Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js           # MongoDB connection config
│   │   └── server.js             # Server configuration
│   ├── models/
│   │   ├── TestRun.js            # Mongoose model for test_runs
│   │   ├── TestSuite.js          # Mongoose model for test_suites
│   │   ├── TestCase.js           # Mongoose model for test_cases
│   │   ├── TestResult.js         # Mongoose model for test_results
│   │   └── FileUpload.js         # Mongoose model for file_uploads
│   ├── routes/
│   │   ├── upload.js             # File upload endpoints
│   │   ├── runs.js               # Test runs endpoints
│   │   ├── suites.js             # Test suites endpoints
│   │   ├── cases.js              # Test cases endpoints
│   │   └── stats.js              # Statistics endpoints
│   ├── services/
│   │   ├── junitParser.js        # JUnit XML parsing logic
│   │   ├── flakyDetector.js      # Flaky test detection
│   │   └── hashGenerator.js      # Content hash generation
│   ├── middleware/
│   │   ├── errorHandler.js       # Global error handler
│   │   ├── validator.js          # Request validation
│   │   └── logger.js             # Request logging
│   ├── utils/
│   │   ├── database.js           # Database utilities
│   │   └── helpers.js            # Helper functions
│   └── app.js                    # Express app setup
├── tests/
│   ├── unit/                     # Unit tests
│   └── integration/              # Integration tests
├── .env.example                  # Environment variables template
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

### Installation & Setup

#### 1. Install MongoDB

**On Ubuntu/Debian:**
```bash
# Import MongoDB GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update and install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

**On macOS:**
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

**On Windows:**
- Download installer from https://www.mongodb.com/try/download/community
- Run installer and follow wizard
- MongoDB runs as a Windows Service

**Using Docker:**
```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:7.0
```

#### 2. Create Backend Project

```bash
# Create project directory
mkdir junit-dashboard-backend
cd junit-dashboard-backend

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express mongoose cors multer dotenv helmet compression morgan
npm install joi crypto-js xml2js
npm install --save-dev nodemon jest supertest
```

#### 3. Configure Environment Variables

Create `.env` file:
```env
# Server Configuration
NODE_ENV=development
PORT=5000
HOST=localhost

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/junit_test_results
MONGODB_USER=
MONGODB_PASSWORD=

# CORS Configuration
CORS_ORIGIN=http://localhost:8000
ALLOWED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000

# File Upload Configuration
MAX_FILE_SIZE=10485760  # 10MB in bytes
MAX_FILES=10

# Security
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Logging
LOG_LEVEL=debug
```

---

## API Endpoints

### Base URL: `http://localhost:5000/api/v1`

### 1. File Upload Endpoints

#### **POST /upload**
Upload JUnit XML file(s)

**Request:**
```http
POST /api/v1/upload
Content-Type: multipart/form-data

{
  file: <XML file>,
  ci_metadata: {  // Optional
    provider: "jenkins",
    build_id: "123",
    commit_sha: "abc123",
    branch: "main"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "run_id": "507f1f77bcf86cd799439011",
    "file_upload_id": "507f1f77bcf86cd799439012",
    "stats": {
      "total_tests": 150,
      "passed": 145,
      "failed": 3,
      "errors": 1,
      "skipped": 1
    }
  }
}
```

#### **POST /upload/batch**
Upload multiple JUnit XML files

**Request:**
```http
POST /api/v1/upload/batch
Content-Type: multipart/form-data

{
  files: [<XML file 1>, <XML file 2>, ...]
}
```

---

### 2. Test Runs Endpoints

#### **GET /runs**
Get all test runs with pagination

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50)
- `sort` (default: "-timestamp")
- `status` (filter by status)
- `branch` (filter by branch)
- `from_date` (ISO date)
- `to_date` (ISO date)

**Response:**
```json
{
  "success": true,
  "data": {
    "runs": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Test Run",
        "timestamp": "2025-11-08T10:30:00.000Z",
        "total_tests": 150,
        "total_failures": 3,
        "total_errors": 1,
        "total_skipped": 1,
        "time": 45.2,
        "ci_metadata": {
          "branch": "main",
          "commit_sha": "abc123"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "pages": 2
    }
  }
}
```

#### **GET /runs/:id**
Get specific test run details

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Test Run",
    "timestamp": "2025-11-08T10:30:00.000Z",
    "total_tests": 150,
    "suites": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "UserServiceTests",
        "tests": 25,
        "failures": 1
      }
    ]
  }
}
```

#### **DELETE /runs/:id**
Delete a test run and all associated data

**Response:**
```json
{
  "success": true,
  "message": "Test run deleted successfully"
}
```

---

### 3. Test Cases Endpoints

#### **GET /cases**
Get test cases with filtering

**Query Parameters:**
- `run_id`
- `suite_id`
- `status` ("passed" | "failed" | "error" | "skipped")
- `search` (search in name/classname)
- `is_flaky` (boolean)
- `page`
- `limit`

**Response:**
```json
{
  "success": true,
  "data": {
    "cases": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "name": "testUserCreation",
        "classname": "com.example.UserServiceTest",
        "status": "passed",
        "time": 0.234,
        "is_flaky": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150
    }
  }
}
```

#### **GET /cases/:id**
Get specific test case details with full result

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "name": "testUserCreation",
    "classname": "com.example.UserServiceTest",
    "status": "failed",
    "time": 0.234,
    "result": {
      "failure_message": "Expected 200 but got 500",
      "failure_type": "AssertionError",
      "stack_trace": "..."
    },
    "history": [
      {
        "run_id": "...",
        "timestamp": "2025-11-07T10:30:00.000Z",
        "status": "passed"
      }
    ]
  }
}
```

#### **GET /cases/:id/history**
Get execution history for a specific test case

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "run_id": "507f1f77bcf86cd799439011",
      "timestamp": "2025-11-08T10:30:00.000Z",
      "status": "failed",
      "time": 0.234
    },
    {
      "run_id": "507f1f77bcf86cd799439010",
      "timestamp": "2025-11-07T10:30:00.000Z",
      "status": "passed",
      "time": 0.198
    }
  ]
}
```

---

### 4. Statistics Endpoints

#### **GET /stats/overview**
Get overall dashboard statistics

**Query Parameters:**
- `from_date` (ISO date)
- `to_date` (ISO date)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_runs": 100,
    "total_tests": 15000,
    "total_passed": 14500,
    "total_failed": 300,
    "total_errors": 150,
    "total_skipped": 50,
    "success_rate": 96.67,
    "average_duration": 42.5,
    "flaky_tests_count": 15
  }
}
```

#### **GET /stats/trends**
Get test execution trends over time

**Query Parameters:**
- `period` ("day" | "week" | "month")
- `from_date`
- `to_date`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-11-08",
      "total_tests": 150,
      "passed": 145,
      "failed": 3,
      "errors": 1,
      "skipped": 1,
      "success_rate": 96.67
    }
  ]
}
```

#### **GET /stats/flaky-tests**
Get list of flaky tests

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "testNetworkRequest",
      "classname": "com.example.NetworkTest",
      "failure_count": 5,
      "total_runs": 20,
      "failure_rate": 25.0,
      "last_failed": "2025-11-08T10:30:00.000Z"
    }
  ]
}
```

---

### 5. Search Endpoints

#### **GET /search**
Search across test cases

**Query Parameters:**
- `q` (search query)
- `type` ("test_name" | "class_name" | "error_message")

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "name": "testUserCreation",
        "classname": "com.example.UserServiceTest",
        "match_type": "test_name"
      }
    ]
  }
}
```

---

## Frontend Modifications

### 1. Replace `database.js` with API Client

Create new file: `api-client.js`

```javascript
class JUnitAPIClient {
    constructor(baseURL = 'http://localhost:5000/api/v1') {
        this.baseURL = baseURL;
    }

    async uploadFile(file, ciMetadata = null) {
        const formData = new FormData();
        formData.append('file', file);
        if (ciMetadata) {
            formData.append('ci_metadata', JSON.stringify(ciMetadata));
        }

        const response = await fetch(`${this.baseURL}/upload`, {
            method: 'POST',
            body: formData
        });

        return this.handleResponse(response);
    }

    async getTestRuns(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`${this.baseURL}/runs?${queryString}`);
        return this.handleResponse(response);
    }

    async getTestRun(runId) {
        const response = await fetch(`${this.baseURL}/runs/${runId}`);
        return this.handleResponse(response);
    }

    async getTestCases(filters = {}) {
        const queryString = new URLSearchParams(filters).toString();
        const response = await fetch(`${this.baseURL}/cases?${queryString}`);
        return this.handleResponse(response);
    }

    async getTestCase(caseId) {
        const response = await fetch(`${this.baseURL}/cases/${caseId}`);
        return this.handleResponse(response);
    }

    async getStatistics(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`${this.baseURL}/stats/overview?${queryString}`);
        return this.handleResponse(response);
    }

    async getTrends(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`${this.baseURL}/stats/trends?${queryString}`);
        return this.handleResponse(response);
    }

    async deleteTestRun(runId) {
        const response = await fetch(`${this.baseURL}/runs/${runId}`, {
            method: 'DELETE'
        });
        return this.handleResponse(response);
    }

    async handleResponse(response) {
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    }
}

window.JUnitAPIClient = JUnitAPIClient;
```

### 2. Update `main.js`

Replace database initialization:
```javascript
// OLD:
this.db = new JUnitDatabase();
await this.db.initializeDatabase();

// NEW:
this.api = new JUnitAPIClient();
```

Replace all database calls with API calls:
```javascript
// OLD:
const runs = await this.db.getTestRuns(50, 0);

// NEW:
const response = await this.api.getTestRuns({ limit: 50, page: 1 });
const runs = response.data.runs;
```

### 3. Update HTML Files

Add API client script before main.js:
```html
<script src="api-client.js"></script>
<script src="main.js"></script>
```

### 4. Handle Authentication (Optional)

If adding authentication in the future:
```javascript
class JUnitAPIClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.token = localStorage.getItem('auth_token');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('auth_token', token);
    }

    async fetch(url, options = {}) {
        if (this.token) {
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${this.token}`
            };
        }
        return fetch(url, options);
    }
}
```

---

## Implementation Steps

### Phase 1: Backend Setup (Week 1)

1. **Day 1-2: Project Setup**
   - [ ] Install MongoDB locally or set up cloud instance (MongoDB Atlas)
   - [ ] Create Node.js project structure
   - [ ] Install dependencies
   - [ ] Set up environment configuration

2. **Day 3-4: Database Models**
   - [ ] Create Mongoose schemas for all collections
   - [ ] Set up indexes
   - [ ] Write database initialization script

3. **Day 5-7: Core Services**
   - [ ] Implement JUnit XML parser service
   - [ ] Implement hash generation service
   - [ ] Implement flaky test detection service
   - [ ] Write unit tests

### Phase 2: API Development (Week 2)

1. **Day 1-2: Upload Endpoints**
   - [ ] Implement file upload handler
   - [ ] Implement XML parsing and storage
   - [ ] Add duplicate detection
   - [ ] Test with sample XML files

2. **Day 3-4: Query Endpoints**
   - [ ] Implement test runs endpoints
   - [ ] Implement test cases endpoints
   - [ ] Add filtering and pagination
   - [ ] Add search functionality

3. **Day 5-7: Statistics & Advanced Features**
   - [ ] Implement statistics endpoints
   - [ ] Implement trends analysis
   - [ ] Add flaky test detection
   - [ ] Write integration tests

### Phase 3: Frontend Migration (Week 3)

1. **Day 1-2: API Client**
   - [ ] Create API client wrapper
   - [ ] Implement all API methods
   - [ ] Add error handling
   - [ ] Test API connectivity

2. **Day 3-5: Frontend Updates**
   - [ ] Replace database.js with api-client.js
   - [ ] Update main.js to use API calls
   - [ ] Update all other JavaScript files
   - [ ] Test all dashboard features

3. **Day 6-7: Testing & Bug Fixes**
   - [ ] End-to-end testing
   - [ ] Fix bugs and issues
   - [ ] Performance optimization
   - [ ] Documentation updates

### Phase 4: Deployment (Week 4)

1. **Day 1-2: Backend Deployment**
   - [ ] Set up production MongoDB
   - [ ] Deploy backend to cloud (Heroku, AWS, DigitalOcean)
   - [ ] Configure environment variables
   - [ ] Set up SSL/HTTPS

2. **Day 3-4: Frontend Deployment**
   - [ ] Update API base URL to production
   - [ ] Deploy frontend to hosting service
   - [ ] Configure CORS properly
   - [ ] Test production deployment

3. **Day 5-7: Monitoring & Optimization**
   - [ ] Set up logging and monitoring
   - [ ] Add database backup strategy
   - [ ] Performance tuning
   - [ ] Documentation finalization

---

## Deployment Guide

### MongoDB Deployment Options

#### Option 1: MongoDB Atlas (Cloud - Recommended)

1. **Create Account:**
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up for free tier (512MB storage, shared cluster)

2. **Create Cluster:**
   - Choose region closest to your users
   - Select M0 (Free) or M10+ for production
   - Configure cluster name

3. **Create Database User:**
   ```
   Database Access → Add New Database User
   Username: junit_admin
   Password: <generate strong password>
   Privileges: Read and write to any database
   ```

4. **Configure Network Access:**
   ```
   Network Access → Add IP Address
   Allow access from anywhere: 0.0.0.0/0 (for development)
   Or whitelist specific IPs (for production)
   ```

5. **Get Connection String:**
   ```
   Connect → Connect your application
   Copy connection string:
   mongodb+srv://junit_admin:<password>@cluster0.xxxxx.mongodb.net/junit_test_results?retryWrites=true&w=majority
   ```

6. **Update .env:**
   ```env
   MONGODB_URI=mongodb+srv://junit_admin:<password>@cluster0.xxxxx.mongodb.net/junit_test_results?retryWrites=true&w=majority
   ```

#### Option 2: Self-Hosted MongoDB

**Using Docker Compose:**

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: junit_mongodb
    restart: always
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGODB_PASSWORD}
      MONGO_INITDB_DATABASE: junit_test_results
    volumes:
      - mongodb_data:/data/db
      - ./init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js:ro
    networks:
      - junit_network

  backend:
    build: ./backend
    container_name: junit_backend
    restart: always
    ports:
      - "5000:5000"
    environment:
      MONGODB_URI: mongodb://admin:${MONGODB_PASSWORD}@mongodb:27017/junit_test_results?authSource=admin
    depends_on:
      - mongodb
    networks:
      - junit_network

volumes:
  mongodb_data:

networks:
  junit_network:
    driver: bridge
```

Start services:
```bash
docker-compose up -d
```

### Backend Deployment Options

#### Option 1: Heroku

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create junit-dashboard-backend

# Set environment variables
heroku config:set MONGODB_URI=<your-mongodb-connection-string>
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

#### Option 2: DigitalOcean App Platform

1. Connect GitHub repository
2. Select Node.js environment
3. Set build command: `npm install`
4. Set run command: `npm start`
5. Add environment variables in dashboard
6. Deploy

#### Option 3: AWS EC2

```bash
# SSH into EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone https://github.com/your-repo/junit-dashboard-backend.git
cd junit-dashboard-backend

# Install dependencies
npm install --production

# Create .env file
nano .env
# (Add your environment variables)

# Start with PM2
pm2 start src/app.js --name junit-backend
pm2 startup
pm2 save

# Setup Nginx reverse proxy
sudo apt install nginx
sudo nano /etc/nginx/sites-available/junit-backend
```

Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Frontend Deployment

Update `api-client.js` with production URL:
```javascript
constructor(baseURL = 'https://your-backend-domain.com/api/v1') {
    this.baseURL = baseURL;
}
```

Deploy to:
- **Netlify**: Drag & drop or connect GitHub
- **Vercel**: Import repository and deploy
- **GitHub Pages**: Push to gh-pages branch
- **AWS S3 + CloudFront**: Static website hosting

---

## Migration from Existing Data

### Export from IndexedDB

Create `export-indexeddb.html`:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Export IndexedDB Data</title>
</head>
<body>
    <button onclick="exportData()">Export Data</button>
    <script src="database.js"></script>
    <script>
        async function exportData() {
            const db = new JUnitDatabase();
            await db.initializeDatabase();

            // Export all collections
            const runs = await db.getTestRuns(10000, 0);

            const exportData = {
                test_runs: [],
                test_suites: [],
                test_cases: [],
                test_results: []
            };

            // Get all data
            for (const run of runs) {
                exportData.test_runs.push(run);

                const suites = await db.getTestSuites(run.id);
                exportData.test_suites.push(...suites);

                for (const suite of suites) {
                    const cases = await db.getTestCases({ suite_id: suite.id });
                    exportData.test_cases.push(...cases);
                }
            }

            // Download as JSON
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'indexeddb-export.json';
            a.click();
        }
    </script>
</body>
</html>
```

### Import to MongoDB

Create `import-to-mongodb.js`:
```javascript
const fs = require('fs');
const mongoose = require('mongoose');
const TestRun = require('./src/models/TestRun');
const TestSuite = require('./src/models/TestSuite');
const TestCase = require('./src/models/TestCase');
const TestResult = require('./src/models/TestResult');

async function importData() {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);

    // Read exported JSON
    const data = JSON.parse(fs.readFileSync('indexeddb-export.json', 'utf8'));

    // Map old IDs to new MongoDB ObjectIds
    const idMap = {
        runs: new Map(),
        suites: new Map(),
        cases: new Map()
    };

    // Import test runs
    for (const run of data.test_runs) {
        const newRun = await TestRun.create({
            name: run.name,
            timestamp: run.timestamp,
            time: run.time,
            total_tests: run.total_tests,
            total_failures: run.total_failures,
            total_errors: run.total_errors,
            total_skipped: run.total_skipped,
            content_hash: run.content_hash,
            source: run.source
        });
        idMap.runs.set(run.id, newRun._id);
    }

    // Import test suites
    for (const suite of data.test_suites) {
        const newSuite = await TestSuite.create({
            run_id: idMap.runs.get(suite.run_id),
            name: suite.name,
            classname: suite.classname,
            timestamp: suite.timestamp,
            time: suite.time,
            tests: suite.tests,
            failures: suite.failures,
            errors: suite.errors,
            skipped: suite.skipped
        });
        idMap.suites.set(suite.id, newSuite._id);
    }

    // Import test cases
    for (const testCase of data.test_cases) {
        const newCase = await TestCase.create({
            suite_id: idMap.suites.get(testCase.suite_id),
            run_id: idMap.runs.get(testCase.run_id),
            name: testCase.name,
            classname: testCase.classname,
            time: testCase.time,
            status: testCase.status,
            is_flaky: testCase.is_flaky || false
        });
        idMap.cases.set(testCase.id, newCase._id);
    }

    console.log('Import completed successfully!');
    process.exit(0);
}

importData().catch(console.error);
```

Run import:
```bash
node import-to-mongodb.js
```

---

## Testing

### Backend Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/unit/junitParser.test.js
```

### API Testing with cURL

```bash
# Upload file
curl -X POST http://localhost:5000/api/v1/upload \
  -F "file=@sample-test-results.xml"

# Get test runs
curl http://localhost:5000/api/v1/runs

# Get specific run
curl http://localhost:5000/api/v1/runs/507f1f77bcf86cd799439011

# Get statistics
curl http://localhost:5000/api/v1/stats/overview
```

---

## Security Considerations

### 1. Input Validation
- Validate all file uploads (size, type)
- Sanitize XML content before parsing
- Validate all query parameters

### 2. Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/v1/upload', uploadLimiter);
```

### 3. CORS Configuration
```javascript
const cors = require('cors');

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS.split(','),
    credentials: true
}));
```

### 4. Authentication (Future)
- Implement JWT-based authentication
- Add role-based access control (RBAC)
- Secure sensitive endpoints

### 5. HTTPS
- Use SSL/TLS certificates (Let's Encrypt)
- Redirect HTTP to HTTPS
- Enable HSTS headers

---

## Performance Optimization

### Database Optimization
1. **Indexes**: Ensure all frequently queried fields have indexes
2. **Aggregation Pipeline**: Use for complex queries
3. **Projection**: Only return needed fields
4. **Connection Pooling**: Configure proper pool size

### API Optimization
1. **Caching**: Implement Redis for frequently accessed data
2. **Compression**: Enable gzip compression
3. **Pagination**: Limit result sets
4. **Async Processing**: Queue long-running tasks

### Frontend Optimization
1. **Lazy Loading**: Load data on demand
2. **Debouncing**: Debounce search inputs
3. **Caching**: Cache API responses
4. **Virtual Scrolling**: For large lists

---

## Monitoring & Logging

### Logging Setup

```javascript
const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}
```

### Monitoring Tools
- **MongoDB Atlas Monitoring**: Built-in metrics
- **PM2 Monitoring**: Process monitoring
- **New Relic / Datadog**: APM solutions
- **Prometheus + Grafana**: Custom metrics

---

## Troubleshooting

### Common Issues

**Issue: MongoDB Connection Failed**
```
Solution:
1. Check MongoDB is running: sudo systemctl status mongod
2. Verify connection string in .env
3. Check network access (firewall, IP whitelist)
4. Verify credentials
```

**Issue: CORS Errors**
```
Solution:
1. Add frontend URL to ALLOWED_ORIGINS in .env
2. Ensure cors middleware is configured correctly
3. Check preflight OPTIONS requests are handled
```

**Issue: File Upload Fails**
```
Solution:
1. Check MAX_FILE_SIZE in .env
2. Verify multer configuration
3. Check disk space on server
4. Validate XML file format
```

---

## Conclusion

This migration guide provides a comprehensive roadmap to convert the JUnit Test Results Dashboard from a client-side IndexedDB application to a server-based MongoDB architecture. The new architecture provides:

- **Centralized Data**: All test results in one database
- **Multi-User Access**: Multiple users can access the same data
- **Better Performance**: Optimized queries with MongoDB indexes
- **Advanced Features**: Real-time collaboration, API access, CI/CD integration
- **Scalability**: Handle millions of test results
- **Security**: Authentication, authorization, and data protection

Follow the implementation steps sequentially for a smooth migration. Test thoroughly at each phase before proceeding to the next.
