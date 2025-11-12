# Test Results Viewer

A modern, comprehensive web application for viewing, analyzing, and managing test results with advanced analytics, built with Vue 3 and MongoDB.

## Features

### Core Features

- 📊 **Interactive Dashboard** - Modern SPA with real-time data visualization using Chart.js
- 🔄 **CI/CD Integration** - Direct API access from Jenkins, GitHub Actions, and other CI/CD tools
- 📈 **Real Trend Analysis** - Track test success rates and execution times with historical data
- 🔍 **Advanced Filtering** - Search and filter tests by status, name, date, and more
- 📁 **Batch Upload** - Upload multiple JUnit XML files at once
- 🗄️ **MongoDB Backend** - Scalable database for storing test history
- 🌓 **Dark Mode** - Beautiful dark theme with persistent user preferences
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices

### Advanced Analytics (Tier 1)

- 🎯 **Flaky Test Detection** - Automatic identification and tracking of flaky tests with detailed statistics
- 📜 **Test Execution History** - Complete timeline of test runs with interactive charts
- 🔔 **Failure Pattern Analysis** - Automatic grouping and detection of common failure patterns
- ⚡ **Performance Tracking** - Monitor test execution times and detect regressions
- 📉 **Actionable Insights** - Real-time alerts for new failures and test issues
- 🎨 **Visual Indicators** - Inline flakiness badges, trend sparklines, and severity alerts
- 📊 **Test Details Modal** - Comprehensive drill-down view with history and analytics

## Architecture

### System Overview

```
┌─────────────────────────┐
│   CI/CD Pipelines       │
│  (Jenkins/GitHub/etc)   │
└───────────┬─────────────┘
            │ POST /api/v1/upload
            ▼
┌─────────────────────────┐
│  Backend API Server     │
│  (Node.js + Express)    │
│  Port: 5000             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  MongoDB Database       │
│  (Test Results Storage) │
└─────────────────────────┘
            ▲
            │ REST API
┌───────────┴─────────────┐
│  Vue 3 Frontend (SPA)   │
│  (Vite + TypeScript)    │
│  Port: 80 (Nginx)       │
└─────────────────────────┘
```

### Application Architecture

The application is built as a modern Single Page Application (SPA) with Vue 3:

```
App (Vue 3 SPA)
├── AppLayout (Navigation + Theme)
└── Vue Router
    ├── Dashboard (/)
    │   ├── Stats Cards
    │   ├── Trend Charts
    │   ├── Flaky Tests Widget
    │   └── Failure Patterns Summary
    │
    ├── Test Runs (/runs)
    │   ├── Data Table (sortable, filterable)
    │   └── Test Details Modal
    │
    ├── Test Cases (/cases)
    │   ├── Data Table (with flakiness indicators)
    │   └── Test Details Modal
    │
    └── Upload (/upload)
        └── Drag & Drop Upload
```

**Key Improvements over Vanilla JS:**
- Single-page application with proper routing (back button works!)
- Modal-driven drill-down (no context loss)
- Centralized state management with Pinia
- Reusable, tested components
- Progressive disclosure (overview → detail → deep-dive)

## Quick Start

### Prerequisites

- Ubuntu 24.04 (or similar Linux distribution)
- Node.js 20 LTS
- MongoDB 7.0
- Root or sudo access
- Internet connection

### Installation

#### 1. Install Dependencies

```bash
# Install MongoDB 7.0
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 and Nginx
sudo npm install -g pm2
sudo apt install -y nginx
```

#### 2. Set Up Backend

```bash
cd backend
npm install
cp .env.example .env

# Configure MongoDB URI in .env
nano .env

# Start backend with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 3. Set Up Frontend

```bash
cd client
npm install

# Build for production
npm run build

# Built files are in client/dist/
```

#### 4. Configure Nginx

```bash
# Copy the built files to nginx directory
sudo mkdir -p /var/www/test-results-viewer
sudo cp -r client/dist/* /var/www/test-results-viewer/

# Configure nginx (see nginx.conf for reference)
sudo systemctl restart nginx
```

## Usage

### Web Dashboard

1. Open browser and navigate to: `http://YOUR_SERVER_IP`
2. Upload JUnit XML files via drag-and-drop on the Upload page
3. View test results, trends, and statistics on the Dashboard
4. Explore test runs and cases with filtering and search
5. Click any test to see detailed history and analytics

### CI/CD Integration

#### Jenkins Pipeline

```groovy
stage('Upload Test Results') {
    steps {
        sh '''
            find . -name "*.xml" -path "*/target/surefire-reports/*" | while read xmlfile; do
                curl -X POST http://your-server:5000/api/v1/upload \
                    -F "file=@$xmlfile" \
                    -F 'ci_metadata={"provider":"jenkins","build_id":"'$BUILD_ID'"}'
            done
        '''
    }
}
```

See [ci-cd-examples/Jenkinsfile](ci-cd-examples/Jenkinsfile) for complete example.

#### GitHub Actions

```yaml
- name: Upload test results
  run: |
      curl -X POST ${{ secrets.JUNIT_API_URL }}/api/v1/upload \
        -F "file=@test-results.xml" \
        -F 'ci_metadata={"provider":"github_actions","build_id":"${{ github.run_id }}"}'
```

See [ci-cd-examples/github-actions.yml](ci-cd-examples/github-actions.yml) for complete workflow.

#### Manual Upload Script

```bash
# Upload all XML files from a directory
JUNIT_API_URL=http://your-server:5000 ./ci-cd-examples/upload-test-results.sh ./test-results
```

### API Endpoints

#### Core Endpoints
```
POST   /api/v1/upload              - Upload JUnit XML file
POST   /api/v1/upload/batch        - Upload multiple files
GET    /api/v1/runs                - Get test runs (paginated)
GET    /api/v1/runs/:id            - Get specific test run
DELETE /api/v1/runs/:id            - Delete test run
GET    /health                     - Health check
```

#### Test Case Endpoints
```
GET    /api/v1/cases               - Get test cases (filtered)
GET    /api/v1/cases/:id           - Get test case details
GET    /api/v1/cases/:id/history   - Get test execution history
GET    /api/v1/cases/:id/flakiness - Get flakiness metrics
GET    /api/v1/cases/:id/trends    - Get performance trends
```

#### Statistics & Analytics
```
GET    /api/v1/stats/overview      - Get overall statistics
GET    /api/v1/stats/trends        - Get test trends
GET    /api/v1/analytics/failure-patterns  - Get failure pattern analysis
GET    /api/v1/analytics/insights  - Get actionable insights
GET    /api/v1/analytics/flaky-tests - Get flaky tests with metrics
```

## Project Structure

```
.
├── backend/                         # Backend API server
│   ├── src/
│   │   ├── config/                 # Database configuration
│   │   ├── models/                 # Mongoose schemas
│   │   ├── routes/                 # API endpoints
│   │   │   ├── analytics.js        # Analytics endpoints (Tier 1)
│   │   │   ├── cases.js            # Enhanced with flakiness & trends
│   │   │   ├── runs.js             # Test run endpoints
│   │   │   └── upload.js           # File upload endpoints
│   │   ├── services/               # Business logic
│   │   ├── middleware/             # Express middleware
│   │   ├── utils/                  # Utilities
│   │   └── server.js               # Main server file
│   ├── .env.example                # Environment template
│   ├── ecosystem.config.js         # PM2 configuration
│   └── package.json
│
├── client/                         # Vue 3 Frontend (SPA)
│   ├── src/
│   │   ├── components/
│   │   │   ├── analytics/          # Analytics widgets
│   │   │   │   ├── FailurePatternsSummary.vue
│   │   │   │   └── __tests__/
│   │   │   ├── charts/             # Chart components
│   │   │   │   ├── BarChart.vue
│   │   │   │   ├── HistoryChart.vue
│   │   │   │   ├── LineChart.vue
│   │   │   │   ├── PieChart.vue
│   │   │   │   └── __tests__/
│   │   │   ├── layout/
│   │   │   │   └── AppLayout.vue   # Main layout with nav
│   │   │   ├── modals/
│   │   │   │   ├── TestDetailsModal.vue  # Centerpiece modal
│   │   │   │   └── __tests__/
│   │   │   ├── shared/             # Reusable components
│   │   │   │   ├── Button.vue
│   │   │   │   ├── Card.vue
│   │   │   │   ├── DataTable.vue
│   │   │   │   ├── ErrorStackTrace.vue
│   │   │   │   ├── FlakinessIndicator.vue
│   │   │   │   ├── Modal.vue
│   │   │   │   ├── SearchInput.vue
│   │   │   │   └── __tests__/
│   │   │   └── widgets/
│   │   │       ├── FlakyTestsWidget.vue
│   │   │       └── __tests__/
│   │   ├── views/
│   │   │   ├── Dashboard.vue       # Main dashboard
│   │   │   ├── TestCases.vue       # Test cases view
│   │   │   ├── TestRuns.vue        # Test runs view
│   │   │   └── Upload.vue          # Upload view
│   │   ├── api/
│   │   │   └── client.ts           # API client with TypeScript
│   │   ├── stores/
│   │   │   └── testData.ts         # Pinia store
│   │   ├── composables/
│   │   │   └── useTheme.ts         # Theme composable
│   │   ├── utils/
│   │   │   └── formatters.ts       # Utility functions
│   │   ├── router/
│   │   │   └── index.ts            # Vue Router config
│   │   ├── App.vue                 # Root component
│   │   └── main.ts                 # Application entry
│   ├── dist/                       # Built files (production)
│   ├── coverage/                   # Test coverage reports
│   ├── vite.config.ts              # Vite configuration
│   ├── tsconfig.json               # TypeScript config
│   └── package.json
│
├── public/                         # Nginx served files (built Vue app)
│   ├── index.html
│   └── assets/
│
├── ci-cd-examples/                 # CI/CD integration examples
│   ├── Jenkinsfile                 # Jenkins pipeline
│   ├── github-actions.yml          # GitHub Actions workflow
│   └── upload-test-results.sh     # Bash upload script
│
├── docs/                           # Additional documentation
├── scripts/                        # Utility scripts
├── resources/                      # Project resources
│
├── VUE3_MIGRATION_GUIDE.md         # Detailed migration documentation
├── client/TIER1_ARCHITECTURE.md    # Tier 1 architecture guide
└── README.md                       # This file
```

## Development

### Frontend Development

```bash
cd client

# Install dependencies
npm install

# Run dev server with hot reload
npm run dev

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Type check
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend Development

```bash
cd backend

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Start with PM2
pm2 start ecosystem.config.js
```

## Configuration

### Backend (.env)

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://user:pass@localhost:27017/junit_test_results
ALLOWED_ORIGINS=http://localhost:5173,http://your-domain.com
MAX_FILE_SIZE=52428800  # 50MB
```

### Frontend (Environment Variables)

The frontend automatically detects the API URL. For custom configuration, update `client/src/api/client.ts`.

## Testing

### Frontend Tests

- **Unit Tests**: Tests for utilities, formatters, and API client
- **Component Tests**: Tests for all Vue components
- **Test Coverage**: Comprehensive coverage tracked with Vitest
- **Test Files**: Located in `__tests__` directories next to components

```bash
cd client
npm run test              # Run tests
npm run test:coverage     # Run with coverage
```

### Test-Driven Development

This project was built using TDD methodology:
1. Write test for new feature
2. Implement feature to pass test
3. Refactor while keeping tests green
4. Comprehensive test suite ensures reliability

## Monitoring

### View Logs

```bash
# Backend logs
pm2 logs junit-dashboard-api

# MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
```

### Check Status

```bash
# Check all services
sudo systemctl status mongod nginx
pm2 status
```

## Technology Stack

### Frontend

- **Vue 3** - Progressive JavaScript framework (Composition API)
- **TypeScript** - Type safety and better DX
- **Vite** - Fast build tool and dev server
- **Vue Router** - Official routing solution
- **Pinia** - State management
- **Chart.js** - Interactive charts
- **Vitest** - Unit testing framework
- **Vue Test Utils** - Component testing utilities

### Backend

- **Node.js 20 LTS** - JavaScript runtime
- **Express.js 4.x** - Web framework
- **MongoDB 7.0** - Document database
- **Mongoose 8.x** - MongoDB ODM
- **PM2** - Process manager

### Infrastructure

- **Nginx** - Reverse proxy and static file server
- **Ubuntu 24.04 LTS** - Operating system

## Security

- MongoDB authentication enabled
- CORS protection with configurable origins
- Input validation and sanitization
- File upload size limits
- Secure session management
- Production-ready configuration

## Performance

- PM2 cluster mode (multi-core support)
- MongoDB indexes for fast queries
- Nginx compression and caching
- Vue 3 optimized rendering
- Lazy loading routes
- Code splitting with Vite
- Connection pooling
- Async operations

## Cloud Deployment

The application is designed for easy cloud deployment:

- **MongoDB**: Migrate to MongoDB Atlas
- **Backend**: Deploy to AWS, GCP, Azure, Heroku, or Railway
- **Frontend**: Build static files (`npm run build`) and deploy to:
  - Netlify
  - Vercel
  - GitHub Pages
  - AWS S3 + CloudFront
  - Any static file hosting

## Backup and Recovery

### Backup MongoDB

```bash
mongodump --uri="mongodb://user:pass@localhost:27017/junit_test_results" --out=./backup
```

### Restore MongoDB

```bash
mongorestore --uri="mongodb://user:pass@localhost:27017" ./backup
```

## Troubleshooting

### Backend won't start

```bash
# Check MongoDB is running
sudo systemctl status mongod

# Check backend logs
pm2 logs junit-dashboard-api

# Verify .env configuration
cat backend/.env
```

### Frontend build fails

```bash
# Clear node_modules and reinstall
cd client
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Cannot upload files

```bash
# Check file size limits
# Backend: MAX_FILE_SIZE in .env
# Nginx: client_max_body_size in nginx config

# Check upload directory permissions
ls -la /opt/junit-dashboard/uploads
```

### CORS errors

```bash
# Add your frontend URL to ALLOWED_ORIGINS in .env
# Example: ALLOWED_ORIGINS=http://localhost:5173,http://localhost
# Restart backend
pm2 restart junit-dashboard-api
```

## Documentation

- **[VUE3_MIGRATION_GUIDE.md](VUE3_MIGRATION_GUIDE.md)** - Complete Vue 3 migration journey
- **[client/TIER1_ARCHITECTURE.md](client/TIER1_ARCHITECTURE.md)** - Tier 1 features architecture
- **[backend/README.md](backend/README.md)** - Backend API documentation
- **Component Tests** - See `__tests__` directories in `client/src/components/`

## Contributing

This is a modern test results viewer built with Vue 3 and MongoDB. Feel free to customize for your needs.

## Changelog

### Version 3.0 - Vue 3 Migration with Tier 1 Analytics (Current)

- ✅ Complete migration to Vue 3 with Composition API
- ✅ TypeScript integration for type safety
- ✅ Modern build tooling with Vite
- ✅ Single-page application with Vue Router
- ✅ State management with Pinia
- ✅ Dark mode with persistent preferences
- ✅ Test-Driven Development (TDD) approach
- ✅ Comprehensive test suite with Vitest
- ✅ **Tier 1 Analytics:**
  - TestDetailsModal with execution history
  - FlakyTestsWidget with real-time detection
  - FailurePatternsSummary with AI-powered grouping
  - Enhanced backend analytics endpoints
  - Performance trend tracking
- ✅ Responsive, mobile-friendly design
- ✅ Modal-driven drill-down navigation
- ✅ Progressive disclosure architecture

### Version 2.0 - MongoDB Backend

- MongoDB backend implementation
- RESTful API with Express.js
- CI/CD integration (Jenkins, GitHub Actions)
- Production-ready deployment with PM2
- Nginx reverse proxy
- Flaky test detection
- Comprehensive documentation

### Version 1.0 - Original

- Client-side IndexedDB implementation
- Static file dashboard
- Manual file upload only

---

**Ready to get started?** Install the dependencies and start building with modern Vue 3!
