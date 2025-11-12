# Database Maintenance Scripts

This directory contains scripts for maintaining data integrity and quality in the JUnit Test Results database.

## Available Scripts

### 1. fix-test-run-counts.js

**Purpose**: Fixes test runs with missing or incorrect test counts

**When to run**:

- After bulk data imports
- When test runs show 0 tests despite having test cases
- After schema migrations

**Usage**:

```bash
docker exec junit-backend node /app/scripts/fix-test-run-counts.js
```

**What it fixes**:

- Test runs with `tests: 0`
- Test runs with `tests: null`
- Test runs with missing `tests` field
- Recalculates: tests, failures, errors, skipped, time

---

### 2. audit-null-fields.js

**Purpose**: Comprehensive audit of all null/undefined fields across all collections

**When to run**:

- Weekly maintenance checks
- Before major releases
- After schema changes

**Usage**:

```bash
docker exec junit-backend node /app/scripts/audit-null-fields.js
```

---

### 3. validate-required-fields.js

**Purpose**: Validates that all critical fields have values (no nulls allowed)

**When to run**:

- As part of CI/CD pipeline validation
- After data migrations
- Daily automated health checks

**Usage**:

```bash
docker exec junit-backend node /app/scripts/validate-required-fields.js
```

**Exit codes**:

- `0`: All required fields are present (validation passed)
- `1`: Missing required fields detected (validation failed)

## Data Quality Guarantees

After running these scripts, you can trust that:

✅ All test runs have accurate test counts
✅ All test cases have complete required data
✅ All test suites have valid statistics
✅ Test results maintain referential integrity
