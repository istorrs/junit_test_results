# Field Name Discrepancy Audit

**Date:** 2025-11-11
**Purpose:** Document field name mismatches between MongoDB models, backend API, and frontend code

---

## Executive Summary

Identified **3 critical discrepancies** between database models and frontend expectations:

1. **TestCase model lacks `timestamp` field** - only has `created_at`
2. **Inconsistent timestamp handling in api-client.js**
3. **Missing null checks in test-details-modal.js**

---

## MongoDB Model Analysis

### Field Inventory by Model

| Model | Explicit `timestamp` | Auto `created_at` | Auto `updated_at` |
|-------|---------------------|-------------------|-------------------|
| **TestRun** | ✅ Yes (line 8) | ✅ Yes | ✅ Yes |
| **TestSuite** | ✅ Yes (line 14) | ✅ Yes | ✅ Yes |
| **TestCase** | ❌ **NO** | ✅ Yes | ✅ Yes |
| **TestResult** | ✅ Yes (line 33) | ✅ Yes | ❌ No |

**Key Finding:** TestCase is the ONLY model without an explicit `timestamp` field.

---

## Discrepancy #1: TestCase Timestamp Field

### The Problem

**MongoDB Model (TestCase):**
```javascript
// NO explicit timestamp field!
// Only has created_at from timestamps option
{
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
}
```

**Frontend Expectations (api-client.js line 174):**
```javascript
timestamp: testCase.timestamp,  // ❌ Field doesn't exist!
```

### Impact

- **Severity:** HIGH
- When `getTestCases()` is called, all test cases return `timestamp: undefined`
- Any frontend code using `testCase.timestamp` from `getTestCases()` will break

### Why It Wasn't Caught Earlier

The `getTestCase()` (singular) method has a fallback:
```javascript
// api-client.js line 283 - CORRECT ✅
timestamp: rawData.timestamp || rawData.created_at,
```

But `getTestCases()` (plural) doesn't have this fallback:
```javascript
// api-client.js line 174 - INCORRECT ❌
timestamp: testCase.timestamp,
```

### Current Status

**PARTIALLY FIXED** - We fixed test-details-modal.js to use `created_at` instead of `timestamp`, but the root cause in api-client.js remains.

---

## Discrepancy #2: Inconsistent API Client Transformations

### The Problem

Different methods in api-client.js handle the same field inconsistently:

| Method | Line | Handling | Status |
|--------|------|----------|--------|
| `getTestCase()` | 283 | `timestamp: rawData.timestamp \|\| rawData.created_at` | ✅ Correct |
| `getTestCases()` | 174 | `timestamp: testCase.timestamp` | ❌ Missing fallback |
| `getTestCaseHistory()` | 214 | `timestamp: c.created_at` | ✅ Correct (uses created_at directly) |

### Impact

- **Severity:** MEDIUM
- Inconsistent behavior across different API methods
- Developers can't rely on consistent field availability
- Hard to debug issues

---

## Discrepancy #3: Test History Modal Direct API Call

### The Problem

**test-details-modal.js line 123-124:**
```javascript
const response = await database.fetchWithAuth(
    `/cases?name=${...}&classname=${...}&limit=10`
);
this.testHistory = response.data.cases || [];
```

This **bypasses the api-client.js transformation layer** entirely and gets raw MongoDB data.

### Impact

- **Severity:** LOW (Already Fixed)
- Modal receives MongoDB field names (`created_at`, `_id`) instead of transformed names (`timestamp`, `id`)
- **Fixed:** We changed the modal to use `created_at` instead of `timestamp`

### Why This Happened

The modal uses `database.fetchWithAuth()` directly instead of calling `database.getTestCases()`, which would apply the transformation.

---

## Recommended Fixes

### Option 1: Add Explicit `timestamp` to TestCase Model (RECOMMENDED)

**Pros:**
- Consistent with other models
- Frontend code works as expected
- Clear separation between execution time and creation time

**Cons:**
- Requires database migration for existing data
- Need to update parser to populate the field

**Implementation:**
```javascript
// backend/src/models/TestCase.js
const testCaseSchema = new mongoose.Schema({
    // ... existing fields ...
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});
```

### Option 2: Fix api-client.js Transformations

**Pros:**
- No database changes needed
- Quick fix
- Works with existing data

**Cons:**
- Frontend continues to use misleading field name
- Doesn't fix the underlying inconsistency

**Implementation:**
```javascript
// api-client.js line 174 - Fix getTestCases()
timestamp: testCase.timestamp || testCase.created_at,  // Add fallback
```

### Option 3: Standardize on `created_at` Everywhere

**Pros:**
- Matches actual database schema
- No transformation needed
- Clearest intent

**Cons:**
- Large refactor across frontend
- Need to update all references
- Inconsistent with other models that DO have timestamp

---

## Better Testing Strategy

### 1. TypeScript/JSDoc Type Definitions

Create type definitions for all API responses:

```javascript
/**
 * @typedef {Object} TestCase
 * @property {string} id - MongoDB _id transformed to string
 * @property {string} name
 * @property {string} classname
 * @property {string} status
 * @property {number} time
 * @property {Date|string} created_at - When test case was stored in DB
 * @property {string} suite_id
 * @property {string} run_id
 */
```

### 2. Integration Tests

Test API client transformations:

```javascript
describe('API Client Transformations', () => {
  it('should handle missing timestamp field in TestCase', async () => {
    const testCase = await api.getTestCase('some-id');
    expect(testCase.case.timestamp).toBeDefined();
  });

  it('should have consistent timestamp across methods', async () => {
    // Test that getTestCase and getTestCases return same fields
  });
});
```

### 3. Schema Validation Layer

Add runtime validation:

```javascript
function validateTestCase(testCase) {
  const required = ['id', 'name', 'status', 'created_at'];
  for (const field of required) {
    if (!(field in testCase)) {
      console.error(`Missing required field: ${field}`, testCase);
    }
  }
}
```

### 4. Automated Field Mapping Audit

Create a script to compare:
- MongoDB model schemas → Backend API responses → Frontend transformations

```javascript
// scripts/audit-field-mappings.js
const models = require('./models');
const routes = require('./routes');

// Extract fields from each layer and compare
```

### 5. Frontend Console Warnings

Add development-mode warnings:

```javascript
if (process.env.NODE_ENV === 'development') {
  if (!testCase.timestamp && !testCase.created_at) {
    console.warn('TestCase missing both timestamp and created_at', testCase);
  }
}
```

---

## Action Items

### Immediate (Required)

- [x] Fix test-details-modal.js to use `created_at` (DONE)
- [ ] Fix api-client.js line 174 to add fallback: `timestamp: testCase.timestamp || testCase.created_at`
- [ ] Verify all uses of `testCase.timestamp` in frontend code

### Short Term (Next Sprint)

- [ ] Add JSDoc type definitions for all API responses
- [ ] Add integration tests for API client transformations
- [ ] Document the timestamp vs created_at distinction in code comments

### Long Term (Future)

- [ ] Consider adding explicit `timestamp` field to TestCase model
- [ ] Migrate to TypeScript for compile-time type checking
- [ ] Create automated field mapping audit script

---

## Field Naming Conventions (Proposed)

| Field | Purpose | Used In |
|-------|---------|---------|
| `timestamp` | **Test execution time** (from JUnit XML or CI metadata) | TestRun, TestSuite, TestResult |
| `created_at` | **Database record creation time** (auto-generated by Mongoose) | All models |
| `updated_at` | **Database record update time** (auto-generated by Mongoose) | Most models |

**Exception:** TestCase currently only has `created_at` because individual test cases don't have their own execution timestamp separate from the test run.

---

## Conclusion

The root cause is **inconsistent schema design** - TestCase lacks the `timestamp` field that all other models have. This was masked by the fact that `getTestCase()` (singular) had a fallback, but `getTestCases()` (plural) didn't.

**Recommended Action:** Apply Option 2 (fix api-client.js transformations) immediately, then plan Option 1 (add timestamp to model) for next release.
