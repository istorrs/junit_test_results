# Database Maintenance Scripts

This directory contains scripts for database maintenance, repairs, and migrations.

## repair-timestamps.js

Repairs test run timestamps that were incorrectly set to the upload time instead of the actual test execution time.

### Problem

Before the timestamp fix, test runs imported from Jenkins showed the upload/import timestamp instead of the actual test execution time from the CI build.

### Solution

This script:

1. Finds all test runs with `ci_metadata.build_time` (from Jenkins imports)
2. Compares the test run's `timestamp` with the `build_time`
3. Updates test runs where timestamps differ by more than 1 minute
4. Updates related test suites to match the corrected timestamp

### Usage

**Dry run (recommended first):**

```bash
cd backend
node scripts/repair-timestamps.js --dry-run
```

**Apply changes:**

```bash
cd backend
node scripts/repair-timestamps.js
```

### What It Does

For each test run with ci_metadata:

- Compares `run.timestamp` with `ci_metadata.build_time`
- If they differ by more than 60 seconds:
    - Updates `TestRun.timestamp` to `ci_metadata.build_time`
    - Updates related `TestSuite.timestamp` entries
    - Logs the change

### Safety

- Dry run mode shows what would be changed without modifying data
- Only updates runs where timestamps differ significantly (>1 minute)
- Preserves test suites with their own explicit timestamps
- Can be safely re-run (idempotent)

### Example Output

```
Found 150 test runs with ci_metadata.build_time

Test Run: 67304abf12345678
  Name: test_suite_gw
  Current timestamp: 2025-11-10T15:30:00.000Z
  Build time: 2025-11-08T10:45:23.000Z
  Difference: 2944.62 minutes
  ✓ Updated test run and 5 test suites

=== Summary ===
Total test runs found: 150
Test runs updated: 142
Test runs skipped (already correct): 8
Test suites updated: 1024

✓ Timestamp repair completed successfully!
```

### Requirements

- Node.js
- MongoDB connection (uses `MONGODB_URI` from environment or `.env`)
- Backend dependencies installed (`npm install` in backend directory)

### When to Use

- After importing historical data from Jenkins
- If you notice test runs showing current dates instead of historical dates
- After upgrading from a version before the timestamp fix

## Future Scripts

Additional maintenance scripts can be added here for:

- Data migrations
- Index optimization
- Cleanup operations
- Database health checks
