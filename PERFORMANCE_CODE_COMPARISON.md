# PERFORMANCE PAGE - DETAILED CODE COMPARISON & FIXES

## QUICK REFERENCE: All Lines Needing Changes

### Backend File: `/backend/src/routes/performance.js`

| Line(s) | Current Code                            | Issue                                | Fix                                  |
| ------- | --------------------------------------- | ------------------------------------ | ------------------------------------ |
| 19      | `timestamp: { $gte: cutoffDate }`       | Wrong field name                     | `created_at: { $gte: cutoffDate }`   |
| 52      | `date: '$timestamp'`                    | Wrong field reference                | `date: '$created_at'`                |
| 59-60   | `$median` and `$percentile` with method | May not work in all MongoDB versions | Replace with `$avg` or proper syntax |
| 79-80   | `$arrayElemAt: ['$p50_time', 0]`        | Assumes array return                 | Fix based on operator output         |
| 114     | `timestamp: { $gte: cutoffDate }`       | Wrong field name                     | `created_at: { $gte: cutoffDate }`   |
| 127     | `$percentile` operator                  | May not work in all MongoDB versions | Replace with `$avg` or proper syntax |
| 129     | `'$timestamp'` in $max                  | Wrong field                          | `'$created_at'`                      |
| 140     | `$arrayElemAt: ['$p95_time', 0]`        | Assumes array return                 | Fix based on operator output         |
| 179     | `timestamp: { $gte: baselineDate }`     | Wrong field name                     | `created_at: { $gte: baselineDate }` |
| 191     | `'$timestamp'` in $cond                 | Wrong field                          | `'$created_at'`                      |
| 196     | `'$timestamp'` in $cond                 | Wrong field                          | `'$created_at'`                      |

### Frontend File: `/client/src/views/Performance.vue`

| Line(s) | Current Code              | Issue                    | Fix                     |
| ------- | ------------------------- | ------------------------ | ----------------------- |
| 244-254 | `formatDuration` function | No null/NaN checks       | Add validation at start |
| 256-263 | `formatDate` function     | No null/undefined checks | Add validation at start |

---

## DETAILED COMPARISON: SIDE-BY-SIDE CODE

### Issue #1: Field Name Mismatch - /trends Endpoint

**CURRENT CODE (BROKEN)**:

```javascript
// Line 19 - WRONG FIELD
let matchCondition = {
    timestamp: { $gte: cutoffDate },  // ← Field doesn't exist in TestCase
    time: { $exists: true, $ne: null }
};

// Line 52 - WRONG FIELD REFERENCE
{
    $group: {
        _id: {
            period: { $dateToString: { format: dateFormat, date: '$timestamp' } },  // ← Wrong
            // ...
        },
        // ...
    }
},
```

**CORRECTED CODE**:

```javascript
// Line 19 - CORRECT FIELD
let matchCondition = {
    created_at: { $gte: cutoffDate },  // ✓ Matches TestCase schema
    time: { $exists: true, $ne: null }
};

// Line 52 - CORRECT FIELD REFERENCE
{
    $group: {
        _id: {
            period: { $dateToString: { format: dateFormat, date: '$created_at' } },  // ✓ Correct
            // ...
        },
        // ...
    }
},
```

---

### Issue #2: Field Name Mismatch - /slowest Endpoint

**CURRENT CODE (BROKEN)**:

```javascript
// Line 114 - WRONG FIELD
const slowestTests = await TestCase.aggregate([
    {
        $match: {
            timestamp: { $gte: cutoffDate }, // ← Doesn't exist
            time: { $gt: parseFloat(threshold) }
        }
    },
    {
        $group: {
            _id: {
                test_name: '$name',
                class_name: '$classname'
            },
            // ...
            latest_run: { $max: '$timestamp' } // ← Line 129, wrong field
        }
    }
    // ...
]);
```

**CORRECTED CODE**:

```javascript
// Line 114 - CORRECT FIELD
const slowestTests = await TestCase.aggregate([
    {
        $match: {
            created_at: { $gte: cutoffDate }, // ✓ Correct field
            time: { $gt: parseFloat(threshold) }
        }
    },
    {
        $group: {
            _id: {
                test_name: '$name',
                class_name: '$classname'
            },
            // ...
            latest_run: { $max: '$created_at' } // ✓ Line 129, correct field
        }
    }
    // ...
]);
```

---

### Issue #3: Invalid MongoDB Operators - /trends Endpoint

**CURRENT CODE (PROBLEMATIC)**:

```javascript
// Lines 59-60 - Operators may not exist or have wrong output format
{
    $group: {
        _id: { /* ... */ },
        avg_time: { $avg: '$time' },           // ✓ Works
        min_time: { $min: '$time' },           // ✓ Works
        max_time: { $max: '$time' },           // ✓ Works
        p50_time: { $median: { input: '$time', method: 'approximate' } },     // ✗ MongoDB 7.0+
        p95_time: { $percentile: { input: '$time', p: [0.95], method: 'approximate' } },  // ✗ MongoDB 7.0+
        // ...
    }
},
{
    $project: {
        _id: 0,
        period: '$_id.period',
        avg_time: { $round: ['$avg_time', 3] },
        min_time: { $round: ['$min_time', 3] },
        max_time: { $round: ['$max_time', 3] },
        p50_time: { $round: [{ $arrayElemAt: ['$p50_time', 0] }, 3] },  // ← Assumes array
        p95_time: { $round: [{ $arrayElemAt: ['$p95_time', 0] }, 3] },  // ← Assumes array
        // ...
    }
}
```

**OPTION A: Use Averages Instead (Simple Fix)**:

```javascript
// Lines 59-60 - Simpler operators that always work
{
    $group: {
        _id: { /* ... */ },
        avg_time: { $avg: '$time' },        // ✓ Existing
        min_time: { $min: '$time' },        // ✓ Existing
        max_time: { $max: '$time' },        // ✓ Existing
        p50_time: { $avg: '$time' },        // ✓ Replace median with average
        p95_time: { $max: '$time' },        // ✓ Replace percentile with max
        // ...
    }
},
{
    $project: {
        _id: 0,
        period: '$_id.period',
        avg_time: { $round: ['$avg_time', 3] },
        min_time: { $round: ['$min_time', 3] },
        max_time: { $round: ['$max_time', 3] },
        p50_time: { $round: ['$p50_time', 3] },    // ✓ No array extraction needed
        p95_time: { $round: ['$p95_time', 3] },    // ✓ No array extraction needed
        // ...
    }
}
```

**OPTION B: Use Proper MongoDB 7.0+ Syntax (Best)**:

```javascript
// Lines 59-60 - Correct syntax for MongoDB 7.0+
{
    $group: {
        _id: { /* ... */ },
        avg_time: { $avg: '$time' },
        min_time: { $min: '$time' },
        max_time: { $max: '$time' },
        p50_time: { $median: { input: '$time' } },           // ✓ No method parameter
        p95_time: { $percentile: { input: '$time', p: [0.95] } },  // ✓ No method parameter
        // ...
    }
},
{
    $project: {
        _id: 0,
        period: '$_id.period',
        avg_time: { $round: ['$avg_time', 3] },
        min_time: { $round: ['$min_time', 3] },
        max_time: { $round: ['$max_time', 3] },
        p50_time: { $round: [{ $arrayElemAt: ['$p50_time', 0] }, 3] },  // ✓ Works with new syntax
        p95_time: { $round: [{ $arrayElemAt: ['$p95_time', 0] }, 3] },  // ✓ Works with new syntax
        // ...
    }
}
```

---

### Issue #4: Field Name Mismatch - /regressions Endpoint

**CURRENT CODE (BROKEN)**:

```javascript
// Line 179 - WRONG FIELD
const allTests = await TestCase.aggregate([
    {
        $match: {
            timestamp: { $gte: baselineDate }, // ← Doesn't exist
            time: { $exists: true, $ne: null, $gt: 0.1 }
        }
    },
    {
        $group: {
            _id: {
                test_name: '$name',
                class_name: '$classname'
            },
            recent_times: {
                $push: {
                    $cond: [{ $gte: ['$timestamp', cutoffDate] }, '$time', '$$REMOVE'] // ← Lines 191, wrong field
                }
            },
            baseline_times: {
                $push: {
                    $cond: [{ $lt: ['$timestamp', cutoffDate] }, '$time', '$$REMOVE'] // ← Line 196, wrong field
                }
            }
        }
    }
    // ...
]);
```

**CORRECTED CODE**:

```javascript
// Line 179 - CORRECT FIELD
const allTests = await TestCase.aggregate([
    {
        $match: {
            created_at: { $gte: baselineDate }, // ✓ Correct field
            time: { $exists: true, $ne: null, $gt: 0.1 }
        }
    },
    {
        $group: {
            _id: {
                test_name: '$name',
                class_name: '$classname'
            },
            recent_times: {
                $push: {
                    $cond: [{ $gte: ['$created_at', cutoffDate] }, '$time', '$$REMOVE'] // ✓ Lines 191, correct
                }
            },
            baseline_times: {
                $push: {
                    $cond: [{ $lt: ['$created_at', cutoffDate] }, '$time', '$$REMOVE'] // ✓ Line 196, correct
                }
            }
        }
    }
    // ...
]);
```

---

### Issue #5: Missing Null Safety - Frontend formatDuration

**CURRENT CODE (CRASHES ON NULL)**:

```typescript
const formatDuration = (seconds: number): string => {
    if (seconds < 1) {
        return `${(seconds * 1000).toFixed(0)}ms`;
    }
    if (seconds < 60) {
        return `${seconds.toFixed(2)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
};

// When called with null/NaN:
// formatDuration(null) → "NaNm NaNs" ✗
// formatDuration(NaN) → "NaNm NaNs" ✗
// formatDuration(undefined) → "NaNm NaNs" ✗
```

**CORRECTED CODE**:

```typescript
const formatDuration = (seconds: number | null | undefined): string => {
    if (seconds == null || isNaN(seconds)) {
        // ✓ Check for null, undefined, NaN
        return 'N/A';
    }
    if (seconds < 1) {
        return `${(seconds * 1000).toFixed(0)}ms`;
    }
    if (seconds < 60) {
        return `${seconds.toFixed(2)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
};

// Now safe:
// formatDuration(null) → "N/A" ✓
// formatDuration(NaN) → "N/A" ✓
// formatDuration(undefined) → "N/A" ✓
// formatDuration(0.5) → "500ms" ✓
// formatDuration(120.5) → "2m 0s" ✓
```

---

### Issue #6: Missing Null Safety - Frontend formatDate

**CURRENT CODE (CRASHES ON NULL)**:

```typescript
const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

// When called with null/undefined:
// formatDate(null) → "Invalid Date" ✗
// formatDate(undefined) → "Invalid Date" ✗
```

**CORRECTED CODE**:

```typescript
const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) {
        // ✓ Check for null, undefined, empty string
        return 'N/A';
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        // ✓ Check for invalid date
        return 'Invalid Date';
    }
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

// Now safe:
// formatDate(null) → "N/A" ✓
// formatDate(undefined) → "N/A" ✓
// formatDate('') → "N/A" ✓
// formatDate('2024-01-15') → "Jan 15, 2024" ✓
// formatDate('invalid') → "Invalid Date" ✓
```

---

## DATABASE SCHEMA COMPARISON

### TestCase Schema (CURRENT - WRONG)

```javascript
// /backend/src/models/TestCase.js

const testCaseSchema = new mongoose.Schema(
    {
        suite_id: {
            /* ... */
        },
        run_id: {
            /* ... */
        },
        name: {
            /* ... */
        },
        classname: String,
        time: { type: Number, default: 0 },
        status: {
            /* ... */
        }
        // ... other fields ...
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } // ← Creates created_at, NOT timestamp
    }
);
```

**What Mongoose creates**:

```javascript
// Actual document structure:
{
    _id: ObjectId("..."),
    suite_id: ObjectId("..."),
    run_id: ObjectId("..."),
    name: "testName",
    classname: "com.example.TestClass",
    time: 1.234,
    status: "passed",
    created_at: ISODate("2024-01-15T10:30:00Z"),  // ← THIS FIELD EXISTS
    updated_at: ISODate("2024-01-15T10:30:00Z"),  // ← THIS FIELD EXISTS
    timestamp: undefined  // ← THIS DOES NOT EXIST ✗
}
```

### TestRun Schema (CURRENT - CORRECT)

```javascript
// /backend/src/models/TestRun.js

const testRunSchema = new mongoose.Schema(
    {
        // ...
        timestamp: {
            type: Date,
            required: true,
            default: Date.now,
            index: true
        }
        // ...
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    }
);
```

**What Mongoose creates**:

```javascript
// Actual document structure:
{
    _id: ObjectId("..."),
    name: "test-run-1",
    timestamp: ISODate("2024-01-15T10:30:00Z"),  // ← EXPLICIT FIELD EXISTS ✓
    created_at: ISODate("2024-01-15T10:30:00Z"),
    updated_at: ISODate("2024-01-15T10:30:00Z"),
    // ... other fields ...
}
```

---

## WORKING vs BROKEN ENDPOINT COMPARISON

### Working Example: stats.js

```javascript
// /backend/src/routes/stats.js - Lines 18-25 (WORKING)

if (req.query.from_date) {
    query.created_at = { $gte: new Date(req.query.from_date) }; // ✓ CORRECT FIELD
    runQuery.created_at = { $gte: new Date(req.query.from_date) }; // ✓ CORRECT FIELD
}
if (req.query.to_date) {
    query.created_at = { ...query.created_at, $lte: new Date(req.query.to_date) };
    runQuery.created_at = { ...runQuery.created_at, $lte: new Date(req.query.to_date) };
}
```

### Broken Example: performance.js

```javascript
// /backend/src/routes/performance.js - Line 19 (BROKEN)

let matchCondition = {
    timestamp: { $gte: cutoffDate }, // ✗ WRONG FIELD - doesn't exist
    time: { $exists: true, $ne: null }
};
```

---

## IMPACT VISUALIZATION

### When Field Name is Wrong

```
Database Documents:
[
    { _id: 1, name: "test1", time: 1.5, created_at: 2024-01-15 },
    { _id: 2, name: "test2", time: 2.3, created_at: 2024-01-14 },
    { _id: 3, name: "test3", time: 0.8, created_at: 2024-01-13 }
]

Query: $match: { timestamp: { $gte: "2024-01-14" } }
Result: [] (EMPTY - field doesn't exist)

Aggregation continues with 0 documents:
- $group: [ ] → []
- $avg of empty → null
- $round(null) → null
- Frontend receives null
- formatDuration(null) → "NaN"
- Display: "NaNm NaNs" ✗
```

### When Field Name is Correct

```
Database Documents:
[
    { _id: 1, name: "test1", time: 1.5, created_at: 2024-01-15 },
    { _id: 2, name: "test2", time: 2.3, created_at: 2024-01-14 },
    { _id: 3, name: "test3", time: 0.8, created_at: 2024-01-13 }
]

Query: $match: { created_at: { $gte: "2024-01-14" } }
Result: [
    { _id: 1, name: "test1", time: 1.5, created_at: 2024-01-15 },
    { _id: 2, name: "test2", time: 2.3, created_at: 2024-01-14 }
]

Aggregation with 2 documents:
- $group: avg_time = (1.5 + 2.3) / 2 = 1.9
- $round(1.9, 3) → 1.9
- Frontend receives 1.9
- formatDuration(1.9) → "1.90s"
- Display: "1.90s" ✓
```
