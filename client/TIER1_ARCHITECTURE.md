# Tier 1 Architecture: Core Analytics & Insights

## Design Philosophy

**Problem with Vanilla JS App:**
- 12+ separate HTML pages with redundant views
- Poor navigation (back button doesn't work, lost context)
- Same data displayed differently across pages
- No clear information hierarchy

**New Architecture:**
- Single-page application with 4 main routes
- Modal-driven drill-down for details
- Reusable components that adapt to context
- Progressive disclosure (overview → detail → deep-dive)

---

## Component Hierarchy

```
App
├── AppLayout (nav + theme)
└── Router
    ├── Dashboard (/)
    │   ├── StatsCards (existing)
    │   ├── TrendCharts (existing)
    │   ├── FlakyTestsWidget (NEW)
    │   └── InsightsPanel (NEW)
    │       └── FailurePatternsSummary
    │
    ├── TestRuns (/runs)
    │   ├── DataTable
    │   │   └── FailureGroupBadge (NEW - inline)
    │   └── TestDetailsModal (on row click)
    │
    ├── TestCases (/cases)
    │   ├── DataTable
    │   │   ├── FlakinessIndicator (NEW - inline)
    │   │   └── TrendSparkline (NEW - inline)
    │   └── TestDetailsModal (on row click)
    │
    └── Upload (/upload)
```

---

## New Components (Tier 1)

### 1. TestDetailsModal (CENTERPIECE)

**Purpose:** Single authoritative view for any test case
**Access:** Click any test from runs/cases/dashboard
**File:** `client/src/components/modals/TestDetailsModal.vue`

**Tabs:**
- **Overview:** Test name, status, duration, last run, suite/class
- **Failure Details:** Error message, stack trace (syntax highlighted), screenshots
- **History:** Chart showing pass/fail over last 30 runs, duration trend
- **Metadata:** CI info, environment, tags, parameters

**Key Features:**
- Flakiness score badge (0-100, color-coded)
- "Similar failures" link (groups by error type)
- Quick actions: Re-run, View in CI, Copy stack trace
- Navigation: Previous/Next test in current view

**Props:**
```typescript
interface TestDetailsModalProps {
  testId: string
  testName: string
  runId?: string // Optional context
  open: boolean
}
```

### 2. FlakinessIndicator

**Purpose:** Visual indicator of test stability
**Usage:** Inline in test cases table, detail modal
**File:** `client/src/components/shared/FlakinessIndicator.vue`

**Display:**
- Badge with flakiness score (e.g., "Flaky: 35%")
- Color: Green (<10%), Yellow (10-30%), Red (>30%)
- Tooltip: "Failed 7/20 recent runs"

**Props:**
```typescript
interface FlakinessIndicatorProps {
  passRate: number // 0-100
  recentRuns: number
  failureCount: number
  size?: 'sm' | 'md' | 'lg'
}
```

### 3. TrendSparkline

**Purpose:** Mini trend chart for inline display
**Usage:** Test cases table (duration/pass rate trend)
**File:** `client/src/components/charts/TrendSparkline.vue`

**Display:**
- Small line chart (50px × 20px)
- Shows last 10-20 data points
- Color-coded: Green (improving), Red (degrading), Gray (stable)
- Hover tooltip with values

**Props:**
```typescript
interface TrendSparklineProps {
  data: number[] // Array of values
  trend: 'up' | 'down' | 'stable'
  metric: 'duration' | 'pass_rate'
}
```

### 4. FailurePatternsSummary

**Purpose:** Group and display common failure types
**Usage:** Dashboard insights panel, test runs page
**File:** `client/src/components/analytics/FailurePatternsSummary.vue`

**Display:**
```
Common Failures (Last 7 Days)
┌─────────────────────────────────────────┐
│ NullPointerException         15 tests  │
│ Timeout (>30s)               8 tests   │
│ AssertionError: expected X   5 tests   │
└─────────────────────────────────────────┘
```
- Click pattern → Filter to affected tests
- Bar chart showing frequency over time

**Props:**
```typescript
interface FailurePattern {
  errorType: string
  errorMessage: string
  count: number
  affectedTests: string[]
  firstSeen: Date
}
```

### 5. ErrorStackTrace

**Purpose:** Formatted, syntax-highlighted stack trace
**Usage:** Test details modal
**File:** `client/src/components/shared/ErrorStackTrace.vue`

**Features:**
- Syntax highlighting (file paths, line numbers, methods)
- Collapsible frames (show top 5, expand for full)
- Click file:line to copy or open in IDE (if configured)
- Highlight user code vs. framework code

**Props:**
```typescript
interface ErrorStackTraceProps {
  stackTrace: string
  language?: 'java' | 'python' | 'javascript'
  collapsible?: boolean
}
```

### 6. FlakyTestsWidget

**Purpose:** Dashboard widget showing most problematic flaky tests
**Usage:** Dashboard only
**File:** `client/src/components/widgets/FlakyTestsWidget.vue`

**Display:**
```
⚠️ Top Flaky Tests
┌────────────────────────────────────────┐
│ UserLoginTest.testTimeout      45%    │
│ PaymentTest.processCard        38%    │
│ SearchTest.filterResults       22%    │
│                                        │
│ [View All Flaky Tests →]              │
└────────────────────────────────────────┘
```
- Shows top 5 by flakiness score
- Click test → Opens TestDetailsModal
- "View All" → Routes to `/cases?flaky=true`

---

## Enhanced Existing Components

### Dashboard Updates

**New Widgets:**
1. **Flaky Tests Widget** (top right)
2. **Insights Panel** (bottom, full width)
   - Failure patterns summary
   - "Tests getting slower" alert
   - "New failures" since last week

**Enhanced Charts:**
- Click trend chart data point → Filter runs from that time period
- Hover shows detailed breakdown

### TestCases Table Updates

**New Columns:**
- **Flakiness:** FlakinessIndicator badge
- **Trend:** TrendSparkline (duration or pass rate)
- **Last Changed:** Date + relative time

**New Filters:**
- ☑️ Show only flaky tests
- ☑️ Show only degrading tests (trend down)
- Status: Passed / Failed / Flaky

**Row Click:**
- Opens TestDetailsModal with full context

### TestRuns Table Updates

**Enhanced Display:**
- Group similar failures: "5 tests failed: NullPointerException"
- Click group → Expand to show affected tests
- Each test clickable → TestDetailsModal

---

## Data Flow & API Requirements

### New API Endpoints

```typescript
// Get test case history
GET /api/v1/cases/:testId/history
Response: {
  runs: Array<{
    run_id: string
    status: 'passed' | 'failed' | 'error' | 'skipped'
    duration: number
    timestamp: Date
    error_message?: string
  }>
}

// Get flakiness metrics
GET /api/v1/cases/:testId/flakiness
Response: {
  pass_rate: number // 0-100
  total_runs: number
  recent_failures: number
  last_status_change: Date
  flakiness_score: number // 0-100
}

// Get failure patterns
GET /api/v1/analytics/failure-patterns
Query: { days?: number, limit?: number }
Response: {
  patterns: Array<{
    error_type: string
    error_message: string
    count: number
    affected_tests: Array<{ test_id, test_name }>
    trend: 'increasing' | 'decreasing' | 'stable'
  }>
}

// Get test trends
GET /api/v1/cases/:testId/trends
Response: {
  duration: { data: number[], trend: 'up' | 'down' | 'stable' }
  pass_rate: { data: number[], trend: 'up' | 'down' | 'stable' }
}
```

### State Management (Pinia)

**New Store:** `analyticsStore.ts`
```typescript
{
  state: {
    failurePatterns: FailurePattern[]
    flakyTests: FlakyTest[]
    testHistory: Map<testId, HistoryData>
    insights: Insight[]
  },
  actions: {
    fetchFailurePatterns()
    fetchFlakyTests()
    fetchTestHistory(testId)
    analyzeInsights()
  }
}
```

---

## User Journeys

### Journey 1: "Why did my build fail?"

1. Land on Dashboard
2. See "5 tests failed" in latest run card
3. Click run → Navigate to `/runs` filtered to that run
4. See grouped failures: "3 tests: NullPointerException"
5. Click group → Expand to show 3 tests
6. Click first test → TestDetailsModal opens
7. View failure tab → See stack trace, error message
8. View history tab → See this test has been flaky (40% pass rate)
9. Navigate to next failing test without closing modal

### Journey 2: "Which tests are flaky?"

1. Dashboard → See "⚠️ Top Flaky Tests" widget
2. See "UserLoginTest.testTimeout - 45% flaky"
3. Click test → TestDetailsModal opens
4. View History tab → See chart showing intermittent failures
5. See metadata: "Started flaking after commit abc123"
6. Click "View All Flaky Tests"
7. Navigate to `/cases?flaky=true`
8. See full list with flakiness indicators
9. Sort by flakiness score (highest first)

### Journey 3: "Is this test getting slower?"

1. Navigate to `/cases`
2. See TrendSparkline in "Trend" column
3. Notice test "DataProcessingTest" has red downward trend
4. Hover sparkline → Tooltip: "Duration increased 40% over 10 runs"
5. Click test → TestDetailsModal
6. View History tab → See detailed duration chart
7. Identify spike after specific date

---

## Design Patterns

### 1. Consistent Modal Pattern

**All modals follow same structure:**
```vue
<Modal :open="isOpen" @close="handleClose" size="xl">
  <template #header>
    <h2>{{ title }}</h2>
    <Badge>{{ status }}</Badge>
  </template>

  <Tabs v-model="activeTab">
    <Tab name="overview">Overview</Tab>
    <Tab name="details">Details</Tab>
  </Tabs>

  <template #footer>
    <Button variant="secondary" @click="close">Close</Button>
    <Button @click="action">Primary Action</Button>
  </template>
</Modal>
```

### 2. Reusable Charts

**All charts use same wrapper:**
```vue
<ChartWrapper
  :loading="isLoading"
  :empty="!hasData"
  empty-message="No data available"
>
  <LineChart :data="chartData" />
</ChartWrapper>
```

### 3. Inline Indicators

**Visual consistency:**
- Badges for status/scores (rounded, color-coded)
- Sparklines for trends (small, unobtrusive)
- Icons for quick recognition (⚠️ flaky, 🔴 failed, ✅ passed)

---

## Implementation Plan

**Phase 1: Foundation (Day 1)**
1. Create TestDetailsModal shell with tabs
2. Add backend endpoints for test history
3. Wire up modal to open from test cases table

**Phase 2: Core Features (Day 2)**
4. Implement History tab with chart
5. Add Failure Details tab with stack trace
6. Build FlakinessIndicator component

**Phase 3: Analytics (Day 3)**
7. Implement failure pattern analysis backend
8. Create FailurePatternsSummary component
9. Add FlakyTestsWidget to dashboard

**Phase 4: Integration (Day 4)**
10. Add sparklines to test cases table
11. Integrate flakiness filters
12. Add insights panel to dashboard
13. Write tests for all components

---

## Success Metrics

**User Experience:**
- ✅ Access any test detail in ≤2 clicks
- ✅ Identify flaky tests in ≤5 seconds
- ✅ Understand failure patterns without scrolling

**Technical:**
- ✅ All new components have >80% test coverage
- ✅ No duplicate data fetching
- ✅ Modal load time <200ms
- ✅ Chart render time <100ms

**Navigation:**
- ✅ Back button works (URL state preserved)
- ✅ Deep linking works (`/cases?flaky=true`)
- ✅ No broken context switches
