# PERFORMANCE PAGE INVESTIGATION REPORT

## Executive Summary
The Performance page (/performance route) has **THREE CRITICAL ISSUES**:
1. **NaN values in data display** - caused by invalid MongoDB operators and incorrect field references
2. **Regression detection not working** - caused by empty data sets from schema field mismatch
3. **Filters (date range) having no effect** - caused by querying non-existent database fields

All three issues stem from a fundamental mismatch between the database schema and the query implementation.

---

## ISSUE #1: NaN VALUES APPEARING IN TABLES

### Root Cause
Multiple layers of problems causing NaN values in frontend tables:

#### Problem 1A: Invalid MongoDB Operators
**Location**: `/home/user/junit_test_results/backend/src/routes/performance.js`
- **Lines 59-60** (in `/trends` endpoint):
```javascript
p50_time: { $median: { input: '$time', method: 'approximate' } },
p95_time: { $percentile: { input: '$time', p: [0.95], method: 'approximate' } },
```

- **Line 127** (in `/slowest` endpoint):
```javascript
p95_time: { $percentile: { input: '$time', p: [0.95], method: 'approximate' } },
```

**Issue**: The `$median` and `$percentile` operators with `method: 'approximate'` syntax were added in MongoDB 7.0. These operators:
- May not exist in older MongoDB versions
- If they do exist, they return different output formats than expected
- The code assumes they return an array (see Problem 1B below)

#### Problem 1B: Incorrect Array Element Extraction
**Location**: Lines 79-80, 140 in performance.js

Lines 79-80 (in `/trends` projection):
```javascript
p50_time: { $round: [{ $arrayElemAt: ['$p50_time', 0] }, 3] },
p95_time: { $round: [{ $arrayElemAt: ['$p95_time', 0] }, 3] },
```

Line 140 (in `/slowest` projection):
```javascript
p95_time: { $round: [{ $arrayElemAt: ['$p95_time', 0] }, 3] },
```

**Issue**: 
- If `$percentile` returns a scalar instead of an array, `$arrayElemAt(['$p95_time', 0])` returns `null`
- If `$percentile` fails or returns `null`, the subsequent operations cascade the null value
- `$round(null, 3)` produces either `null` or `NaN`

#### Problem 1C: Invalid Field Reference (CRITICAL)
**Location**: Line 19, 52 in `/trends` endpoint; Line 114 in `/slowest` endpoint; Line 52 in `/regressions` endpoint

All endpoints use `timestamp` field:
```javascript
timestamp: { $gte: cutoffDate },  // Line 19, 114, etc.
```

BUT the TestCase schema (TestCase.js line 43) uses:
```javascript
timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
```

**Field Mismatch Analysis**:
- TestCase schema has NO `timestamp` field
- TestCase schema creates `created_at` and `updated_at` fields via Mongoose timestamps option
- The performance.js queries search for `timestamp` which doesn't exist in TestCase documents
- MongoDB returns 0 matching documents when filtering by non-existent fields
- Empty result sets cause `$avg`, `$max`, `$min` to return `null`
- Null values in formatting functions produce NaN

**Proof**:
```
TestCase.js schema line 43:
timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }

Performance.js queries (WRONG):
Line 19:  timestamp: { $gte: cutoffDate }
Line 52:  period: { $dateToString: { format: dateFormat, date: '$timestamp' } }
Line 114: timestamp: { $gte: cutoffDate }

Correct implementation (from stats.js line 19):
created_at: { $gte: new Date(req.query.from_date) }
```

#### Problem 1D: Frontend Formatting Without Null Checks
**Location**: `/home/user/junit_test_results/client/src/views/Performance.vue` lines 244-254

```typescript
const formatDuration = (seconds: number): string => {
  if (seconds < 1) {
    return `${(seconds * 1000).toFixed(0)}ms`
  }
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`
}
```

**Issue**:
- No null/NaN checks before formatting
- If `seconds` is null or NaN:
  - `NaN < 1` evaluates to false
  - `NaN < 60` evaluates to false
  - `Math.floor(NaN)` returns NaN
  - `NaN % 60` returns NaN
  - Result: displays "NaNm NaNs" in tables

### Visible Impact
- Slowest Tests tab shows NaN values instead of actual times
- Performance Regressions tab shows NaN values instead of baseline/recent averages
- Trends tab shows NaN values instead of percentile times

### Data Flow Causing NaN
```
1. Frontend calls: apiClient.getSlowestTests({ days: 30, limit: 20 })
2. Backend GET /api/v1/performance/slowest?days=30&limit=20
3. Performance.js line 114: $match: { timestamp: { $gte: cutoffDate } }
4. MongoDB finds 0 documents (timestamp field doesn't exist)
5. Aggregation returns empty groups
6. $avg, $max, $min on empty array = null
7. $percentile on empty array = null
8. $arrayElemAt on null = null
9. $round(null, 3) = null
10. Frontend receives: { avg_time: null, max_time: null, p95_time: null }
11. formatDuration(null) → produces "NaNm NaNs"
```

---

## ISSUE #2: REGRESSION DETECTION NOT WORKING

### Root Cause
The regression detection endpoint returns empty results because of the same field mismatch.

**Location**: `/home/user/junit_test_results/backend/src/routes/performance.js` lines 161-272

#### Problem 2A: Invalid Field Reference
Lines 179, 196 use `timestamp` field:
```javascript
$match: {
    timestamp: { $gte: baselineDate },
    time: { $exists: true, $ne: null, $gt: 0.1 }
}
```

But TestCase documents use `created_at`, not `timestamp`.

#### Problem 2B: Logic Flaw in Conditional Array Building
Lines 189-197:
```javascript
recent_times: {
    $push: {
        $cond: [{ $gte: ['$timestamp', cutoffDate] }, '$time', '$$REMOVE']
    }
},
baseline_times: {
    $push: {
        $cond: [{ $lt: ['$timestamp', cutoffDate] }, '$time', '$$REMOVE']
    }
}
```

**Issue Chain**:
1. Line 179: `$match` returns 0 documents because `timestamp` field doesn't exist
2. With 0 input documents, the $group stage has nothing to process
3. Empty groups mean `recent_times` and `baseline_times` are empty arrays
4. Lines 206-207:
```javascript
recent_avg: { $avg: '$recent_times' },
baseline_avg: { $avg: '$baseline_times' },
```
5. `$avg` on empty array returns `null`
6. Line 214: Second `$match` filters out null values
7. No regressions are returned

#### Problem 2C: Secondary Issue - Even if Fix #1 is applied
Lines 228-241 would still fail with NaN:
```javascript
percent_increase: {
    $round: [
        {
            $multiply: [
                {
                    $divide: [
                        { $subtract: ['$recent_avg', '$baseline_avg'] },
                        '$baseline_avg'  // Division by null/zero → NaN
                    ]
                },
                100
            ]
        },
        1
    ]
}
```

### Visible Impact
- "Performance Regressions" tab always shows: "No performance regressions detected"
- Even when actual regressions exist in the data
- Threshold filter has no effect (because there's no data to filter)

---

## ISSUE #3: FILTERS (DATE RANGE) NOT WORKING

### Root Cause
Filters have no effect because the filtered queries return zero results.

**Location**: Multiple endpoints in `/home/user/junit_test_results/backend/src/routes/performance.js`

#### Problem 3A: Days Filter Not Working
**In `/slowest` endpoint** (lines 104-154):
```javascript
const { limit = 20, days = 7, threshold = 0 } = req.query;

const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

const slowestTests = await TestCase.aggregate([
    {
        $match: {
            timestamp: { $gte: cutoffDate },  // ← WRONG FIELD
            time: { $gt: parseFloat(threshold) }
        }
    },
    // ...
]);
```

**What Happens**:
1. Frontend changes filter: `filters.days = 30` (selected "Last 30 Days")
2. Frontend calls: `loadData()` → `getSlowestTests({ days: 30, limit: 20 })`
3. Backend receives: `?days=30&limit=20`
4. Query filters by `timestamp: { $gte: cutoffDate }` where cutoffDate = 30 days ago
5. **But TestCase documents have NO `timestamp` field**
6. **Result**: 0 documents matched, returns empty array
7. Since the result was already empty, changing `days` to 7 or 60 makes no difference
8. All filter values show: "No test data available for the selected time range"

#### Problem 3B: Date Range Calculation is Correct (but on wrong field)
Lines 108-109 correctly calculate the cutoff date:
```javascript
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
```

The logic is sound; only the field name is wrong.

### Visible Impact
- Frontend "Time Range" filter selector appears to work (changes value)
- But data never updates because queries always return empty results
- Users see the same empty message regardless of filter selection
- "Last 7 Days", "Last 30 Days", "Last 90 Days" all show identical empty results

### Frontend Filter Code (Working Correctly)
**Location**: `/home/user/junit_test_results/client/src/views/Performance.vue` lines 13, 271-289

Frontend implementation is correct:
```typescript
<select id="days" v-model="filters.days" @change="loadData">
    <option :value="7">Last 7 Days</option>
    <option :value="14">Last 14 Days</option>
    <option :value="30">Last 30 Days</option>
    <option :value="60">Last 60 Days</option>
    <option :value="90">Last 90 Days</option>
</select>

const loadData = async () => {
    const slowestResponse = await apiClient.getSlowestTests({
        limit: filters.value.limit,
        days: filters.value.days,  // ← Correctly passed
    })
    slowestTests.value = slowestResponse.slowest_tests  // ← Empty array
}
```

The frontend correctly passes the `days` parameter, but the backend never uses it effectively.

---

## SCHEMA FIELD REFERENCE CHART

| Component | Expected Field | Actual Field | Status |
|-----------|---|---|---|
| TestRun model | `timestamp` | `timestamp` (explicit line 10) | ✓ Correct |
| TestCase model | `timestamp` | `created_at` (via timestamps option) | ✗ MISMATCH |
| /trends endpoint | uses `timestamp` | should use `created_at` | ✗ BROKEN |
| /slowest endpoint | uses `timestamp` | should use `created_at` | ✗ BROKEN |
| /regressions endpoint | uses `timestamp` | should use `created_at` | ✗ BROKEN |
| stats.js (reference) | uses `created_at` | actual field | ✓ Correct |

---

## COMPLETE LIST OF FIXES REQUIRED

### Fix #1: Replace Field Name Throughout Performance Routes
**File**: `/home/user/junit_test_results/backend/src/routes/performance.js`

**Line 19**: Change `timestamp` to `created_at`
```javascript
// BEFORE
timestamp: { $gte: cutoffDate },

// AFTER  
created_at: { $gte: cutoffDate },
```

**Line 52**: Change field reference in dateToString
```javascript
// BEFORE
period: { $dateToString: { format: dateFormat, date: '$timestamp' } },

// AFTER
period: { $dateToString: { format: dateFormat, date: '$created_at' } },
```

**Line 114**: Change `timestamp` to `created_at`
```javascript
// BEFORE
timestamp: { $gte: cutoffDate },

// AFTER
created_at: { $gte: cutoffDate },
```

**Line 129**: Change `timestamp` to `created_at`
```javascript
// BEFORE
latest_run: { $max: '$timestamp' }

// AFTER
latest_run: { $max: '$created_at' }
```

**Lines 179-180**: Change `timestamp` to `created_at` (2 occurrences)
```javascript
// BEFORE
timestamp: { $gte: baselineDate },

// AFTER
created_at: { $gte: baselineDate },
```

**Lines 191, 196**: Change field references in conditional logic
```javascript
// BEFORE
$cond: [{ $gte: ['$timestamp', cutoffDate] }, '$time', '$$REMOVE']
$cond: [{ $lt: ['$timestamp', cutoffDate] }, '$time', '$$REMOVE']

// AFTER
$cond: [{ $gte: ['$created_at', cutoffDate] }, '$time', '$$REMOVE']
$cond: [{ $lt: ['$created_at', cutoffDate] }, '$time', '$$REMOVE']
```

### Fix #2: Replace Invalid MongoDB Operators
**Issue**: `$median` and `$percentile` operators may not exist or may not work as expected

**Options**:
**Option A (Minimal Change)**: Use approximate percentile with $bucketAuto
```javascript
// For p50 (median)
p50_time: { $avg: '$time' }  // Use average as approximation

// For p95
p95_time: { $min: '$time' }  // Temporary placeholder
```

**Option B (Recommended)**: Remove percentile calculations from aggregation, calculate in application code:
```javascript
// In aggregation, collect all times:
all_times: { $push: '$time' }

// Then in Node.js code:
p95_time: calculatePercentile(all_times, 0.95)
```

**Option C (Best Practice)**: Use MongoDB 7.0+ operators properly
```javascript
p50_time: { $median: { input: '$time' } },  // Remove method parameter
p95_time: { $percentile: { input: '$time', p: [0.95] } },
```

### Fix #3: Add Null Safety to Frontend formatDuration
**File**: `/home/user/junit_test_results/client/src/views/Performance.vue` lines 244-254

```typescript
// BEFORE
const formatDuration = (seconds: number): string => {
  if (seconds < 1) {
    return `${(seconds * 1000).toFixed(0)}ms`
  }
  // ...
}

// AFTER
const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds == null || isNaN(seconds)) {
    return 'N/A'
  }
  if (seconds < 1) {
    return `${(seconds * 1000).toFixed(0)}ms`
  }
  // ...
}
```

### Fix #4: Add Null Safety to Frontend formatDate
**File**: `/home/user/junit_test_results/client/src/views/Performance.vue` lines 256-263

```typescript
// BEFORE
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// AFTER
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid Date'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
```

---

## PRIORITY IMPLEMENTATION ORDER

1. **CRITICAL** - Fix #1: Replace all `timestamp` → `created_at` (Fixes all 3 issues)
2. **HIGH** - Fix #2: Replace/fix MongoDB operators (Fixes NaN values)
3. **MEDIUM** - Fix #3 & #4: Add null safety (Defensive programming)

---

## TESTING RECOMMENDATIONS

After applying fixes:

1. **Test Data Verification**:
   - Query TestCase collection directly to verify `created_at` field exists
   - Sample: `db.testcases.findOne({}, { created_at: 1 })`

2. **Test Each Endpoint**:
   ```bash
   # Test slowest endpoint
   curl "http://localhost:3000/api/v1/performance/slowest?days=7&limit=10"
   
   # Should return data instead of empty array
   # Should have avg_time, max_time, min_time values (not null)
   ```

3. **Test Frontend Filters**:
   - Change "Time Range" filter
   - Verify data updates with different day ranges
   - Verify result counts change

4. **Test Regression Detection**:
   - Create test data with clear performance degradation
   - Filter should detect regressions
   - Results should vary with threshold changes

---

## SUMMARY TABLE: Impact Analysis

| Issue | Severity | Affected Features | Root Cause | Fix Complexity |
|-------|----------|---|---|---|
| NaN Values | CRITICAL | Slowest Tests, Regressions, Trends tabs | Invalid field + operators | Medium |
| No Regressions | CRITICAL | Regression Detection | Empty results from wrong field | Low |
| Filters Broken | CRITICAL | Date Range, Threshold selectors | Wrong field name | Low |

**Total Code Changes Required**: ~15 lines (mostly field name replacements)
