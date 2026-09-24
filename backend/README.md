# Test Results Dashboard Backend API

MongoDB-based backend for JUnit XML and Allure test results.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and update MongoDB connection string and other settings
```

### 3. Start Server

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Production with PM2:

```bash
pm2 start ecosystem.config.js
```

## Test Result Consolidation

New imports store each execution directly in `testcases`; the former `testresults`
collection is retained temporarily for migration and rollback compatibility. Before
deploying this schema change, audit the existing database and then apply the backfill:

```bash
npm run migrate:test-results
npm run migrate:test-results -- --apply
```

The first command is read-only. The second copies legacy execution timestamps and
skip messages into their authoritative test-case documents, refuses ambiguous
duplicate results, and reports orphaned data. It does not delete `testresults`;
retain that collection through an observation period before removing it separately.

## Stable Test Definitions

Each imported execution remains a `TestCase` and now references a reusable
`TestDefinition` through `definition_id`. History and flakiness use that reference,
so identically named tests in different projects do not share history. Identity is
scoped by project and repository when present. JUnit uses class plus test name;
Allure prefers `historyId`, then `testCaseId` plus parameters, then `fullName` plus
parameters. The two formats remain distinct because their identifiers have
different semantics. Assigning a run to a different project re-links its cases.

Before deploying this version against an existing database, run the read-only
audit, then apply and verify the idempotent backfill:

```bash
npm run migrate:test-definitions
npm run migrate:test-definitions -- --apply
```

The apply command reports case and definition counts and fails if any case lacks
a definition. It never deletes executions or definitions. Back up MongoDB before
running it against production data. New imports can proceed after the backfill.
The performance and comparison history endpoints still accept a test name when it
identifies exactly one definition; ambiguous names return HTTP 409 and require a
case ID instead.

## API Endpoints

### Upload

- `POST /api/v1/upload` - Upload one JUnit XML file or Allure results ZIP
- `POST /api/v1/upload/batch` - Upload multiple JUnit XML or Allure ZIP files

### Test Runs

- `GET /api/v1/runs` - Get all test runs (paginated)
- `GET /api/v1/runs/:id` - Get specific test run
- `DELETE /api/v1/runs/:id` - Delete test run

### Test Cases

- `GET /api/v1/cases` - Get test cases (with filters)
- `GET /api/v1/cases/:id` - Get specific test case
- `GET /api/v1/cases/:id/history` - Get test execution history

### Statistics

- `GET /api/v1/stats/overview` - Get overall statistics
- `GET /api/v1/stats/trends` - Get test trends
- `GET /api/v1/stats/flaky-tests` - Get flaky tests

### Health Check

- `GET /health` - API health check

## Testing API

### Upload Test File

```bash
curl -X POST http://localhost:5000/api/v1/upload \
  -F "file=@sample-test-results.xml" \
  -F 'ci_metadata={"provider":"manual","source":"curl"}'
```

### Upload Allure Results

Zip the raw `allure-results` directory rather than the generated HTML report:

```bash
(cd allure-results && zip -r ../allure-results.zip .)
curl --fail-with-body http://localhost:5000/api/v1/upload \
  -F "file=@allure-results.zip" \
  -F "format=allure" \
  -F 'ci_metadata={"provider":"manual","job_name":"my-project","build_number":"42"}'
```

See [`docs/API_INTEGRATION.md`](../docs/API_INTEGRATION.md) for the accepted Allure files, archive limits, CI examples, and attachment retrieval API.

### Get Test Runs

```bash
curl http://localhost:5000/api/v1/runs
```

### Health Check

```bash
curl http://localhost:5000/health
```

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── models/
│   │   ├── TestRun.js           # Test run schema
│   │   ├── TestSuite.js         # Test suite schema
│   │   ├── TestCase.js          # Test case schema
│   │   ├── TestResult.js        # Test result schema
│   │   └── FileUpload.js        # File upload schema
│   ├── routes/
│   │   ├── upload.js            # Upload endpoints
│   │   ├── runs.js              # Test run endpoints
│   │   ├── cases.js             # Test case endpoints
│   │   └── stats.js             # Statistics endpoints
│   ├── services/
│   │   ├── junitParser.js       # XML parsing
│   │   ├── hashGenerator.js     # Content hashing
│   │   └── flakyDetector.js     # Flaky test detection
│   ├── middleware/
│   │   ├── errorHandler.js      # Error handling
│   │   └── validator.js         # Request validation
│   ├── utils/
│   │   └── logger.js            # Logging utility
│   └── server.js                # Main server file
├── uploads/                     # Uploaded files (gitignored)
├── logs/                        # Log files (gitignored)
├── .env                         # Environment variables (gitignored)
├── .env.example                 # Environment template
├── ecosystem.config.js          # PM2 configuration
├── package.json
└── README.md
```

## Environment Variables

See `.env.example` for all available configuration options.

Required variables:

- `MONGODB_URI` - MongoDB connection string
- `ALLOWED_ORIGINS` - CORS allowed origins
- `PORT` - Server port (default: 5000)

## MongoDB Setup

The application requires MongoDB 7.0+ with authentication enabled.

Create database and user:

```bash
mongosh
use admin
db.createUser({
  user: "admin",
  pwd: "your_admin_password",
  roles: [ { role: "root" } ]
})

use junit_test_results
db.createUser({
  user: "junit_app",
  pwd: "your_app_password",
  roles: [ { role: "readWrite", db: "junit_test_results" } ]
})
```

## Monitoring

### View Logs

```bash
# PM2 logs
pm2 logs junit-dashboard-api

# Application logs
tail -f logs/info.log
tail -f logs/error.log
```

### Monitor with PM2

```bash
pm2 monit
pm2 status
```

## Troubleshooting

### Cannot connect to MongoDB

- Check MongoDB is running: `sudo systemctl status mongod`
- Verify connection string in `.env`
- Check MongoDB authentication is enabled

### CORS errors

- Add frontend URL to `ALLOWED_ORIGINS` in `.env`
- Restart the server after changes

### File upload fails

- Check `MAX_FILE_SIZE` setting in `.env`
- Verify `uploads/` directory exists and is writable
- Check disk space: `df -h`

## Development

Install development dependencies:

```bash
npm install --save-dev
```

Run with auto-reload:

```bash
npm run dev
```

## Production Deployment

See `../docs/INSTALLATION.md` for complete production setup instructions.

Quick production checklist:

- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Configure MongoDB authentication
- [ ] Set strong passwords
- [ ] Configure firewall
- [ ] Set up HTTPS with Nginx
- [ ] Enable PM2 startup
- [ ] Configure log rotation
- [ ] Set up database backups
