# Field Naming Standard

**Version:** 1.0
**Created:** 2025-11-13
**Status:** Canonical Reference

## Purpose

This document defines the authoritative field naming convention for the entire Test Results Viewer stack (database, backend API, frontend). **All code must adhere to this standard.**

## Motivation

Field name inconsistencies have caused:

- Defensive shimming code in frontend (`field1 || field2 || field3`)
- Data loss from incorrect field mappings
- Developer confusion and maintenance overhead
- Difficult debugging

## Core Principle

**Use `snake_case` consistently across all layers:**

- ✅ Database schema: `test_name`, `created_at`, `error_message`
- ✅ Backend API responses: `test_name`, `created_at`, `error_message`
- ✅ Frontend TypeScript: `test_name`, `created_at`, `error_message`

**Exception:** MongoDB's `_id` field is transformed to `id` in API responses for cleaner JSON.

---

## Standard Field Names by Entity

### TestRun Fields

| Standard Name              | Type     | Description                         | Notes                                         |
| -------------------------- | -------- | ----------------------------------- | --------------------------------------------- |
| `id`                       | string   | Unique identifier                   | Transformed from MongoDB `_id`                |
| `name`                     | string   | Human-readable run name             | e.g., "Build #123"                            |
| `timestamp`                | Date     | When test run executed              | ISO 8601 format                               |
| `total_tests`              | number   | Total test count                    | NOT `tests`                                   |
| `passed`                   | number   | Passed test count                   |                                               |
| `failed`                   | number   | Failed test count                   |                                               |
| `errors`                   | number   | Error test count                    |                                               |
| `skipped`                  | number   | Skipped test count                  |                                               |
| `time`                     | number   | Total execution time (seconds)      | NOT `duration`                                |
| `pass_rate`                | number   | Percentage passed (0-100)           |                                               |
| `ci_metadata`              | object   | CI/CD system metadata               | Nested object                                 |
| `ci_metadata.job_name`     | string   | CI job name (project identifier)    |                                               |
| `ci_metadata.build_number` | string   | Build number                        |                                               |
| `ci_metadata.build_url`    | string   | Link to CI build                    |                                               |
| `ci_metadata.provider`     | string   | CI system (jenkins, github_actions) |                                               |
| `ci_metadata.branch`       | string   | Git branch                          |                                               |
| `ci_metadata.commit_sha`   | string   | Git commit SHA                      |                                               |
| `ci_metadata.repository`   | string   | Git repository URL                  |                                               |
| `release_tag`              | string   | Release identifier                  | e.g., "v1.2.0"                                |
| `release_version`          | string   | Semantic version                    | e.g., "1.2.0"                                 |
| `baseline`                 | boolean  | Marked as baseline for comparison   | Default: false                                |
| `comparison_tags`          | string[] | Tags for grouping comparisons       |                                               |
| `properties`               | object   | JUnit XML properties metadata       | Free-form key-value pairs from `<properties>` |
| `file_upload_id`           | string   | Reference to FileUpload             | ObjectId reference                            |
| `created_at`               | Date     | Record creation timestamp           | Mongoose timestamps                           |
| `updated_at`               | Date     | Record update timestamp             | Mongoose timestamps                           |

### TestCase Fields

| Standard Name       | Type    | Description               | Notes                                  |
| ------------------- | ------- | ------------------------- | -------------------------------------- |
| `id`                | string  | Unique identifier         | Transformed from MongoDB `_id`         |
| `suite_id`          | string  | Parent test suite ID      | ObjectId reference                     |
| `run_id`            | string  | Parent test run ID        | ObjectId reference                     |
| `name`              | string  | Test method name          | e.g., "testUserLogin"                  |
| `class_name`        | string  | Full test class name      | NOT `classname` or `suite_name`        |
| `time`              | number  | Execution time (seconds)  | NOT `duration`                         |
| `status`            | string  | Test result               | "passed", "failed", "error", "skipped" |
| `error_message`     | string  | Error message if failed   | NOT `errorMessage` or `message`        |
| `error_type`        | string  | Error class/type          | NOT `errorType` or `type`              |
| `stack_trace`       | string  | Full stack trace          | NOT `stackTrace` or `stacktrace`       |
| `assertions`        | number  | Number of assertions      | Optional                               |
| `file`              | string  | Source file path          | Optional                               |
| `line`              | number  | Line number in source     | Optional                               |
| `system_out`        | string  | stdout capture            | Optional                               |
| `system_err`        | string  | stderr capture            | Optional                               |
| `is_flaky`          | boolean | Flagged as flaky          | Default: false                         |
| `flaky_detected_at` | Date    | When flakiness detected   | Optional                               |
| `file_upload_id`    | string  | Reference to FileUpload   | ObjectId reference                     |
| `created_at`        | Date    | Record creation timestamp | Mongoose timestamps                    |
| `updated_at`        | Date    | Record update timestamp   | Mongoose timestamps                    |

### TestSuite Fields

| Standard Name    | Type   | Description                   | Notes                                         |
| ---------------- | ------ | ----------------------------- | --------------------------------------------- |
| `id`             | string | Unique identifier             | Transformed from MongoDB `_id`                |
| `run_id`         | string | Parent test run ID            | ObjectId reference                            |
| `name`           | string | Suite name                    | e.g., "UserTests"                             |
| `package_name`   | string | Java package or module        | e.g., "com.example.tests"                     |
| `total_tests`    | number | Tests in suite                | NOT `tests`                                   |
| `passed`         | number | Passed tests                  |                                               |
| `failed`         | number | Failed tests                  |                                               |
| `errors`         | number | Error tests                   |                                               |
| `skipped`        | number | Skipped tests                 |                                               |
| `time`           | number | Total suite execution time    |                                               |
| `timestamp`      | Date   | Suite execution time          |                                               |
| `properties`     | object | JUnit XML properties metadata | Free-form key-value pairs from `<properties>` |
| `file_upload_id` | string | Reference to FileUpload       | ObjectId reference                            |
| `created_at`     | Date   | Record creation timestamp     | Mongoose timestamps                           |
| `updated_at`     | Date   | Record update timestamp       | Mongoose timestamps                           |

### Statistics Response Fields

| Standard Name        | Type   | Description            | Notes       |
| -------------------- | ------ | ---------------------- | ----------- |
| `total_tests`        | number | Total test count       | NOT `tests` |
| `passed`             | number | Passed count           |             |
| `failed`             | number | Failed count           |             |
| `errors`             | number | Error count            |             |
| `skipped`            | number | Skipped count          |             |
| `pass_rate`          | number | Pass percentage        |             |
| `total_runs`         | number | Number of test runs    |             |
| `avg_execution_time` | number | Average time (seconds) |             |
| `flaky_tests`        | number | Count of flaky tests   |             |
| `recent_failures`    | number | Recent failure count   |             |

### Analytics Response Fields

| Standard Name        | Type   | Description              | Notes |
| -------------------- | ------ | ------------------------ | ----- |
| `test_id`            | string | Test identifier          |       |
| `test_name`          | string | Test name                |       |
| `class_name`         | string | Test class               |       |
| `pass_rate`          | number | Pass percentage (0-100)  |       |
| `total_runs`         | number | Run count                |       |
| `recent_failures`    | number | Recent failure count     |       |
| `flakiness_score`    | number | Flakiness metric (0-100) |       |
| `error_message`      | string | Error message            |       |
| `error_type`         | string | Error classification     |       |
| `last_status_change` | Date   | When status last changed |       |

---

## Forbidden Field Names

These field names are **BANNED** and must not be used:

| ❌ Forbidden           | ✅ Use Instead  | Reason                       |
| ---------------------- | --------------- | ---------------------------- |
| `tests`                | `total_tests`   | Ambiguous (count vs array)   |
| `classname`            | `class_name`    | Inconsistent with snake_case |
| `suite_name`           | `class_name`    | Redundant/confusing          |
| `errorMessage`         | `error_message` | camelCase not allowed        |
| `errorType`            | `error_type`    | camelCase not allowed        |
| `stackTrace`           | `stack_trace`   | camelCase not allowed        |
| `duration`             | `time`          | Use `time` for consistency   |
| `timestamp` (TestCase) | `created_at`    | Use Mongoose timestamps      |

---

## MongoDB `_id` to `id` Transformation

**Rule:** MongoDB `_id` field is always transformed to `id` in API responses.

**Backend Implementation:**

```javascript
// Option 1: Mongoose toJSON transform (RECOMMENDED)
testRunSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

// Option 2: Manual transformation in route handlers
const runs = await TestRun.find().lean();
const transformedRuns = runs.map(run => ({
    ...run,
    id: run._id.toString(),
    _id: undefined
}));
```

**Frontend Expectations:**

- Always use `id` field (never `_id`)
- TypeScript interfaces should use `id: string`

---

## Error Field Standardization

Error information uses three distinct fields:

```typescript
{
  error_message: string,  // Human-readable error message
  error_type: string,     // Error class/category (e.g., "NullPointerException")
  stack_trace: string     // Full stack trace (optional)
}
```

**Backend Sources:**

- JUnit XML: `<failure message="..." type="...">`
- Parsed into separate fields, never combined

**Frontend Display:**

- Show `error_type` as badge/tag
- Display `error_message` in summary
- Expandable `stack_trace` in detail view

---

## JUnit XML Properties Support

**Properties** are free-form metadata that can be embedded in JUnit XML files. They are captured and stored for both TestRun and TestSuite entities.

### XML Format

```xml
<properties>
  <property name="Python" value="3.9.1"/>
  <property name="Platform" value="Linux-5.4.0-42-generic-x86_64-with-glibc2.29"/>
  <property name="DUT" value="192.168.1.100"/>
</properties>
```

### Database Storage

Properties are stored as `mongoose.Schema.Types.Mixed` objects, allowing flexible key-value pairs:

```javascript
{
  properties: {
    "Python": "3.9.1",
    "Platform": "Linux-5.4.0-42-generic-x86_64-with-glibc2.29",
    "DUT": "192.168.1.100"
  }
}
```

### Parser Behavior

- Properties from the first `<testsuite>` element are extracted for the TestRun
- Properties from each `<testsuite>` element are extracted for that TestSuite
- Properties are optional - empty object `{}` if not present
- Property extraction handles both array and non-array XML structures
- Empty or missing values default to empty string

### Frontend Display

Properties are displayed in the **Metadata** tab of test details views, showing all key-value pairs in a readable format.

---

## System Output Capture

**system_out** and **system_err** fields capture stdout and stderr from test execution.

### XML Format

```xml
<testcase name="test_example" classname="TestSuite">
  <system-out>
    Debug output line 1
    Debug output line 2
  </system-out>
  <system-err>
    Warning: deprecated API
  </system-err>
</testcase>
```

### Database Storage

Both fields are stored as strings in the TestCase model:

```javascript
{
  system_out: "Debug output line 1\nDebug output line 2",
  system_err: "Warning: deprecated API"
}
```

### Frontend Display

- Displayed in the **Failure Details** tab of TestDetailsModal
- Presented in monospace font with scrollable pre-formatted text
- Each has a "Copy" button for clipboard copying
- `system_out` uses blue accent border
- `system_err` uses warning/orange accent border
- Fields are optional - only shown when present

---

## Date/Time Field Standards

| Field        | Format   | Example                      | Notes                                  |
| ------------ | -------- | ---------------------------- | -------------------------------------- |
| `timestamp`  | ISO 8601 | `"2025-11-13T15:30:00.000Z"` | Test run/suite execution time          |
| `created_at` | ISO 8601 | `"2025-11-13T15:30:00.000Z"` | Record creation (Mongoose)             |
| `updated_at` | ISO 8601 | `"2025-11-13T15:30:00.000Z"` | Record update (Mongoose)               |
| `time`       | number   | `12.5`                       | Duration in seconds (NOT milliseconds) |

**Mongoose Timestamps Configuration:**

```javascript
{
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
}
```

---

## Migration Strategy

### Phase 1: Backend Schema Updates

1. Update Mongoose models to use standard field names
2. Add `toJSON` transforms for `_id` → `id` conversion
3. Update all route handlers to return standard fields

### Phase 2: Frontend Cleanup

1. Update TypeScript interfaces
2. Remove all defensive `||` operators
3. Update component code to use standard names

### Phase 3: Testing

1. Run integration tests
2. Verify API responses match standard
3. Test frontend rendering with real data

### Phase 4: Documentation

1. Update API documentation
2. Update component documentation
3. This document becomes canonical reference

---

## Enforcement

**Pre-commit Hook:**

- TypeScript compilation ensures type safety
- ESLint rules can enforce naming (future)

**Code Review:**

- All PRs checked against this standard
- Reject non-compliant field names

**Testing:**

- API response validation tests
- Frontend prop type tests

---

## Examples

### ✅ Correct API Response

```json
{
    "success": true,
    "data": {
        "run": {
            "id": "507f1f77bcf86cd799439011",
            "name": "Build #123",
            "timestamp": "2025-11-13T15:30:00.000Z",
            "total_tests": 150,
            "passed": 148,
            "failed": 2,
            "errors": 0,
            "skipped": 0,
            "time": 45.2,
            "pass_rate": 98.67,
            "ci_metadata": {
                "job_name": "my-test-suite",
                "build_number": "123",
                "provider": "jenkins"
            }
        },
        "test_cases": [
            {
                "id": "507f1f77bcf86cd799439012",
                "name": "testUserLogin",
                "class_name": "com.example.UserTests",
                "status": "failed",
                "time": 2.5,
                "error_message": "Expected user to be logged in",
                "error_type": "AssertionError",
                "stack_trace": "at UserTests.testUserLogin:42..."
            }
        ]
    }
}
```

### ❌ Incorrect API Response (DO NOT USE)

```json
{
    "success": true,
    "data": {
        "run": {
            "_id": "507f1f77bcf86cd799439011", // ❌ Should be "id"
            "name": "Build #123",
            "timestamp": "2025-11-13T15:30:00.000Z",
            "tests": 150, // ❌ Should be "total_tests"
            "passed": 148,
            "failed": 2,
            "duration": 45.2, // ❌ Should be "time"
            "passRate": 98.67 // ❌ Should be "pass_rate"
        },
        "testCases": [
            // ❌ Should be "test_cases"
            {
                "_id": "507f1f77bcf86cd799439012", // ❌ Should be "id"
                "testName": "testUserLogin", // ❌ Should be "name"
                "classname": "com.example.UserTests", // ❌ Should be "class_name"
                "errorMessage": "Expected...", // ❌ Should be "error_message"
                "errorType": "AssertionError" // ❌ Should be "error_type"
            }
        ]
    }
}
```

---

## Frontend TypeScript Interfaces

```typescript
// Standard TestRun interface
export interface TestRun {
    id: string;
    name: string;
    timestamp: string;
    total_tests: number;
    passed: number;
    failed: number;
    errors: number;
    skipped: number;
    time: number;
    pass_rate: number;
    ci_metadata?: CIMetadata;
    release_tag?: string;
    release_version?: string;
    created_at: string;
    updated_at: string;
}

// Standard TestCase interface
export interface TestCase {
    id: string;
    suite_id: string;
    run_id: string;
    name: string;
    class_name: string;
    time: number;
    status: 'passed' | 'failed' | 'error' | 'skipped';
    error_message?: string;
    error_type?: string;
    stack_trace?: string;
    is_flaky: boolean;
    created_at: string;
    updated_at: string;
}

// Standard CI Metadata interface
export interface CIMetadata {
    job_name?: string;
    build_number?: string;
    build_url?: string;
    provider?: string;
    branch?: string;
    commit_sha?: string;
    repository?: string;
}
```

---

## Questions & Answers

**Q: Why snake_case instead of camelCase?**
A: MongoDB field names traditionally use snake_case. Consistent naming across all layers reduces cognitive load and transformation errors.

**Q: What about existing data in the database?**
A: Schema changes are backwards-compatible. Old field names remain in database, but API responses use standard names. Migration scripts can rename fields if needed.

**Q: How do I handle both formats during transition?**
A: Use temporary transformation logic in backend routes. Remove once frontend is updated. Do NOT add defensive code to frontend.

**Q: What if I need a field not in this document?**
A: Propose addition via PR to this document. Follow snake_case convention. Get approval before implementing.

---

## Version History

| Version | Date       | Changes                                                             |
| ------- | ---------- | ------------------------------------------------------------------- |
| 1.0     | 2025-11-13 | Initial standard created from Tier 2 investigation                  |
| 1.1     | 2025-11-13 | Added JUnit XML properties support and system output capture fields |

---

**This document is authoritative. All code must comply.**
