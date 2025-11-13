# PERFORMANCE PAGE - CRITICAL ISSUES SUMMARY

## Quick Diagnosis

Your Performance page (/performance route) is **completely non-functional** due to a **single root cause**:

**The backend queries look for a `timestamp` field that doesn't exist in the TestCase database collection.**

TestCase documents have `created_at`, not `timestamp`.

---

## The Three Visible Problems

### 1. NaN Values in All Tables
**What you see**: Tables showing "NaNm NaNs" instead of real performance numbers
**Why**: Empty query results cause null values → null passed to frontend → formatDuration(null) = "NaNm NaNs"

### 2. Regression Detection Always Empty
**What you see**: "No performance regressions detected" regardless of data
**Why**: Baseline/recent comparison arrays are empty because of 0 documents returned by query

### 3. Filters Have No Effect
**What you see**: Changing "Last 7 Days" to "Last 30 Days" changes nothing
**Why**: Query always returns 0 documents regardless of filter value

---

## Root Cause Hierarchy

```
PRIMARY ROOT CAUSE (fixes all 3 issues):
└─ Wrong field name in queries
   └─ TestCase schema uses 'created_at' 
   └─ Queries use 'timestamp' (doesn't exist)
   └─ 0 documents matched
   └─ Null values in results
   └─ NaN in frontend display

SECONDARY ROOT CAUSES (support the NaN problem):
├─ Invalid MongoDB operators ($median/$percentile with method param)
├─ Incorrect array extraction assumptions
└─ Missing null checks in frontend formatting functions
```

---

## Critical Lines to Fix

### Backend: `/backend/src/routes/performance.js`

Replace all `timestamp` with `created_at`:

| Line(s) | Change | Why |
|---------|--------|-----|
| 19 | `timestamp` → `created_at` | Enable /trends filtering |
| 52 | `'$timestamp'` → `'$created_at'` | Enable /trends date grouping |
| 114 | `timestamp` → `created_at` | Enable /slowest filtering |
| 129 | `'$timestamp'` → `'$created_at'` | Get correct latest_run date |
| 179 | `timestamp` → `created_at` | Enable /regressions filtering |
| 191 | `'$timestamp'` → `'$created_at'` | Correct regression baseline split |
| 196 | `'$timestamp'` → `'$created_at'` | Correct regression recent split |

### Frontend: `/client/src/views/Performance.vue`

Add null safety to formatting functions:

| Function | Change |
|----------|--------|
| formatDuration (line 244) | Add: `if (seconds == null \|\| isNaN(seconds)) return 'N/A'` |
| formatDate (line 256) | Add: `if (!dateString) return 'N/A'` |

---

## Before & After

### BEFORE (Broken)
```javascript
// performance.js line 114
const slowestTests = await TestCase.aggregate([
    {
        $match: {
            timestamp: { $gte: cutoffDate },  // ✗ FIELD DOESN'T EXIST
            time: { $gt: parseFloat(threshold) }
        }
    },
    // ...
]);
// Result: 0 documents → null values → NaN in UI
```

### AFTER (Fixed)
```javascript
// performance.js line 114
const slowestTests = await TestCase.aggregate([
    {
        $match: {
            created_at: { $gte: cutoffDate },  // ✓ CORRECT FIELD
            time: { $gt: parseFloat(threshold) }
        }
    },
    // ...
]);
// Result: Multiple documents → real values → Proper display
```

---

## Implementation Priority

1. **CRITICAL** (5 minutes): Fix all `timestamp` → `created_at` replacements
   - Fixes all 3 visible issues
   - 7 field name changes total
   
2. **HIGH** (10 minutes): Review MongoDB operators ($median/$percentile)
   - Choose either simplify or use MongoDB 7.0+ syntax
   
3. **MEDIUM** (5 minutes): Add null safety checks to formatDuration and formatDate
   - Defensive programming
   - Prevents future crashes

---

## Testing Checklist

After fixes:

- [ ] API endpoint `/api/v1/performance/slowest?days=7` returns data (not empty)
- [ ] Data contains numeric values (not null)
- [ ] Tables display times like "1.50s" (not "NaNm NaNs")
- [ ] Changing "Last 7 Days" → "Last 30 Days" changes result count
- [ ] Regression Detection tab shows results (if data exists)
- [ ] Regression threshold filter affects results

---

## File Locations

- **Main Investigation Report**: `/home/user/junit_test_results/PERFORMANCE_INVESTIGATION_REPORT.md`
  - Contains detailed root cause analysis
  - Full data flow explanation
  - All 4 fixes with code examples

- **Code Comparison**: `/home/user/junit_test_results/PERFORMANCE_CODE_COMPARISON.md`
  - Side-by-side before/after code
  - Database schema analysis
  - Impact visualization

- **Frontend Component**: `/home/user/junit_test_results/client/src/views/Performance.vue`
  
- **Backend Routes**: `/home/user/junit_test_results/backend/src/routes/performance.js`

- **Schema References**:
  - TestCase: `/home/user/junit_test_results/backend/src/models/TestCase.js` (line 43)
  - TestRun: `/home/user/junit_test_results/backend/src/models/TestRun.js` (line 10)

---

## Why This Happened

The developer likely:
1. Copied TestRun schema pattern (which has explicit `timestamp` field)
2. Applied same field name to TestCase queries
3. But TestCase uses Mongoose `timestamps` option (creates `created_at`/`updated_at`)
4. Never tested the endpoints with actual data
5. Frontend formatting functions never had null checks added

This is a classic schema-query mismatch that's easy to miss in code review but immediately breaks functionality.

---

## Questions?

- **"Why does stats.js work then?"** - Because it uses `created_at` (correct field name)
- **"Should we add timestamp to TestCase?"** - No, keep `created_at` (existing field, other code depends on it)
- **"What about MongoDB version compatibility?"** - Fix field name first, then address operators
- **"How long will fixes take?"** - ~20 minutes total (7 field replacements + 2 functions + testing)

